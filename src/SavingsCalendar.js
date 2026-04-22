import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  buildSavingsDayMap,
  countCalendarStatuses,
  getCalendarDayStatus,
  toDateKey,
} from "./calendarUtils";
import {
  getProfileForRole,
  useCoupleProfiles,
} from "./coupleProfileUtils";
import "./SavingsCalendar.css";

const DAYS_LABEL = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
const MONTHS_LABEL = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function formatLongDate(dateKey) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatShortDate(dateKey) {
  return new Date(`${dateKey}T00:00:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function SavingsCalendar({ user, onNavigate }) {
  const today = new Date();
  const todayKey = toDateKey(today);
  const [viewDate, setViewDate] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1)
  );
  const [savings, setSavings] = useState([]);
  const [holidays, setHolidays] = useState([]);
  const [groupDocId, setGroupDocId] = useState("");
  const [holidayInput, setHolidayInput] = useState("");
  const [holidayReason, setHolidayReason] = useState("");
  const [addingHoliday, setAddingHoliday] = useState(false);
  const [selectedDayKey, setSelectedDayKey] = useState(null);

  const groupId = user.groupId || "default";
  const coupleProfiles = useCoupleProfiles(user.groupId);
  const cowoProfile = getProfileForRole(coupleProfiles, "cowo");
  const ceweProfile = getProfileForRole(coupleProfiles, "cewe");
  const canManageHolidays = Boolean(user.isOwner);

  useEffect(() => {
    const savingsQuery = query(
      collection(db, "savings"),
      where("groupId", "==", groupId)
    );

    return onSnapshot(savingsQuery, (snapshot) => {
      const nextSavings = snapshot.docs
        .map((entry) => ({
          id: entry.id,
          ...entry.data(),
        }))
        .filter((saving) => saving.role && saving.role !== "deduction");
      setSavings(nextSavings);
    });
  }, [groupId]);

  useEffect(() => {
    const groupQuery = query(
      collection(db, "groups"),
      where("groupId", "==", groupId)
    );

    return onSnapshot(groupQuery, (snapshot) => {
      if (snapshot.empty) {
        setGroupDocId("");
        setHolidays([]);
        return;
      }

      const groupSnapshot = snapshot.docs[0];
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
  }, [groupId]);

  const savingsDayMap = useMemo(() => buildSavingsDayMap(savings), [savings]);
  const holidayKeys = useMemo(
    () => new Set(holidays.map((holiday) => holiday.dateKey)),
    [holidays]
  );

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const totalSavingDays = Object.keys(savingsDayMap).length;
  const monthStatusCounts = countCalendarStatuses({
    year,
    month,
    daysInMonth,
    savingsDayMap,
    holidayKeys,
    todayKey,
  });
  const activeSavingDays = monthStatusCounts.green + monthStatusCounts.orange;

  const cells = [];
  for (let index = 0; index < firstDayOfWeek; index += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const selectedDay = useMemo(() => {
    if (!selectedDayKey) {
      return null;
    }

    const dayInfo = savingsDayMap[selectedDayKey] || {
      dateKey: selectedDayKey,
      totalAmount: 0,
      roles: [],
      entries: [],
    };
    const holidayOnDay = holidays.find((holiday) => holiday.dateKey === selectedDayKey) || null;
    const status = getCalendarDayStatus({
      dateKey: selectedDayKey,
      savingsDayMap,
      holidayKeys,
      todayKey,
    });

    return {
      ...dayInfo,
      holidayOnDay,
      status,
    };
  }, [selectedDayKey, savingsDayMap, holidays, holidayKeys, todayKey]);

  const goPrevMonth = () =>
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  const goNextMonth = () =>
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  const goToday = () =>
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));

  const handleAddHoliday = async () => {
    if (!canManageHolidays) {
      alert("Viewer hanya bisa melihat kalender. Penandaan libur hanya untuk owner.");
      return;
    }

    if (!holidayInput) {
      alert("Pilih tanggal libur dulu!");
      return;
    }

    if (!groupDocId) {
      alert("Group pasangan belum siap. Coba cek pairing akun dulu ya.");
      return;
    }

    if (holidayKeys.has(holidayInput)) {
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

      const updatedHolidays = [...holidays, newHoliday].sort((first, second) =>
        first.dateKey.localeCompare(second.dateKey)
      );

      await updateDoc(doc(db, "groups", groupDocId), {
        holidays: updatedHolidays,
        updatedAt: new Date(),
      });

      setHolidayInput("");
      setHolidayReason("");
      alert("Hari libur berhasil ditambahkan!");
    } catch (error) {
      console.error("addHoliday error:", error);
      alert("Gagal menambah hari libur: " + error.message);
    } finally {
      setAddingHoliday(false);
    }
  };

  const handleDeleteHoliday = async (id) => {
    if (!canManageHolidays) {
      alert("Viewer hanya bisa melihat kalender. Hapus libur hanya untuk owner.");
      return;
    }

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
      alert("Hari libur dihapus!");
    } catch (error) {
      console.error("deleteHoliday error:", error);
      alert("Gagal menghapus: " + error.message);
    }
  };

  return (
    <div className="calendar-page">
      <button className="cal-back-btn" onClick={() => onNavigate("menu")}>
        ← Kembali
      </button>

      <div className="cal-header">
        <h1 className="cal-title">Kalender Tabungan</h1>
        <p className="cal-subtitle">
          Hijau untuk setor berdua, oren saat baru salah satu, merah saat belum setor atau libur.
        </p>

        <div className="cal-legend">
          <div className="legend-item">
            <span className="legend-dot green" />
            <span>Berdua sudah menabung</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot orange" />
            <span>Baru salah satu menabung</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot red" />
            <span>Belum menabung / libur</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot today-dot" />
            <span>Hari ini</span>
          </div>
        </div>

        <div className="cal-stats">
          <div className="cal-stat-card">
            <span className="cal-stat-label">Total hari ada tabungan</span>
            <strong className="cal-stat-value">{totalSavingDays} hari</strong>
          </div>
          <div className="cal-stat-card">
            <span className="cal-stat-label">Bulan ini sudah ada tabungan</span>
            <strong className="cal-stat-value">{activeSavingDays} hari</strong>
          </div>
          <div className="cal-stat-card">
            <span className="cal-stat-label">Bulan ini setor berdua</span>
            <strong className="cal-stat-value">{monthStatusCounts.green} hari</strong>
          </div>
          <div className="cal-stat-card">
            <span className="cal-stat-label">Bulan ini baru satu pihak</span>
            <strong className="cal-stat-value">{monthStatusCounts.orange} hari</strong>
          </div>
        </div>
      </div>

      <div className="cal-card">
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

        <div className="cal-grid-header">
          {DAYS_LABEL.map((label) => (
            <div key={label} className="cal-day-name">{label}</div>
          ))}
        </div>

        <div className="cal-grid">
          {cells.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="cal-cell empty" />;
            }

            const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayInfo = savingsDayMap[dateKey];
            const status = getCalendarDayStatus({
              dateKey,
              savingsDayMap,
              holidayKeys,
              todayKey,
            });
            const isToday = dateKey === todayKey;
            const isSelected = selectedDayKey === dateKey;
            const hasHoliday = holidayKeys.has(dateKey);
            const roleCount = dayInfo?.roles?.length || 0;

            let cellClass = "cal-cell";
            if (isToday) cellClass += " is-today";
            if (isSelected) cellClass += " is-selected";

            return (
              <div
                key={dateKey}
                className={cellClass}
                onClick={() => setSelectedDayKey(dateKey)}
              >
                {status === "green" && <span className="cal-indicator green-indicator" />}
                {status === "orange" && <span className="cal-indicator orange-indicator" />}
                {status === "red" && <span className="cal-indicator red-indicator" />}

                <span className="cal-date-num">{day}</span>

                {hasHoliday && roleCount > 0 && (
                  <span className="cal-dual-dot">
                    <span
                      className={`mini-dot ${roleCount >= 2 ? "green-dot" : "orange-dot"}`}
                    />
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div className="cal-summary">
          <div className="cal-summary-item">
            <span className="summary-dot green" />
            <span>{monthStatusCounts.green} hari setor berdua</span>
          </div>
          <div className="cal-summary-item">
            <span className="summary-dot orange" />
            <span>{monthStatusCounts.orange} hari baru satu pihak</span>
          </div>
          <div className="cal-summary-item">
            <span className="summary-dot red" />
            <span>{monthStatusCounts.red} hari belum setor / libur</span>
          </div>
        </div>
      </div>

      {selectedDay && (
        <div className="cal-card detail-card">
          <div className="detail-header">
            <h3>Detail {formatLongDate(selectedDay.dateKey)}</h3>
            <button
              className="detail-close-btn"
              onClick={() => setSelectedDayKey(null)}
            >
              ×
            </button>
          </div>

          {selectedDay.holidayOnDay && (
            <div className="detail-holiday-badge">
              Hari libur - {selectedDay.holidayOnDay.reason}
              {canManageHolidays && (
                <button
                  className="detail-del-holiday"
                  onClick={() => handleDeleteHoliday(selectedDay.holidayOnDay.id)}
                >
                  Hapus
                </button>
              )}
            </div>
          )}

          <div className="detail-status-grid">
            {[
              { role: "cowo", profile: cowoProfile },
              { role: "cewe", profile: ceweProfile },
            ].map(({ role, profile }) => {
              const hasSaved = selectedDay.roles.includes(role);

              return (
                <div
                  key={role}
                  className={`detail-status-card ${hasSaved ? "saved" : "missing"}`}
                >
                  <span className="detail-status-name">{profile.name}</span>
                  <strong>{hasSaved ? "Sudah menabung" : "Belum menabung"}</strong>
                </div>
              );
            })}
          </div>

          {selectedDay.entries.length === 0 && !selectedDay.holidayOnDay && (
            <p className="detail-empty">Belum ada tabungan pada tanggal ini.</p>
          )}

          {selectedDay.entries.length > 0 && (
            <div className="detail-savings">
              <p className="detail-section-title">Tabungan Masuk</p>
              {selectedDay.entries.map((saving) => {
                const roleProfile = getProfileForRole(coupleProfiles, saving.role);

                return (
                  <div key={saving.id} className="detail-saving-row">
                    <span className={`detail-role-badge ${saving.role}`}>
                      {roleProfile.name}
                    </span>
                    <span className="detail-amount">
                      +Rp {(saving.amount || 0).toLocaleString("id-ID")}
                    </span>
                  </div>
                );
              })}
              <div className="detail-total-row">
                <span>Total hari ini</span>
                <span className="detail-total-amount">
                  Rp {selectedDay.totalAmount.toLocaleString("id-ID")}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="cal-card holiday-form-card">
        <h3 className="holiday-form-title">Tandai Hari Libur</h3>
        <p className="holiday-form-desc">
          {groupDocId
            ? canManageHolidays
              ? "Pilih tanggal yang ingin dijadikan hari libur menabung."
              : "Viewer bisa melihat daftar libur, tetapi perubahan data hanya bisa dilakukan owner."
            : "Kalender libur memakai data group pasangan. Pastikan akun kalian sudah pairing dulu."}
        </p>

        <div className="holiday-form-fields">
          <div className="form-group">
            <label className="form-label">Tanggal Libur</label>
            <input
              type="date"
              value={holidayInput}
              onChange={(event) => setHolidayInput(event.target.value)}
              className="form-input"
              disabled={addingHoliday || !canManageHolidays}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Keterangan</label>
            <input
              type="text"
              placeholder="Contoh: Liburan, sakit, ada kebutuhan lain"
              value={holidayReason}
              onChange={(event) => setHolidayReason(event.target.value)}
              className="form-input"
              disabled={addingHoliday || !canManageHolidays}
            />
          </div>

          <button
            className="holiday-add-btn"
            onClick={handleAddHoliday}
            disabled={addingHoliday || !holidayInput || !groupDocId || !canManageHolidays}
          >
            {addingHoliday ? "Menyimpan..." : "Tandai Libur"}
          </button>
        </div>

        {holidays.length > 0 && (
          <div className="holiday-list">
            <p className="holiday-list-title">Semua Hari Libur</p>
            {holidays
              .slice()
              .sort((first, second) => first.dateKey.localeCompare(second.dateKey))
              .map((holiday) => (
                <div key={holiday.id} className="holiday-item">
                  <div className="holiday-item-info">
                    <span className="holiday-item-date">
                      {formatShortDate(holiday.dateKey)}
                    </span>
                    <span className="holiday-item-reason">{holiday.reason}</span>
                  </div>
                  {canManageHolidays && (
                    <button
                      className="holiday-del-btn"
                      onClick={() => handleDeleteHoliday(holiday.id)}
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
