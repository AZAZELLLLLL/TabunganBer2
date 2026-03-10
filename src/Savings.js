import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "./firebase";
import "./Savings.css";

export default function Savings({ user, onNavigate }) {
  const [savings, setSavings] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [targetSavings, setTargetSavings] = useState(0);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // Fetch data
  useEffect(() => {
    const groupId = user.groupId || "default";

    // Fetch Savings
    const savingsQuery = query(
      collection(db, "savings"),
      where("groupId", "==", groupId)
    );
    const unsubscribeSavings = onSnapshot(savingsQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setSavings(data);
    });

    // Fetch Expenses
    const expensesQuery = query(
      collection(db, "expenses"),
      where("groupId", "==", groupId)
    );
    const unsubscribeExpenses = onSnapshot(expensesQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setExpenses(data);
    });

    return () => {
      unsubscribeSavings();
      unsubscribeExpenses();
    };
  }, [user.groupId]);

  // Filter regular savings (not deductions)
  const regularSavings = savings.filter(s => s.role && s.role !== "deduction");

  // Calculate totals
  const totalIncome = regularSavings.reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalDeductions = savings
    .filter(s => s.role === "deduction")
    .reduce((sum, s) => sum + Math.abs(s.amount || 0), 0);
  const netTotal = totalIncome - totalDeductions;

  const cowoIncome = regularSavings
    .filter((s) => s.role === "cowo")
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  const ceweIncome = regularSavings
    .filter((s) => s.role === "cewe")
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  // Monthly data
  const monthStart = new Date(
    selectedMonth.getFullYear(),
    selectedMonth.getMonth(),
    1
  );
  const monthEnd = new Date(
    selectedMonth.getFullYear(),
    selectedMonth.getMonth() + 1,
    0
  );

  const monthlyAdded = regularSavings
    .filter((s) => {
      const sDate = s.date?.toDate ? s.date.toDate() : new Date(s.date);
      return sDate >= monthStart && sDate <= monthEnd;
    })
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  const monthlyDeducted = savings
    .filter((s) => s.role === "deduction")
    .filter((s) => {
      const sDate = s.date?.toDate ? s.date.toDate() : new Date(s.date);
      return sDate >= monthStart && sDate <= monthEnd;
    })
    .reduce((sum, s) => sum + Math.abs(s.amount || 0), 0);

  // Category breakdown
  const categoryEmoji = {
    makan: "🍕",
    transport: "🚗",
    hiburan: "🎬",
    belanja: "🛍️",
    kesehatan: "💊",
    utilitas: "💡",
    lainnya: "💰",
  };

  const categoryLabel = {
    makan: "Makan & Minuman",
    transport: "Transport",
    hiburan: "Hiburan",
    belanja: "Belanja",
    kesehatan: "Kesehatan",
    utilitas: "Utilitas",
    lainnya: "Lainnya",
  };

  const categoryBreakdown = Object.keys(categoryEmoji).map((cat) => {
    const catTotal = expenses
      .filter((e) => e.category === cat)
      .reduce((sum, e) => sum + e.amount, 0);
    return {
      name: categoryLabel[cat],
      value: catTotal,
      icon: categoryEmoji[cat],
    };
  });

  // Statistics
  const avgMonthly = (totalIncome / 12).toLocaleString("id-ID", { maximumFractionDigits: 0 });
  const savingRate = totalIncome > 0 ? ((netTotal / totalIncome) * 100).toFixed(1) : 0;
  const targetProgress = targetSavings > 0 ? ((netTotal / targetSavings) * 100).toFixed(1) : 0;

  const handleDeleteSaving = async (id) => {
    if (window.confirm("Hapus transaksi ini?")) {
      try {
        await deleteDoc(doc(db, "savings", id));
      } catch (error) {
        console.error("Error deleting saving:", error);
      }
    }
  };

  const currentMonth = selectedMonth.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

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
        <div className="container">
          {/* Header */}
          <div className="savings-header">
            <h1>💰 Detail Tabungan</h1>
            <p>Tracking tabungan bersama lebih mudah</p>
          </div>

          {/* Summary Cards */}
          <div className="summary-cards">
            <div className="summary-card total">
              <div className="card-header">
                <p className="card-label">💑 Total Tabungan</p>
                <p className="card-emoji">💕</p>
              </div>
              <h2>Rp {netTotal.toLocaleString("id-ID")}</h2>
              <p className="card-detail">{regularSavings.length} transaksi</p>
            </div>

            <div className="summary-card cowo">
              <div className="card-header">
                <p className="card-label">👨 Cowo Kasih</p>
                <p className="card-emoji">👨</p>
              </div>
              <h3>Rp {cowoIncome.toLocaleString("id-ID")}</h3>
            </div>

            <div className="summary-card cewe">
              <div className="card-header">
                <p className="card-label">👩 Cewe Kasih</p>
                <p className="card-emoji">👩</p>
              </div>
              <h3>Rp {ceweIncome.toLocaleString("id-ID")}</h3>
            </div>

            <div className="summary-card deduction">
              <div className="card-header">
                <p className="card-label">📉 Total Deduction</p>
                <p className="card-emoji">💸</p>
              </div>
              <h3>-Rp {totalDeductions.toLocaleString("id-ID")}</h3>
            </div>
          </div>

          {/* Target Section */}
          <div className="section target-section">
            <div className="target-header">
              <h2>🎯 Target Tabungan</h2>
              <p className="target-help">Set target tabungan kalian!</p>
            </div>

            <div className="target-form">
              <input
                type="number"
                placeholder="Target (Rp)"
                value={targetSavings}
                onChange={(e) => setTargetSavings(parseFloat(e.target.value) || 0)}
                className="target-input"
              />
              <button
                onClick={() => {
                  if (targetSavings > 0) {
                    alert(`Target tabungan set ke: Rp ${targetSavings.toLocaleString("id-ID")}`);
                  }
                }}
                className="target-btn"
              >
                Set Target
              </button>
            </div>

            {targetSavings > 0 && (
              <div className="target-progress">
                <div className="progress-info">
                  <span>Progress: {targetProgress}%</span>
                  <span>Rp {netTotal.toLocaleString("id-ID")} / Rp {targetSavings.toLocaleString("id-ID")}</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${Math.min(targetProgress, 100)}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Monthly Breakdown */}
          <div className="section monthly-section">
            <div className="month-header">
              <h2>📅 Ringkasan Bulan</h2>
              <div className="month-nav">
                <button
                  onClick={() =>
                    setSelectedMonth(
                      new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1)
                    )
                  }
                  className="month-btn"
                >
                  ← Lalu
                </button>
                <span className="current-month">{currentMonth}</span>
                <button
                  onClick={() =>
                    setSelectedMonth(
                      new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1)
                    )
                  }
                  className="month-btn"
                >
                  Depan →
                </button>
              </div>
            </div>

            <div className="monthly-cards">
              <div className="monthly-card added">
                <p>Ditambah</p>
                <h3>Rp {monthlyAdded.toLocaleString("id-ID")}</h3>
              </div>
              <div className="monthly-card deducted">
                <p>Dikurang</p>
                <h3>-Rp {monthlyDeducted.toLocaleString("id-ID")}</h3>
              </div>
              <div className="monthly-card net">
                <p>Net</p>
                <h3>Rp {(monthlyAdded - monthlyDeducted).toLocaleString("id-ID")}</h3>
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="section stats-section">
            <h2>📊 Statistik</h2>
            <div className="stats-grid">
              <div className="stat-card">
                <p className="stat-label">Rata-rata Bulanan</p>
                <p className="stat-value">Rp {avgMonthly}</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Saving Rate</p>
                <p className="stat-value">{savingRate}%</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Total Deduction</p>
                <p className="stat-value">Rp {totalDeductions.toLocaleString("id-ID")}</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Transaksi</p>
                <p className="stat-value">{regularSavings.length}</p>
              </div>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="section category-section">
            <h2>📁 Breakdown Kategori Pengeluaran</h2>
            <div className="category-list">
              {categoryBreakdown.filter(c => c.value > 0).map((cat, idx) => {
                const percentage = expenses.length > 0 ? ((cat.value / expenses.reduce((sum, e) => sum + e.amount, 0)) * 100).toFixed(1) : 0;
                return (
                  <div key={idx} className="category-item">
                    <div className="cat-info">
                      <span className="cat-icon">{cat.icon}</span>
                      <span className="cat-name">{cat.name}</span>
                    </div>
                    <div className="cat-stats">
                      <p className="cat-amount">Rp {cat.value.toLocaleString("id-ID")}</p>
                      <p className="cat-percentage">{percentage}%</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent History */}
          <div className="section history-section">
            <h2>📝 Riwayat Terbaru</h2>
            {savings.length === 0 ? (
              <p className="empty-state">Belum ada riwayat tabungan</p>
            ) : (
              <div className="history-list">
                {savings.slice(0, 15).map((saving) => {
                  const savingDate = saving.date?.toDate
                    ? saving.date.toDate().toLocaleDateString("id-ID")
                    : new Date(saving.date).toLocaleDateString("id-ID");

                  const isDeduction = saving.role === "deduction";

                  return (
                    <div
                      key={saving.id}
                      className="history-item"
                      style={{
                        borderLeftColor: isDeduction ? "#E74C3C" : "#27AE60",
                        background: isDeduction ? "#FFE8E8" : "#E8F8F5",
                      }}
                    >
                      <div className="history-info">
                        <p className="history-type">
                          {isDeduction ? "💸 Deduction" : `${saving.role === "cowo" ? "👨" : "👩"} ${saving.userName}`}
                        </p>
                        <p className="history-date">{savingDate}</p>
                      </div>
                      <div className="history-amount">
                        <p style={{ color: isDeduction ? "#E74C3C" : "#27AE60" }}>
                          {isDeduction ? "-" : "+"}Rp {Math.abs(saving.amount).toLocaleString("id-ID")}
                        </p>
                        <button
                          onClick={() => handleDeleteSaving(saving.id)}
                          className="delete-btn"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}