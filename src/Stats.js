import React, { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import "./Stats.css";

export default function Stats({ user, onNavigate }) {
  const [savings, setSavings] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  // Fetch savings
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
      setSavings(data);
    });
    return unsubscribe;
  }, [user.groupId]);

  // Fetch expenses
  useEffect(() => {
    const groupId = user.groupId || "default";
    const expensesQuery = query(
      collection(db, "expenses"),
      where("groupId", "==", groupId)
    );
    const unsubscribe = onSnapshot(expensesQuery, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setExpenses(data);
    });
    return unsubscribe;
  }, [user.groupId]);

  // Filter regular savings (no deductions)
  const regularSavings = savings.filter(s => s.role && s.role !== "deduction");

  // Calculate monthly data for chart
  const getMonthlyData = () => {
    const months = {};
    
    // Initialize last 12 months
    for (let i = 11; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months[monthKey] = {
        month: date.toLocaleDateString("id-ID", { month: "short", year: "numeric" }),
        income: 0,
        expense: 0,
      };
    }

    // Add savings to income
    regularSavings.forEach((s) => {
      const sDate = s.date?.toDate ? s.date.toDate() : new Date(s.date);
      const monthKey = `${sDate.getFullYear()}-${String(sDate.getMonth() + 1).padStart(2, '0')}`;
      if (months[monthKey]) {
        months[monthKey].income += s.amount || 0;
      }
    });

    // Add expenses
    expenses.forEach((e) => {
      const eDate = e.date?.toDate ? e.date.toDate() : new Date(e.date);
      const monthKey = `${eDate.getFullYear()}-${String(eDate.getMonth() + 1).padStart(2, '0')}`;
      if (months[monthKey]) {
        months[monthKey].expense += e.amount || 0;
      }
    });

    return Object.values(months);
  };

  const monthlyData = getMonthlyData();

  // Current month stats
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

  const currentMonthIncome = regularSavings
    .filter((s) => {
      const sDate = s.date?.toDate ? s.date.toDate() : new Date(s.date);
      return sDate >= monthStart && sDate <= monthEnd;
    })
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  const currentMonthExpense = expenses
    .filter((e) => {
      const eDate = e.date?.toDate ? e.date.toDate() : new Date(e.date);
      return eDate >= monthStart && eDate <= monthEnd;
    })
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const currentMonthBalance = currentMonthIncome - currentMonthExpense;

  // Total all-time
  const totalIncome = regularSavings.reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalExpense = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalBalance = totalIncome - totalExpense;

  // Percentage
  const expensePercentage = totalIncome > 0 ? ((totalExpense / totalIncome) * 100).toFixed(1) : 0;
  const incomePercentage = totalIncome > 0 ? 100 : 0;

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

  const categoryData = Object.keys(categoryEmoji).map((cat) => {
    const catTotal = expenses
      .filter((e) => e.category === cat)
      .reduce((sum, e) => sum + e.amount, 0);
    return {
      name: categoryLabel[cat],
      value: catTotal,
      icon: categoryEmoji[cat],
    };
  }).filter(c => c.value > 0);

  // Person contribution
  const cowoIncome = regularSavings
    .filter((s) => s.role === "cowo")
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  const ceweIncome = regularSavings
    .filter((s) => s.role === "cewe")
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  const personData = [
    { name: "Cowo", value: cowoIncome, icon: "👨" },
    { name: "Cewe", value: ceweIncome, icon: "👩" },
  ];

  const COLORS = ["#3498DB", "#E74C3C"];

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

      <div className="stats-page">
        {/* Header */}
        <div className="stats-header">
          <h1>📊 Statistik Keuangan Berdua</h1>
          <p>Analisis lengkap pemasukan dan pengeluaran</p>
        </div>

        {/* Summary Cards */}
        <div className="summary-cards">
          <div className="summary-card income">
            <div className="card-icon">📥</div>
            <div className="card-info">
              <p className="card-label">Total Pemasukan</p>
              <p className="card-amount">Rp {totalIncome.toLocaleString("id-ID")}</p>
              <p className="card-detail">{regularSavings.length} transaksi</p>
            </div>
          </div>

          <div className="summary-card expense">
            <div className="card-icon">📤</div>
            <div className="card-info">
              <p className="card-label">Total Pengeluaran</p>
              <p className="card-amount">Rp {totalExpense.toLocaleString("id-ID")}</p>
              <p className="card-detail">{expenses.length} transaksi</p>
            </div>
          </div>

          <div className={`summary-card balance ${totalBalance >= 0 ? "positive" : "negative"}`}>
            <div className="card-icon">{totalBalance >= 0 ? "✨" : "⚠️"}</div>
            <div className="card-info">
              <p className="card-label">Balance Keseluruhan</p>
              <p className="card-amount">Rp {Math.abs(totalBalance).toLocaleString("id-ID")}</p>
              <p className="card-detail">{totalBalance >= 0 ? "Surplus" : "Deficit"}</p>
            </div>
          </div>
        </div>

        {/* Monthly Comparison Chart */}
        <div className="chart-section">
          <h2>📈 Perbandingan Pemasukan vs Pengeluaran (12 Bulan Terakhir)</h2>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={350}>
              <BarChart data={monthlyData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value) => `Rp ${value.toLocaleString("id-ID")}`}
                  contentStyle={{ background: "#FFF8F0", border: "1px solid #D4869B" }}
                />
                <Legend />
                <Bar dataKey="income" fill="#27AE60" name="Pemasukan" />
                <Bar dataKey="expense" fill="#E74C3C" name="Pengeluaran" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Current Month Breakdown */}
        <div className="month-section">
          <div className="month-header">
            <h2>📅 Ringkasan Bulan Ini</h2>
            <div className="month-selector">
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

          <div className="month-cards">
            <div className="month-card income">
              <div className="month-icon">📥</div>
              <div className="month-info">
                <p className="month-label">Pemasukan {currentMonth}</p>
                <p className="month-amount">Rp {currentMonthIncome.toLocaleString("id-ID")}</p>
              </div>
            </div>

            <div className="month-card expense">
              <div className="month-icon">📤</div>
              <div className="month-info">
                <p className="month-label">Pengeluaran {currentMonth}</p>
                <p className="month-amount">Rp {currentMonthExpense.toLocaleString("id-ID")}</p>
              </div>
            </div>

            <div className={`month-card balance ${currentMonthBalance >= 0 ? "positive" : "negative"}`}>
              <div className="month-icon">{currentMonthBalance >= 0 ? "✨" : "⚠️"}</div>
              <div className="month-info">
                <p className="month-label">Balance {currentMonth}</p>
                <p className="month-amount">Rp {Math.abs(currentMonthBalance).toLocaleString("id-ID")}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Percentage Analysis */}
        <div className="analysis-section">
          <h2>📊 Analisis Persentase</h2>
          <div className="analysis-grid">
            <div className="analysis-card">
              <div className="analysis-header">
                <span className="analysis-icon">📥</span>
                <span className="analysis-title">Porsi Pemasukan</span>
              </div>
              <div className="analysis-body">
                <div className="percentage-bar">
                  <div className="percentage-fill income" style={{ width: `${incomePercentage}%` }}></div>
                </div>
                <p className="percentage-value">{incomePercentage.toFixed(1)}%</p>
                <p className="percentage-detail">Dari total transaksi finansial</p>
              </div>
            </div>

            <div className="analysis-card">
              <div className="analysis-header">
                <span className="analysis-icon">📤</span>
                <span className="analysis-title">Porsi Pengeluaran</span>
              </div>
              <div className="analysis-body">
                <div className="percentage-bar">
                  <div className="percentage-fill expense" style={{ width: `${expensePercentage}%` }}></div>
                </div>
                <p className="percentage-value">{expensePercentage}%</p>
                <p className="percentage-detail">Dari total pemasukan</p>
              </div>
            </div>

            <div className="analysis-card">
              <div className="analysis-header">
                <span className="analysis-icon">✨</span>
                <span className="analysis-title">Efisiensi Pengeluaran</span>
              </div>
              <div className="analysis-body">
                <div className="percentage-bar">
                  <div className="percentage-fill balance" style={{ width: `${100 - parseFloat(expensePercentage)}%` }}></div>
                </div>
                <p className="percentage-value">{(100 - parseFloat(expensePercentage)).toFixed(1)}%</p>
                <p className="percentage-detail">Sisa untuk tabungan</p>
              </div>
            </div>
          </div>
        </div>

        {/* Pie Charts */}
        <div className="pie-charts-section">
          <div className="pie-chart-container">
            <h3>👥 Kontribusi Pemasukan</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={personData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: Rp ${value.toLocaleString("id-ID")}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {personData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `Rp ${value.toLocaleString("id-ID")}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="pie-chart-container">
            <h3>📁 Breakdown Pengeluaran Kategori</h3>
            {categoryData.length > 0 ? (
              <div className="category-list">
                {categoryData.map((cat, idx) => {
                  const percentage = ((cat.value / totalExpense) * 100).toFixed(1);
                  return (
                    <div key={idx} className="category-breakdown-item">
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
            ) : (
              <p className="empty-state">Belum ada pengeluaran</p>
            )}
          </div>
        </div>

        {/* Key Insights */}
        <div className="insights-section">
          <h2>💡 Insights & Rekomendasi</h2>
          <div className="insights-grid">
            <div className="insight-card">
              <div className="insight-icon">🎯</div>
              <div className="insight-content">
                <p className="insight-title">Saving Rate</p>
                <p className="insight-value">{(100 - parseFloat(expensePercentage)).toFixed(1)}%</p>
                <p className="insight-text">Persentase uang yang berhasil disimpan</p>
              </div>
            </div>

            <div className="insight-card">
              <div className="insight-icon">💰</div>
              <div className="insight-content">
                <p className="insight-title">Rata-rata Bulanan</p>
                <p className="insight-value">Rp {(totalIncome / 12).toLocaleString("id-ID", { maximumFractionDigits: 0 })}</p>
                <p className="insight-text">Rata-rata pemasukan per bulan (12 bulan)</p>
              </div>
            </div>

            <div className="insight-card">
              <div className="insight-icon">📊</div>
              <div className="insight-content">
                <p className="insight-title">Kategori Terbesar</p>
                <p className="insight-value">
                  {categoryData.length > 0 ? categoryData[0].name : "-"}
                </p>
                <p className="insight-text">
                  {categoryData.length > 0 
                    ? `Rp ${categoryData[0].value.toLocaleString("id-ID")}` 
                    : "Belum ada data"}
                </p>
              </div>
            </div>

            <div className="insight-card">
              <div className="insight-icon">👥</div>
              <div className="insight-content">
                <p className="insight-title">Kontributor Utama</p>
                <p className="insight-value">
                  {cowoIncome > ceweIncome ? "👨 Cowo" : "👩 Cewe"}
                </p>
                <p className="insight-text">
                  {cowoIncome > ceweIncome 
                    ? `Rp ${cowoIncome.toLocaleString("id-ID")}` 
                    : `Rp ${ceweIncome.toLocaleString("id-ID")}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}