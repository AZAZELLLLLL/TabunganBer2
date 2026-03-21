import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "./firebase";
import "./Income.css";

export default function Income({ user, onNavigate }) {
  const [incomes, setIncomes] = useState([]);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("gaji");
  const [description, setDescription] = useState("");
  const [incomeDate, setIncomeDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [filterMonth, setFilterMonth] = useState(new Date());

  // Fetch income data real-time
  useEffect(() => {
    const groupId = user.groupId || "default";

    const incomeQuery = query(
      collection(db, "income"),
      where("groupId", "==", groupId)
    );

    const unsubscribe = onSnapshot(incomeQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setIncomes(data.sort((a, b) => b.date - a.date));
    });

    return unsubscribe;
  }, [user.groupId]);

  const handleIncreaseAmount = () => {
    const current = parseFloat(amount) || 0;
    setAmount((current + 10000).toString());
  };

  const handleDecreaseAmount = () => {
    const current = parseFloat(amount) || 0;
    if (current >= 10000) {
      setAmount((current - 10000).toString());
    }
  };

  const handleAddIncome = async (e) => {
    e.preventDefault();

    if (!amount || !description) {
      alert("Isi jumlah dan deskripsi pemasukan!");
      return;
    }

    if (parseFloat(amount) <= 0) {
      alert("Jumlah harus lebih dari 0!");
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, "income"), {
        groupId: user.groupId || "default",
        userId: user.uid,
        userName: user.name,
        userPhoto: user.photo,
        userRole: user.role,
        amount: parseFloat(amount),
        category,
        description,
        date: new Date(incomeDate),
      });

      setAmount("");
      setDescription("");
      setCategory("gaji");
      setIncomeDate(new Date().toISOString().split('T')[0]);
      alert("Pemasukan berhasil ditambahkan! 💰");
    } catch (error) {
      console.error("Error adding income:", error);
      alert("Gagal menambah pemasukan!");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteIncome = async (id) => {
    if (window.confirm("Hapus pemasukan ini?")) {
      try {
        await deleteDoc(doc(db, "income", id));
        alert("Pemasukan berhasil dihapus! ✅");
      } catch (error) {
        console.error("Error deleting:", error);
        alert("Gagal menghapus!");
      }
    }
  };

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

  const filteredIncomes = incomes.filter((i) => {
    const iDate = i.date?.toDate ? i.date.toDate() : new Date(i.date);
    return iDate >= monthStart && iDate <= monthEnd;
  });

  const totalIncome = filteredIncomes.reduce((sum, i) => sum + (i.amount || 0), 0);

  // Calculate breakdown
  const cowoIncome = incomes
    .filter((i) => i.userRole === "cowo")
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const ceweIncome = incomes
    .filter((i) => i.userRole === "cewe")
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const totalAllIncome = cowoIncome + ceweIncome;
  const cowoIncomePercent = totalAllIncome > 0 ? ((cowoIncome / totalAllIncome) * 100).toFixed(1) : 0;
  const ceweIncomePercent = totalAllIncome > 0 ? ((ceweIncome / totalAllIncome) * 100).toFixed(1) : 0;

  const averagePerTransaction = filteredIncomes.length > 0 
    ? (totalIncome / filteredIncomes.length).toFixed(0)
    : 0;

  const categoryEmoji = {
    gaji: "💼",
    bonus: "🎁",
    freelance: "💻",
    bisnis: "🏪",
    investasi: "📈",
    lainnya: "💵",
  };

  const categoryLabel = {
    gaji: "Gaji",
    bonus: "Bonus",
    freelance: "Freelance",
    bisnis: "Bisnis",
    investasi: "Investasi",
    lainnya: "Lainnya",
  };

  const currentMonth = filterMonth.toLocaleDateString("id-ID", {
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

      <div className="income-page">
        {/* Header */}
        <div className="income-header">
          <h1>💵 Detail Pemasukan</h1>
          <p>Catat dan kelola semua sumber pemasukan bersama</p>
        </div>

        {/* Summary Cards */}
        <div className="summary-section">
          <div className="summary-grid">
            {/* Total Income All Time */}
            <div className="summary-card total-card">
              <div className="card-header">
                <span className="card-icon">💑</span>
                <h3>Total Pemasukan</h3>
              </div>
              <div className="card-content">
                <h2 className="amount">Rp {totalAllIncome.toLocaleString("id-ID")}</h2>
                <p className="subtitle">Dari {incomes.length} transaksi</p>
              </div>
            </div>

            {/* Cowo Income */}
            <div className="summary-card cowo-card">
              <div className="card-header">
                <span className="card-icon">👨</span>
                <h3>Pemasukan Cowo</h3>
              </div>
              <div className="card-content">
                <h2 className="amount">Rp {cowoIncome.toLocaleString("id-ID")}</h2>
                <p className="subtitle">{cowoIncomePercent}% dari total</p>
              </div>
            </div>

            {/* Cewe Income */}
            <div className="summary-card cewe-card">
              <div className="card-header">
                <span className="card-icon">👩</span>
                <h3>Pemasukan Cewe</h3>
              </div>
              <div className="card-content">
                <h2 className="amount">Rp {ceweIncome.toLocaleString("id-ID")}</h2>
                <p className="subtitle">{ceweIncomePercent}% dari total</p>
              </div>
            </div>

            {/* Monthly Average */}
            <div className="summary-card average-card">
              <div className="card-header">
                <span className="card-icon">📊</span>
                <h3>Rata-rata per Transaksi</h3>
              </div>
              <div className="card-content">
                <h2 className="amount">Rp {averagePerTransaction.toLocaleString("id-ID")}</h2>
                <p className="subtitle">{filteredIncomes.length} transaksi bulan ini</p>
              </div>
            </div>
          </div>
        </div>

        {/* Add Income Form */}
        <div className="section form-section">
          <h2>➕ Tambah Pemasukan</h2>
          <p style={{ color: "#8B6F9E", fontSize: "13px", marginBottom: "15px" }}>
            ℹ️ Catat semua sumber pemasukan untuk tracking yang akurat
          </p>

          {/* Date Picker */}
          <div className="income-date-section">
            <label>📅 Tanggal Pemasukan</label>
            <input
              type="date"
              value={incomeDate}
              onChange={(e) => setIncomeDate(e.target.value)}
              disabled={loading}
              className="date-input"
            />
          </div>

          <form onSubmit={handleAddIncome} className="income-form">
            <div className="form-group">
              <label>Jumlah (Rp)</label>
              <div className="custom-number-input">
                <button
                  type="button"
                  onClick={handleDecreaseAmount}
                  disabled={loading || !amount || parseFloat(amount) === 0}
                  className="decrement-btn"
                >
                  −
                </button>
                <div className="amount-display">
                  {amount ? `Rp ${parseFloat(amount).toLocaleString("id-ID")}` : "Rp 0"}
                </div>
                <button
                  type="button"
                  onClick={handleIncreaseAmount}
                  disabled={loading}
                  className="increment-btn"
                >
                  +
                </button>
              </div>
            </div>

            <div className="form-group">
              <label>Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                disabled={loading}
              >
                <option value="gaji">💼 Gaji</option>
                <option value="bonus">🎁 Bonus</option>
                <option value="freelance">💻 Freelance</option>
                <option value="bisnis">🏪 Bisnis</option>
                <option value="investasi">📈 Investasi</option>
                <option value="lainnya">💵 Lainnya</option>
              </select>
            </div>

            <div className="form-group">
              <label>Deskripsi</label>
              <input
                type="text"
                placeholder="Contoh: Gaji bulanan Januari 2025"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? "Menambah..." : "Tambah Pemasukan"}
            </button>
          </form>
        </div>

        {/* Monthly Summary */}
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

          <div className="monthly-summary">
            <div className="summary-item">
              <div className="summary-icon">💰</div>
              <div className="summary-info">
                <p className="summary-label">Total Pemasukan</p>
                <p className="summary-amount">Rp {totalIncome.toLocaleString("id-ID")}</p>
                <p className="summary-detail">{filteredIncomes.length} transaksi</p>
              </div>
            </div>

            <div className="summary-item">
              <div className="summary-icon">📊</div>
              <div className="summary-info">
                <p className="summary-label">Rata-rata per Transaksi</p>
                <p className="summary-amount">Rp {(totalIncome / (filteredIncomes.length || 1)).toLocaleString("id-ID", { maximumFractionDigits: 0 })}</p>
                <p className="summary-detail">Bulan ini</p>
              </div>
            </div>
          </div>
        </div>

        {/* Income Breakdown */}
        <div className="section breakdown-section">
          <h2>📈 Breakdown Kontribusi Pemasukan</h2>
          <div className="breakdown-content">
            <div className="breakdown-visual">
              <div className="contribution-chart">
                {totalAllIncome > 0 ? (
                  <>
                    <div 
                      className="contribution-segment cowo-segment"
                      style={{ width: `${cowoIncomePercent}%` }}
                      title={`Cowo: ${cowoIncomePercent}%`}
                    ></div>
                    <div 
                      className="contribution-segment cewe-segment"
                      style={{ width: `${ceweIncomePercent}%` }}
                      title={`Cewe: ${ceweIncomePercent}%`}
                    ></div>
                  </>
                ) : (
                  <p className="empty-state">Belum ada pemasukan</p>
                )}
              </div>
            </div>

            <div className="breakdown-stats">
              <div className="breakdown-item cowo">
                <div className="breakdown-header">
                  <span className="icon">👨</span>
                  <span className="label">Pemasukan Cowo</span>
                </div>
                <div className="breakdown-body">
                  <p className="amount">Rp {cowoIncome.toLocaleString("id-ID")}</p>
                  <div className="percentage-bar">
                    <div className="percentage-fill cowo" style={{ width: `${cowoIncomePercent}%` }}></div>
                  </div>
                  <p className="percentage">{cowoIncomePercent}%</p>
                </div>
              </div>

              <div className="breakdown-item cewe">
                <div className="breakdown-header">
                  <span className="icon">👩</span>
                  <span className="label">Pemasukan Cewe</span>
                </div>
                <div className="breakdown-body">
                  <p className="amount">Rp {ceweIncome.toLocaleString("id-ID")}</p>
                  <div className="percentage-bar">
                    <div className="percentage-fill cewe" style={{ width: `${ceweIncomePercent}%` }}></div>
                  </div>
                  <p className="percentage">{ceweIncomePercent}%</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Category Breakdown */}
        <div className="section category-section">
          <h2>📊 Breakdown Kategori Pemasukan</h2>
          <div className="category-breakdown">
            {Object.keys(categoryEmoji).map((cat) => {
              const catTotal = filteredIncomes
                .filter((i) => i.category === cat)
                .reduce((sum, i) => sum + i.amount, 0);

              if (catTotal === 0) return null;

              const percentage = totalIncome > 0 ? (catTotal / totalIncome) * 100 : 0;

              return (
                <div key={cat} className="category-item">
                  <div className="category-info">
                    <span className="cat-icon">{categoryEmoji[cat]}</span>
                    <span className="cat-name">{categoryLabel[cat]}</span>
                  </div>
                  <div className="category-stats">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="cat-amount">
                      Rp {catTotal.toLocaleString("id-ID")} ({percentage.toFixed(0)}%)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Income History */}
        <div className="section history-section">
          <h2>📝 Riwayat Pemasukan</h2>
          {incomes.length === 0 ? (
            <p className="empty-state">
              Belum ada riwayat pemasukan. Mulai catat pemasukan! 💵
            </p>
          ) : (
            <div className="history-list">
              {incomes.slice(0, 20).map((income) => {
                const incomeDate = income.date?.toDate 
                  ? income.date.toDate()
                  : new Date(income.date);
                const incomeDateDisplay = incomeDate.toLocaleDateString("id-ID", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric"
                });
                const timeDisplay = incomeDate.toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit"
                });

                return (
                  <div key={income.id} className="history-item">
                    <div className="history-left">
                      <div className="history-avatar">
                        {income.userRole === "cowo" ? "👨" : "👩"}
                      </div>
                      <div className="history-details">
                        <p className="history-name">{income.userName}</p>
                        <p className="history-category">
                          {categoryEmoji[income.category] || "💵"} {categoryLabel[income.category]}
                        </p>
                        <p className="history-description">{income.description}</p>
                        <p className="history-date">
                          📅 {incomeDateDisplay} • {timeDisplay}
                        </p>
                      </div>
                    </div>

                    <div className="history-right">
                      <p className="history-amount">
                        +Rp {income.amount.toLocaleString("id-ID")}
                      </p>
                      <button
                        onClick={() => handleDeleteIncome(income.id)}
                        className="delete-btn"
                        title="Hapus pemasukan"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Statistics */}
        <div className="section statistics-section">
          <h2>📊 Statistik Pemasukan</h2>
          <div className="statistics-grid">
            <div className="stat-card">
              <div className="stat-icon">🔢</div>
              <div className="stat-info">
                <p className="stat-title">Total Transaksi</p>
                <p className="stat-value">{incomes.length}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">💹</div>
              <div className="stat-info">
                <p className="stat-title">Total Pemasukan All Time</p>
                <p className="stat-value">Rp {totalAllIncome.toLocaleString("id-ID")}</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">👨</div>
              <div className="stat-info">
                <p className="stat-title">Kontribusi Cowo</p>
                <p className="stat-value">{cowoIncomePercent}%</p>
              </div>
            </div>

            <div className="stat-card">
              <div className="stat-icon">👩</div>
              <div className="stat-info">
                <p className="stat-title">Kontribusi Cewe</p>
                <p className="stat-value">{ceweIncomePercent}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}