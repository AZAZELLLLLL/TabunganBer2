import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";
import { db } from "./firebase";
import "./SavingsCalendar.css";

const DAYS_LABEL = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS_LABEL = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

// Format Date → "YYYY-MM-DD" string (local time, bukan UTC)
function toDateKey(date) {
  const d = date instanceof Date ? date : (date?.toDate ? date.toDate() : new Date(date));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function SavingsCalendar({ user, onNavigate }) {
  const today = new Date();
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  // Semua tanggal yang ada tabungan masuk → Set of "YYYY-MM-DD"
  const [savingDates, setSavingDates] = useState(new Set());

  // Semua hari libur → array of { id, dateKey, reason }
  const [holidays, setHolidays] = useState([]);
  const [groupDocId, setGroupDocId] = useState("");

  // Input form tambah hari libur
  const [holidayInput, setHolidayInput] = useState("");
  const [holidayReason, setHolidayReason] = useState("");
  const [addingHoliday, setAddingHoliday] = useState(false);

  // Detail popup saat klik tanggal
  const [selectedDay, setSelectedDay] = useState(null); // { dateKey, savingsOnDay, holidayOnDay }

  const groupId = user.groupId || "default";

  // ─── Fetch savings (real-time) ────────────────────────────
  useEffect(() => {
    const q = query(
      collection(db, "savings"),
      where("groupId", "==", groupId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const keys = new Set();
      snap.docs.forEach((d) => {
        const raw = d.data().date;
        if (raw) keys.add(toDateKey(raw));
      });
      setSavingDates(keys);
    });

    return () => unsub();
  }, [groupId]);

  // ─── Fetch holidays from group document (real-time) ───────
  useEffect(() => {
    const q = query(
      collection(db, "groups"),
      where("groupId", "==", groupId)
    );

    const unsub = onSnapshot(q, (snap) => {
      if (snap.empty) {
        setGroupDocId("");
        setHolidays([]);
        return;
      }

      const groupSnapshot = snap.docs[0];
      const groupData = groupSnapshot.data();
      const groupHolidays = Array.isArray(groupData.holidays)
        ? groupData.holidays
            .filter((holiday) => holiday?.dateKey)
            .map((holiday, index) => ({
              ...holiday,
              id: holiday.id || `${holiday.dateKey}-${index}`,
              reason: holiday.reason || "",
            }))
        : [];

      setGroupDocId(groupSnapshot.id);
      setHolidays(groupHolidays);
    });

    return () => unsub();
  }, [groupId]);

  // ─── Fetch savings detail untuk hari yang diklik ───────────
  const fetchDayDetail = async (dateKey) => {
    try {
      const q = query(
        collection(db, "savings"),
        where("groupId", "==", groupId)
      );
      const snap = await getDocs(q);
      const savingsOnDay = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((s) => s.date && toDateKey(s.date) === dateKey && s.role !== "deduction");

      const holidayOnDay = holidays.find((h) => h.dateKey === dateKey) || null;

      setSelectedDay({ dateKey, savingsOnDay, holidayOnDay });
    } catch (err) {
      console.error("fetchDayDetail error:", err);
    }
  };

  // ─── Tambah hari libur ──────────────────────────────────────
  const handleAddHoliday = async () => {
    if (!holidayInput) {
      alert("Pilih tanggal libur dulu!");
      return;
    }

    if (!groupDocId) {
      alert("Group pasangan belum siap. Coba cek pairing akun dulu ya.");
      return;
    }

    const existingHoliday = holidays.find((h) => h.dateKey === holidayInput);
    if (existingHoliday) {
      alert("Tanggal ini sudah ditandai libur!");
      return;
    }

    setAddingHoliday(true);
    try {
      const newHoliday = {
        id:
          typeof crypto !== "undefined" && crypto.randomUUID
            ? crypto.randomUUID()
            : `holiday-${Date.now()}`,
        dateKey: holidayInput,
        reason: holidayReason.trim() || "Libur menabung",
        createdAt: new Date(),
        createdBy: user.uid || "",
        createdByName: user.name || "",
      };

      const updatedHolidays = [...holidays, newHoliday].sort((a, b) =>
        a.dateKey.localeCompare(b.dateKey)
      );

      await updateDoc(doc(db, "groups", groupDocId), {
        holidays: updatedHolidays,
        updatedAt: new Date(),
      });

      setHolidayInput("");
      setHolidayReason("");
      alert("✅ Hari libur berhasil ditambahkan!");
    } catch (err) {
      console.error("addHoliday error:", err);
      alert("Gagal menambah hari libur: " + err.message);
    } finally {
      setAddingHoliday(false);
    }
  };

  // ─── Hapus hari libur ──────────────────────────────────────
  const handleDeleteHoliday = async (id) => {
    if (!window.confirm("Hapus hari libur ini?")) return;
    try {
      if (!groupDocId) {
        alert("Data group belum ditemukan. Coba refresh halaman dulu.");
        return;
      }

      await updateDoc(doc(db, "groups", groupDocId), {
        holidays: holidays.filter((holiday) => holiday.id !== id),
        updatedAt: new Date(),
      });

      // Tutup popup kalau yang dihapus adalah hari yang sedang dibuka
      if (selectedDay) {
        setSelectedDay((prev) =>
          prev ? { ...prev, holidayOnDay: null } : null
        );
      }
      alert("✅ Hari libur dihapus!");
    } catch (err) {
      console.error("deleteHoliday error:", err);
      alert("Gagal menghapus: " + err.message);
    }
  };

  // ─── Navigasi bulan ───────────────────────────────────────
  const goPrevMonth = () =>
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const goNextMonth = () =>
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  const goToday = () =>
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));

  // ─── Bangun grid kalender ─────────────────────────────────
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay(); // 0=Min
  const holidayKeys = new Set(holidays.map((h) => h.dateKey));

  // Buat array sel: null = sel kosong, number = tanggal
  const cells = [];
  for (let i = 0; i < firstDayOfWeek; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad baris terakhir supaya grid penuh (kelipatan 7)
  while (cells.length % 7 !== 0) cells.push(null);

  const todayKey = toDateKey(today);

  return (
    <div className="calendar-page">
      {/* ── BACK BUTTON ── */}
      <button className="cal-back-btn" onClick={() => onNavigate("menu")}>
        ← Kembali
      </button>

      {/* ── HEADER ── */}
      <div className="cal-header">
        <h1 className="cal-title">📅 Kalender Tabungan</h1>
        <p className="cal-subtitle">Pantau hari menabung dan hari libur</p>

        {/* Legenda */}
        <div className="cal-legend">
          <div className="legend-item">
            <span className="legend-dot green" />
            <span>Ada tabungan</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot red" />
            <span>Hari libur</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot today-dot" />
            <span>Hari ini</span>
          </div>
        </div>
      </div>

      {/* ── KALENDER ── */}
      <div className="cal-card">
        {/* Navigasi bulan */}
        <div className="cal-nav">
          <button className="cal-nav-btn" onClick={goPrevMonth}>‹</button>
          <div className="cal-nav-center">
            <span className="cal-month-label">
              {MONTHS_LABEL[month]} {year}
            </span>
            <button className="cal-today-btn" onClick={goToday}>Hari ini</button>
          </div>
          <button className="cal-nav-btn" onClick={goNextMonth}>›</button>
        </div>

        {/* Header hari */}
        <div className="cal-grid-header">
          {DAYS_LABEL.map((d) => (
            <div key={d} className="cal-day-name">{d}</div>
          ))}
        </div>

        {/* Grid tanggal */}
        <div className="cal-grid">
          {cells.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="cal-cell empty" />;
            }

            const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const hasSaving = savingDates.has(dateKey);
            const isHoliday = holidayKeys.has(dateKey);
            const isToday = dateKey === todayKey;
            const isSelected = selectedDay?.dateKey === dateKey;

            let cellClass = "cal-cell";
            if (isToday) cellClass += " is-today";
            if (isSelected) cellClass += " is-selected";

            return (
              <div
                key={dateKey}
                className={cellClass}
                onClick={() => fetchDayDetail(dateKey)}
              >
                {/* Indikator background — merah lebih prioritas */}
                {isHoliday && <span className="cal-indicator red-indicator" />}
                {hasSaving && !isHoliday && <span className="cal-indicator green-indicator" />}

                {/* Angka tanggal */}
                <span className="cal-date-num">{day}</span>

                {/* Dot kecil kalau ada keduanya */}
                {hasSaving && isHoliday && (
                  <span className="cal-dual-dot">
                    <span className="mini-dot green-dot" />
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Ringkasan bulan ini */}
        <div className="cal-summary">
          <div className="cal-summary-item">
            <span className="summary-dot green" />
            <span>
              {
                [...savingDates].filter((k) => {
                  const [y, m] = k.split("-");
                  return parseInt(y) === year && parseInt(m) === month + 1;
                }).length
              }{" "}
              hari menabung
            </span>
          </div>
          <div className="cal-summary-item">
            <span className="summary-dot red" />
            <span>
              {
                holidays.filter((h) => {
                  const [y, m] = h.dateKey.split("-");
                  return parseInt(y) === year && parseInt(m) === month + 1;
                }).length
              }{" "}
              hari libur
            </span>
          </div>
        </div>
      </div>

      {/* ── DETAIL POPUP saat klik tanggal ── */}
      {selectedDay && (
        <div className="cal-card detail-card">
          <div className="detail-header">
            <h3>
              📋 Detail{" "}
              {new Date(selectedDay.dateKey + "T00:00:00").toLocaleDateString("id-ID", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </h3>
            <button
              className="detail-close-btn"
              onClick={() => setSelectedDay(null)}
            >
              ✕
            </button>
          </div>

          {/* Status hari */}
          {selectedDay.holidayOnDay && (
            <div className="detail-holiday-badge">
              🔴 Hari Libur — {selectedDay.holidayOnDay.reason}
              <button
                className="detail-del-holiday"
                onClick={() => handleDeleteHoliday(selectedDay.holidayOnDay.id)}
              >
                Hapus
              </button>
            </div>
          )}

          {selectedDay.savingsOnDay.length === 0 && !selectedDay.holidayOnDay && (
            <p className="detail-empty">Tidak ada aktivitas pada hari ini.</p>
          )}

          {selectedDay.savingsOnDay.length > 0 && (
            <div className="detail-savings">
              <p className="detail-section-title">💰 Tabungan Masuk:</p>
              {selectedDay.savingsOnDay.map((s) => (
                <div key={s.id} className="detail-saving-row">
                  <span className={`detail-role-badge ${s.role}`}>
                    {s.role === "cowo" ? "👨 Cowo" : "👩 Cewe"}
                  </span>
                  <span className="detail-amount">
                    +Rp {(s.amount || 0).toLocaleString("id-ID")}
                  </span>
                </div>
              ))}
              <div className="detail-total-row">
                <span>Total hari ini</span>
                <span className="detail-total-amount">
                  Rp{" "}
                  {selectedDay.savingsOnDay
                    .reduce((sum, s) => sum + (s.amount || 0), 0)
                    .toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── FORM TAMBAH HARI LIBUR ── */}
      <div className="cal-card holiday-form-card">
        <h3 className="holiday-form-title">🔴 Tandai Hari Libur</h3>
        <p className="holiday-form-desc">
          {groupDocId
            ? "Pilih tanggal yang ingin dijadikan hari libur menabung."
            : "Kalender libur memakai data group pasangan. Pastikan akun kalian sudah pairing dulu."}
        </p>

        <div className="holiday-form-fields">
          <div className="form-group">
            <label className="form-label">📅 Tanggal Libur</label>
            <input
              type="date"
              value={holidayInput}
              onChange={(e) => setHolidayInput(e.target.value)}
              className="form-input"
              disabled={addingHoliday}
            />
          </div>

          <div className="form-group">
            <label className="form-label">📝 Keterangan (opsional)</label>
            <input
              type="text"
              placeholder="Contoh: Liburan, Sakit, dll"
              value={holidayReason}
              onChange={(e) => setHolidayReason(e.target.value)}
              className="form-input"
              disabled={addingHoliday}
            />
          </div>

            <button
            className="holiday-add-btn"
            onClick={handleAddHoliday}
            disabled={addingHoliday || !holidayInput || !groupDocId}
          >
            {addingHoliday ? "Menyimpan..." : "➕ Tandai Libur"}
          </button>
        </div>

        {/* Daftar hari libur bulan ini */}
        {holidays.length > 0 && (
          <div className="holiday-list">
            <p className="holiday-list-title">Semua Hari Libur:</p>
            {holidays
              .slice()
              .sort((a, b) => a.dateKey.localeCompare(b.dateKey))
              .map((h) => (
                <div key={h.id} className="holiday-item">
                  <div className="holiday-item-info">
                    <span className="holiday-item-date">
                      {new Date(h.dateKey + "T00:00:00").toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span className="holiday-item-reason">{h.reason}</span>
                  </div>
                  <button
                    className="holiday-del-btn"
                    onClick={() => handleDeleteHoliday(h.id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
