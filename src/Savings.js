import React, { useEffect, useMemo, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  getDisplayProfileForRecord,
  getProfileForRole,
  useCoupleProfiles,
} from "./coupleProfileUtils";
import {
  getTotalSavingsBalance,
  isDeductionSaving,
  isLoanAdjustmentSaving,
  isRegularSaving,
} from "./savingsDataUtils";
import "./Savings.css";

function toDateObject(value) {
  if (!value) return null;
  if (value?.toDate) return value.toDate();

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateLabel(value) {
  const date = toDateObject(value);
  if (!date) return "-";

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function isDateWithinMonth(value, monthStart, monthEnd) {
  const date = toDateObject(value);
  return Boolean(date && date >= monthStart && date <= monthEnd);
}

function getHistoryPresentation(entry, coupleProfiles) {
  if (isDeductionSaving(entry)) {
    return {
      variant: "deduction",
      badge: "Keluar",
      title: "Pengeluaran dari tabungan",
      subtitle: entry.description || "Saldo dipakai untuk kebutuhan harian",
      amountPrefix: "-",
      amountColor: "#E74C3C",
      canDelete: false,
    };
  }

  if (isLoanAdjustmentSaving(entry)) {
    const isRepayment = entry.type === "loan_repayment";
    return {
      variant: isRepayment ? "loan-in" : "loan-out",
      badge: isRepayment ? "Lunas" : "Pinjam",
      title: isRepayment ? "Pelunasan pinjaman" : "Pinjaman dari tabungan",
      subtitle:
        entry.description ||
        (isRepayment
          ? "Dana pinjaman sudah dikembalikan ke tabungan"
          : "Saldo tabungan sementara dipinjam"),
      amountPrefix: isRepayment ? "+" : "-",
      amountColor: isRepayment ? "#27AE60" : "#F39C12",
      canDelete: false,
    };
  }

  const profile = getDisplayProfileForRecord(coupleProfiles, entry);
  const roleLabel = entry.role === "cewe" ? "Cewe" : "Cowo";

  return {
    variant: entry.role === "cewe" ? "cewe" : "cowo",
    badge: roleLabel,
    title: profile.name,
    subtitle: `Setoran ${roleLabel.toLowerCase()}`,
    amountPrefix: "+",
    amountColor: "#27AE60",
    canDelete: true,
  };
}

export default function Savings({ user, onNavigate }) {
  const [savings, setSavings] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [targetSavings, setTargetSavings] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const groupId = user.groupId || "default";
  const coupleProfiles = useCoupleProfiles(user.groupId);
  const cowoProfile = getProfileForRole(coupleProfiles, "cowo");
  const ceweProfile = getProfileForRole(coupleProfiles, "cewe");

  useEffect(() => {
    const savingsQuery = query(
      collection(db, "savings"),
      where("groupId", "==", groupId)
    );

    const unsubscribeSavings = onSnapshot(savingsQuery, (snapshot) => {
      const data = snapshot.docs
        .map((entry) => ({
          id: entry.id,
          ...entry.data(),
        }))
        .sort((first, second) => {
          const secondDate = toDateObject(second.date)?.getTime() || 0;
          const firstDate = toDateObject(first.date)?.getTime() || 0;
          return secondDate - firstDate;
        });
      setSavings(data);
    });

    const expensesQuery = query(
      collection(db, "expenses"),
      where("groupId", "==", groupId)
    );

    const unsubscribeExpenses = onSnapshot(expensesQuery, (snapshot) => {
      const data = snapshot.docs.map((entry) => ({
        id: entry.id,
        ...entry.data(),
      }));
      setExpenses(data);
    });

    return () => {
      unsubscribeSavings();
      unsubscribeExpenses();
    };
  }, [groupId]);

  const regularSavings = useMemo(
    () => savings.filter(isRegularSaving),
    [savings]
  );
  const deductionSavings = useMemo(
    () => savings.filter(isDeductionSaving),
    [savings]
  );
  const loanAdjustments = useMemo(
    () => savings.filter(isLoanAdjustmentSaving),
    [savings]
  );

  const totalSavings = getTotalSavingsBalance(savings);
  const totalContribution = regularSavings.reduce(
    (sum, saving) => sum + Number(saving.amount || 0),
    0
  );
  const totalExpenseDeduction = deductionSavings.reduce(
    (sum, saving) => sum + Math.abs(Number(saving.amount || 0)),
    0
  );
  const netLoanAdjustment = loanAdjustments.reduce(
    (sum, saving) => sum + Number(saving.amount || 0),
    0
  );
  const outstandingLoanAmount = Math.max(netLoanAdjustment * -1, 0);

  const cowoContribution = regularSavings
    .filter((saving) => saving.role === "cowo")
    .reduce((sum, saving) => sum + Number(saving.amount || 0), 0);
  const ceweContribution = regularSavings
    .filter((saving) => saving.role === "cewe")
    .reduce((sum, saving) => sum + Number(saving.amount || 0), 0);

  const monthStart = new Date(
    selectedMonth.getFullYear(),
    selectedMonth.getMonth(),
    1
  );
  const monthEnd = new Date(
    selectedMonth.getFullYear(),
    selectedMonth.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  const monthRegularSavings = regularSavings.filter((saving) =>
    isDateWithinMonth(saving.date, monthStart, monthEnd)
  );
  const monthDeductionSavings = deductionSavings.filter((saving) =>
    isDateWithinMonth(saving.date, monthStart, monthEnd)
  );
  const monthLoanAdjustments = loanAdjustments.filter((saving) =>
    isDateWithinMonth(saving.date, monthStart, monthEnd)
  );

  const monthlyAdded = monthRegularSavings.reduce(
    (sum, saving) => sum + Number(saving.amount || 0),
    0
  );
  const monthlyDeducted = monthDeductionSavings.reduce(
    (sum, saving) => sum + Math.abs(Number(saving.amount || 0)),
    0
  );
  const monthlyLoanOut = monthLoanAdjustments
    .filter((saving) => Number(saving.amount || 0) < 0)
    .reduce((sum, saving) => sum + Math.abs(Number(saving.amount || 0)), 0);
  const monthlyLoanBack = monthLoanAdjustments
    .filter((saving) => Number(saving.amount || 0) > 0)
    .reduce((sum, saving) => sum + Number(saving.amount || 0), 0);
  const monthlyNetChange =
    monthlyAdded - monthlyDeducted - monthlyLoanOut + monthlyLoanBack;

  const totalSavingDays = new Set(
    regularSavings
      .map((saving) => {
        const date = toDateObject(saving.date);
        return date ? date.toISOString().slice(0, 10) : "";
      })
      .filter(Boolean)
  ).size;

  const monthSavingDays = new Set(
    monthRegularSavings
      .map((saving) => {
        const date = toDateObject(saving.date);
        return date ? date.toISOString().slice(0, 10) : "";
      })
      .filter(Boolean)
  ).size;

  const targetValue = Number(targetSavings || 0);
  const targetProgress = targetValue
    ? Math.min((totalSavings / targetValue) * 100, 100)
    : 0;

  const totalExpenses = expenses.reduce(
    (sum, expense) => sum + Number(expense.amount || 0),
    0
  );

  const categoryMeta = {
    makan: { label: "Makan & Minuman", accent: "#FF8A65" },
    transport: { label: "Transport", accent: "#4DB6AC" },
    hiburan: { label: "Hiburan", accent: "#F7B267" },
    belanja: { label: "Belanja", accent: "#C38D9E" },
    kesehatan: { label: "Kesehatan", accent: "#F67280" },
    utilitas: { label: "Utilitas", accent: "#6C9BCF" },
    lainnya: { label: "Lainnya", accent: "#8B6F9E" },
  };

  const categoryBreakdown = Object.entries(categoryMeta)
    .map(([key, meta]) => {
      const total = expenses
        .filter((expense) => expense.category === key)
        .reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
      return {
        key,
        ...meta,
        total,
      };
    })
    .filter((item) => item.total > 0)
    .sort((first, second) => second.total - first.total);

  const recentHistory = useMemo(
    () =>
      savings
        .slice()
        .sort((first, second) => {
          const secondDate = toDateObject(second.date)?.getTime() || 0;
          const firstDate = toDateObject(first.date)?.getTime() || 0;
          return secondDate - firstDate;
        })
        .slice(0, 18),
    [savings]
  );

  const handleDeleteSaving = async (saving) => {
    if (!user.isOwner) {
      alert("Viewer hanya bisa melihat data tabungan.");
      return;
    }

    if (!isRegularSaving(saving)) {
      alert("Data pengeluaran dan pinjaman diatur dari menu sistemnya masing-masing.");
      return;
    }

    if (!window.confirm("Hapus transaksi tabungan ini?")) {
      return;
    }

    try {
      await deleteDoc(doc(db, "savings", saving.id));
    } catch (error) {
      console.error("Error deleting saving:", error);
      alert(`Gagal menghapus tabungan: ${error.message}`);
    }
  };

  const currentMonthLabel = selectedMonth.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  return (
    <>
      <button
        onClick={() => onNavigate("menu")}
        className="back-button"
        style={{
          position: "fixed",
          top: "20px",
          left: "20px",
          zIndex: "999",
          padding: "10px 16px",
          background: "linear-gradient(135deg, #D4869B, #8B6F9E)",
          color: "white",
          border: "none",
          borderRadius: "8px",
          cursor: "pointer",
          fontWeight: "600",
          fontSize: "14px",
        }}
      >
        Kembali
      </button>

      <div className="savings-page">
        <div className="savings-shell">
          <section className="savings-hero">
            <div>
              <p className="savings-eyebrow">Detail tabungan bersama</p>
              <h1>Saldo, riwayat, dan pergerakan dana lebih rapi</h1>
              <p className="savings-intro">
                Halaman ini sekarang menampilkan saldo tabungan yang sudah
                memperhitungkan pengeluaran dan pinjaman, plus nama pasangan
                dibaca langsung dari profil aktif masing-masing.
              </p>
            </div>
            <div className="savings-hero-note">
              <span className="hero-note-label">Hari menabung</span>
              <strong>{totalSavingDays} hari</strong>
              <small>{monthSavingDays} hari tercatat di {currentMonthLabel}</small>
            </div>
          </section>

          <section className="savings-card savings-summary-card">
            <div className="savings-summary-grid">
              <article className="summary-panel total">
                <span className="summary-label">Saldo tabungan aktif</span>
                <strong className="summary-value">
                  Rp {totalSavings.toLocaleString("id-ID")}
                </strong>
                <small>
                  Sudah memperhitungkan pengeluaran dan pinjaman aktif.
                </small>
              </article>

              <article className="summary-panel soft">
                <span className="summary-label">Kontribusi {cowoProfile.name}</span>
                <strong className="summary-value">
                  Rp {cowoContribution.toLocaleString("id-ID")}
                </strong>
                <small>{regularSavings.filter((saving) => saving.role === "cowo").length} transaksi</small>
              </article>

              <article className="summary-panel soft">
                <span className="summary-label">Kontribusi {ceweProfile.name}</span>
                <strong className="summary-value">
                  Rp {ceweContribution.toLocaleString("id-ID")}
                </strong>
                <small>{regularSavings.filter((saving) => saving.role === "cewe").length} transaksi</small>
              </article>

              <article className="summary-panel warning">
                <span className="summary-label">Dana sedang dipinjam</span>
                <strong className="summary-value">
                  Rp {outstandingLoanAmount.toLocaleString("id-ID")}
                </strong>
                <small>Otomatis berkurang saat pinjam dan kembali saat lunas.</small>
              </article>
            </div>

            <div className="savings-metric-row">
              <div className="metric-chip">
                <span className="metric-chip-label">Total setoran</span>
                <strong>Rp {totalContribution.toLocaleString("id-ID")}</strong>
              </div>
              <div className="metric-chip">
                <span className="metric-chip-label">Pengeluaran dari tabungan</span>
                <strong>Rp {totalExpenseDeduction.toLocaleString("id-ID")}</strong>
              </div>
              <div className="metric-chip">
                <span className="metric-chip-label">Pengeluaran tercatat</span>
                <strong>Rp {totalExpenses.toLocaleString("id-ID")}</strong>
              </div>
            </div>
          </section>

          <div className="savings-main-grid">
            <section className="savings-card">
              <div className="section-head">
                <div>
                  <p className="section-kicker">Target pribadi</p>
                  <h2>Target tabungan</h2>
                </div>
              </div>

              <div className="target-box">
                <label htmlFor="savings-target" className="field-label">
                  Masukkan target tabungan
                </label>
                <div className="target-input-row">
                  <input
                    id="savings-target"
                    type="number"
                    min="0"
                    placeholder="Contoh: 5000000"
                    value={targetSavings}
                    onChange={(event) => setTargetSavings(event.target.value)}
                  />
                </div>

                {targetValue > 0 ? (
                  <div className="target-progress-wrap">
                    <div className="target-progress-head">
                      <span>Progress target</span>
                      <strong>{targetProgress.toFixed(1)}%</strong>
                    </div>
                    <div className="target-progress-bar">
                      <div
                        className="target-progress-fill"
                        style={{ width: `${targetProgress}%` }}
                      />
                    </div>
                    <small>
                      Rp {totalSavings.toLocaleString("id-ID")} dari target Rp{" "}
                      {targetValue.toLocaleString("id-ID")}
                    </small>
                  </div>
                ) : (
                  <p className="helper-text">
                    Isi target supaya kamu bisa lihat progress saldo saat ini.
                  </p>
                )}
              </div>
            </section>

            <section className="savings-card">
              <div className="section-head">
                <div>
                  <p className="section-kicker">Rangkuman bulanan</p>
                  <h2>{currentMonthLabel}</h2>
                </div>
                <div className="month-switcher">
                  <button
                    type="button"
                    className="month-switcher-btn"
                    onClick={() =>
                      setSelectedMonth(
                        new Date(
                          selectedMonth.getFullYear(),
                          selectedMonth.getMonth() - 1,
                          1
                        )
                      )
                    }
                  >
                    Sebelumnya
                  </button>
                  <button
                    type="button"
                    className="month-switcher-btn"
                    onClick={() =>
                      setSelectedMonth(
                        new Date(
                          selectedMonth.getFullYear(),
                          selectedMonth.getMonth() + 1,
                          1
                        )
                      )
                    }
                  >
                    Berikutnya
                  </button>
                </div>
              </div>

              <div className="monthly-grid">
                <article className="monthly-tile positive">
                  <span>Setoran masuk</span>
                  <strong>Rp {monthlyAdded.toLocaleString("id-ID")}</strong>
                  <small>{monthRegularSavings.length} transaksi tabungan</small>
                </article>
                <article className="monthly-tile danger">
                  <span>Pengeluaran tabungan</span>
                  <strong>Rp {monthlyDeducted.toLocaleString("id-ID")}</strong>
                  <small>{monthDeductionSavings.length} potongan tercatat</small>
                </article>
                <article className="monthly-tile warning">
                  <span>Pinjaman keluar</span>
                  <strong>Rp {monthlyLoanOut.toLocaleString("id-ID")}</strong>
                  <small>Pelunasan bulan ini Rp {monthlyLoanBack.toLocaleString("id-ID")}</small>
                </article>
                <article
                  className={`monthly-tile ${
                    monthlyNetChange >= 0 ? "neutral" : "danger-soft"
                  }`}
                >
                  <span>Perubahan saldo bulan ini</span>
                  <strong>
                    Rp {Math.abs(monthlyNetChange).toLocaleString("id-ID")}
                  </strong>
                  <small>
                    {monthlyNetChange >= 0
                      ? "Saldo bulan ini masih bertambah"
                      : "Saldo bulan ini sedang berkurang"}
                  </small>
                </article>
              </div>
            </section>
          </div>

          <section className="savings-card">
            <div className="section-head">
              <div>
                <p className="section-kicker">Pengeluaran</p>
                <h2>Breakdown kategori</h2>
              </div>
            </div>

            {categoryBreakdown.length === 0 ? (
              <p className="empty-state">Belum ada pengeluaran yang tercatat.</p>
            ) : (
              <div className="category-list">
                {categoryBreakdown.map((category) => {
                  const percentage = totalExpenses
                    ? ((category.total / totalExpenses) * 100).toFixed(1)
                    : "0.0";

                  return (
                    <article
                      key={category.key}
                      className="category-item"
                      style={{ borderLeftColor: category.accent }}
                    >
                      <div>
                        <h3>{category.label}</h3>
                        <p>{percentage}% dari seluruh pengeluaran</p>
                      </div>
                      <strong>Rp {category.total.toLocaleString("id-ID")}</strong>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="savings-card">
            <div className="section-head history-head">
              <div>
                <p className="section-kicker">Riwayat terbaru</p>
                <h2>Pergerakan saldo tabungan</h2>
              </div>
              <small className="helper-text">
                Data pinjaman dan pengeluaran dibuat otomatis oleh sistem agar
                saldo tetap konsisten.
              </small>
            </div>

            {recentHistory.length === 0 ? (
              <p className="empty-state">Belum ada riwayat tabungan.</p>
            ) : (
              <div className="history-list">
                {recentHistory.map((entry) => {
                  const presentation = getHistoryPresentation(entry, coupleProfiles);

                  return (
                    <article
                      key={entry.id}
                      className={`history-card ${presentation.variant}`}
                    >
                      <div className="history-card-left">
                        <span className={`history-badge ${presentation.variant}`}>
                          {presentation.badge}
                        </span>
                        <div>
                          <h3>{presentation.title}</h3>
                          <p>{presentation.subtitle}</p>
                          <small>{formatDateLabel(entry.date)}</small>
                        </div>
                      </div>

                      <div className="history-card-right">
                        <strong style={{ color: presentation.amountColor }}>
                          {presentation.amountPrefix}Rp{" "}
                          {Math.abs(Number(entry.amount || 0)).toLocaleString("id-ID")}
                        </strong>
                        {presentation.canDelete && user.isOwner ? (
                          <button
                            type="button"
                            className="history-delete-btn"
                            onClick={() => handleDeleteSaving(entry)}
                          >
                            Hapus
                          </button>
                        ) : (
                          <span className="history-system-tag">Sistem</span>
                        )}
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}
