import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import "./Savings.css";

export default function Savings({ user, onNavigate }) {
  const [savings, setSavings] = useState([]);
  const [filterMonth, setFilterMonth] = useState(new Date());
  const [targetAmount, setTargetAmount] = useState(0);
  const [showTargetInput, setShowTargetInput] = useState(false);

  // Fetch savings data real-time
  useEffect(() => {
    const groupId = user.groupId || "default";

    const savingsQuery = query(
      collection(db, "savings"),
      where("groupId", "==", groupId)
    );

    const unsubscribe = onSnapshot(savingsQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSavings(data.sort((a, b) => b.date - a.date));
    });

    return unsubscribe;
  }, [user.groupId]);

  // Calculate totals
  const regularSavings = savings.filter(s => s.role && s.role !== "deduction");
  const totalSavings = savings.reduce((sum, s) => sum + (s.amount || 0), 0);
  const cowoSavings = regularSavings
    .filter((s) => s.role === "cowo")
    .reduce((sum, s) => sum + (s.amount || 0), 0);
  const ceweSavings = regularSavings
    .filter((s) => s.role === "cewe")
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  // Filter by month
  const monthStart = new Date(
    filterMonth.getFullYear(),
    filterMonth.getMonth(),
    1
  );
  const monthEnd = new Date(
    filterMonth.getFullYear(),
    filterMonth.getMonth() + 1,
    0
  );

  const monthlyRegularSavings = regularSavings.filter((s) => {
    const sDate = s.date?.toDate ? s.date.toDate() : new Date(s.date);
    return sDate >= monthStart && sDate <= monthEnd;
  });

  const monthlyDeductions = savings
    .filter((s) => s.role === "deduction")
    .filter((s) => {
      const sDate = s.date?.toDate ? s.date.toDate() : new Date(s.date);
      return sDate >= monthStart && sDate <= monthEnd;
    });

  const monthlyAddedAmount = monthlyRegularSavings.reduce((sum, s) => sum + (s.amount || 0), 0);
  const monthlyDeductedAmount = monthlyDeductions.reduce((sum, s) => sum + Math.abs(s.amount || 0), 0);
  const monthlyNetAmount = monthlyAddedAmount - monthlyDeductedAmount;

  // Target calculation
  const targetProgress = targetAmount > 0 ? (totalSavings / targetAmount) * 100 : 0;
  const targetRemaining = Math.max(0, targetAmount - totalSavings);

  // Contribution ratio
  const totalContribution = cowoSavings + ceweSavings;
  const cowoContributionPercent = totalContribution > 0 ? ((cowoSavings / totalContribution) * 100).toFixed(1) : 0;
  const ceweContributionPercent = totalContribution > 0 ? ((ceweSavings / totalContribution) * 100).toFixed(1) : 0;

  const currentMonth = filterMonth.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  const handleSetTarget = () => {
    const input = prompt("Berapa target tabungan? (Rp)", targetAmount.toString());
    if (input && !isNaN(input) && parseInt(input) > 0) {
      setTargetAmount(parseInt(input));
      setShowTargetInput(false);
    }
  };

  return (
    <>
      {/* Back Button */}
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
          transition: "all 0.3s ease"
        }}
        onMouseEnter={(e) => {
          e.target.style.transform = "translateY(-2px)";
          e.target.style.boxShadow = "0 8px 20px rgba(212, 134, 155, 0.3)";
        }}
        onMouseLeave={(e) => {
          e.target.style.transform = "translateY(0)";
          e.target.style.boxShadow = "none";
        }}
      >
        ← Kembali
      </button>

      <div className="savings-page">
        {/* Header */}
        <div className="savings-header">
          <h1>💰 Detail Tabungan Berdua</h1>
          <p>Kelola dan pantau tabungan untuk masa depan bersama</p>
        </div>

        {/* Total Summary Cards */}
        <div className="summary-section">
          <div className="summary-grid">
            {/* Total Tabungan */}
            <div className="summary-card total-card">
              <div className="card-header">
                <span className="card-icon">💑</span>
                <h3>Total Tabungan</h3>
              </div>
              <div className="card-content">
                <h2 className="amount">Rp {totalSavings.toLocaleString("id-ID")}</h2>
                <p className="subtitle">Tabungan bersama untuk masa depan</p>
              </div>
            </div>

            {/* Tabungan Cowo */}
            <div className="summary-card cowo-card">
              <div className="card-header">
                <span className="card-icon">👨</span>
                <h3>Kontribusi Cowo</h3>
              </div>
              <div className="card-content">
                <h2 className="amount">Rp {cowoSavings.toLocaleString("id-ID")}</h2>
                <p className="subtitle">{cowoContributionPercent}% dari total</p>
              </div>
            </div>

            {/* Tabungan Cewe */}
            <div className="summary-card cewe-card">
              <div className="card-header">
                <span className="card-icon">👩</span>
                <h3>Kontribusi Cewe</h3>
              </div>
              <div className="card-content">
                <h2 className="amount">Rp {ceweSavings.toLocaleString("id-ID")}</h2>
                <p className="subtitle">{ceweContributionPercent}% dari total</p>
              </div>
            </div>

            {/* Monthly Net */}
            <div className="summary-card net-card">
              <div className="card-header">
                <span className="card-icon">📊</span>
                <h3>Net Bulan Ini</h3>
              </div>
              <div className="card-content">
                <h2 className={`amount ${monthlyNetAmount >= 0 ? "positive" : "negative"}`}>
                  {monthlyNetAmount >= 0 ? "+" : "-"}Rp {Math.abs(monthlyNetAmount).toLocaleString("id-ID")}
                </h2>
                <p className="subtitle">{monthlyAddedAmount > 0 ? `+Rp ${monthlyAddedAmount.toLocaleString("id-ID")}` : "Rp 0"} ditambah</p>
              </div>
            </div>
          </div>
        </div>

        {/* Target Savings Section */}
        <div className="section target-section">
          <div className="section-header">
            <h2>🎯 Target Tabungan</h2>
            <button onClick={handleSetTarget} className="set-target-btn">
              {targetAmount > 0 ? "Ubah Target" : "Atur Target"}
            </button>
          </div>

          {targetAmount > 0 ? (
            <div className="target-content">
              <div className="target-info">
                <div className="target-stats">
                  <div className="stat-item">
                    <span className="stat-label">Target</span>
                    <span className="stat-value">Rp {targetAmount.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Sudah Tercapai</span>
                    <span className="stat-value">Rp {totalSavings.toLocaleString("id-ID")}</span>
                  </div>
                  <div className="stat-item">
                    <span className="stat-label">Sisa</span>
                    <span className="stat-value">Rp {targetRemaining.toLocaleString("id-ID")}</span>
                  </div>
                </div>

                <div className="progress-container">
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${Math.min(targetProgress, 100)}%` }}
                    ></div>
                  </div>
                  <div className="progress-label">
                    <span>{targetProgress.toFixed(1)}% Tercapai</span>
                    <span>{100 - Math.min(targetProgress, 100)}% Lagi</span>
                  </div>
                </div>

                {targetRemaining > 0 ? (
                  <p className="target-message">
                    ✨ Tinggal Rp {targetRemaining.toLocaleString("id-ID")} lagi untuk mencapai target! 💪
                  </p>
                ) : (
                  <p className="target-message success">
                    🎉 Target sudah tercapai! Selamat! 🎊
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="empty-target">
              <p>📌 Belum ada target tabungan</p>
              <p className="subtitle">Atur target untuk memotivasi diri</p>
            </div>
          )}
        </div>

        {/* Contribution Breakdown */}
        <div className="section breakdown-section">
          <h2>📈 Breakdown Kontribusi</h2>
          <div className="breakdown-content">
            <div className="breakdown-visual">
              <div className="contribution-chart">
                {totalContribution > 0 ? (
                  <>
                    <div 
                      className="contribution-segment cowo-segment"
                      style={{ width: `${cowoContributionPercent}%` }}
                      title={`Cowo: ${cowoContributionPercent}%`}
                    ></div>
                    <div 
                      className="contribution-segment cewe-segment"
                      style={{ width: `${ceweContributionPercent}%` }}
                      title={`Cewe: ${ceweContributionPercent}%`}
                    ></div>
                  </>
                ) : (
                  <p className="empty-state">Belum ada kontribusi</p>
                )}
              </div>
            </div>

            <div className="breakdown-stats">
              <div className="breakdown-item cowo">
                <div className="breakdown-header">
                  <span className="icon">👨</span>
                  <span className="label">Kontribusi Cowo</span>
                </div>
                <div className="breakdown-body">
                  <p className="amount">Rp {cowoSavings.toLocaleString("id-ID")}</p>
                  <div className="percentage-bar">
                    <div className="percentage-fill cowo" style={{ width: `${cowoContributionPercent}%` }}></div>
                  </div>
                  <p className="percentage">{cowoContributionPercent}%</p>
                </div>
              </div>

              <div className="breakdown-item cewe">
                <div className="breakdown-header">
                  <span className="icon">👩</span>
                  <span className="label">Kontribusi Cewe</span>
                </div>
                <div className="breakdown-body">
                  <p className="amount">Rp {ceweSavings.toLocaleString("id-ID")}</p>
                  <div className="percentage-bar">
                    <div className="percentage-fill cewe" style={{ width: `${ceweContributionPercent}%` }}></div>
                  </div>
                  <p className="percentage">{ceweContributionPercent}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Breakdown */}
        <div className="section monthly-section">
          <div className="section-header">
            <h2>📅 Ringkasan Bulanan</h2>
            <div className="month-selector">
              <button
                onClick={() =>
                  setFilterMonth(
                    new Date(filterMonth.getFullYear(), filterMonth.getMonth() - 1)
                  )
                }
                className="month-nav-btn"
              >
                ← Bulan Lalu
              </button>
              <span className="current-month">{currentMonth}</span>
              <button
                onClick={() =>
                  setFilterMonth(
                    new Date(filterMonth.getFullYear(), filterMonth.getMonth() + 1)
                  )
                }
                className="month-nav-btn"
              >
                Bulan Depan →
              </button>
            </div>
          </div>

          <div className="monthly-stats">
            <div className="monthly-card added">
              <div className="monthly-icon">📥</div>
              <div className="monthly-content">
                <p className="monthly-label">Ditambahkan</p>
                <p className="monthly-amount">+Rp {monthlyAddedAmount.toLocaleString("id-ID")}</p>
                <p className="monthly-detail">{monthlyRegularSavings.length} transaksi</p>
              </div>
            </div>

            <div className="monthly-card deducted">
              <div className="monthly-icon">📤</div>
              <div className="monthly-content">
                <p className="monthly-label">Dikurangi</p>
                <p className="monthly-amount">-Rp {monthlyDeductedAmount.toLocaleString("id-ID")}</p>
                <p className="monthly-detail">{monthlyDeductions.length} pengeluaran</p>
              </div>
            </div>

            <div className={`monthly-card net ${monthlyNetAmount >= 0 ? "positive" : "negative"}`}>
              <div className="monthly-icon">💰</div>
              <div className="monthly-content">
                <p className="monthly-label">Net Bulan Ini</p>
                <p className="monthly-amount">
                  {monthlyNetAmount >= 0 ? "+" : "-"}Rp {Math.abs(monthlyNetAmount).toLocaleString("id-ID")}
                </p>
                <p className="monthly-detail">{monthlyNetAmount >= 0 ? "Bertambah" : "Berkurang"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Savings History */}
        <div className="section history-section">
          <h2>📝 Riwayat Tabungan</h2>
          {regularSavings.length === 0 ? (
            <p className="empty-state">
              Belum ada riwayat tabungan. Mulai simpan uang berdua! 💕
            </p>
          ) : (
            <div className="history-list">
              {regularSavings.slice(0, 20).map((saving) => {
                const savingDate = saving.date?.toDate 
                  ? saving.date.toDate()
                  : new Date(saving.date);
                const savingDateDisplay = savingDate.toLocaleDateString("id-ID", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric"
                });
                const timeDisplay = savingDate.toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit"
                });

                return (
                  <div key={saving.id} className="history-item">
                    <div className="history-left">
                      <div className="history-avatar">
                        {saving.role === "cowo" ? "👨" : "👩"}
                      </div>
                      <div className="history-details">
                        <p className="history-name">{saving.userName}</p>
                        <p className="history-role">
                          {saving.role === "cowo" ? "Kontribusi Cowok" : "Kontribusi Cewe"}
                        </p>
                        <p className="history-date">
                          📅 {savingDateDisplay} • {timeDisplay}
                        </p>
                      </div>
                    </div>
                    <div className="history-right">
                      <p className="history-amount">
                        +Rp {saving.amount.toLocaleString("id-ID")}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Statistics Section */}
        <div className="section statistics-section">
          <h2>📊 Statistik Tabungan</h2>
          <div className="statistics-grid">
            <div className="stat-card">
              <div className="stat-icon">🔢</div>
              <div className="stat-info">
                <p className="stat-title">Total Transaksi</p>
                <p className="stat-value">{regularSavings.length}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">💹</div>
              <div className="stat-info">
                <p className="stat-title">Rata-rata per Transaksi</p>
                <p className="stat-value">
                  Rp {regularSavings.length > 0 
                    ? (totalSavings / regularSavings.length).toLocaleString("id-ID", {
                        maximumFractionDigits: 0
                      })
                    : 0
                  }
                </p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">👨</div>
              <div className="stat-info">
                <p className="stat-title">Kontribusi Cowo</p>
                <p className="stat-value">{cowoContributionPercent}%</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">👩</div>
              <div className="stat-info">
                <p className="stat-title">Kontribusi Cewe</p>
                <p className="stat-value">{ceweContributionPercent}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}