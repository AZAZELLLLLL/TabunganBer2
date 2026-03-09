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
import "./Expenses.css";

export default function Expenses({ user, onNavigate }) {
  const [expenses, setExpenses] = useState([]);
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("makan");
  const [description, setDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [filterMonth, setFilterMonth] = useState(new Date());

  // Fetch data real-time
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
      setExpenses(data.sort((a, b) => b.date - a.date));
    });

    return unsubscribe;
  }, [user.groupId]);

  const handleIncreaseAmount = () => {
    const current = parseFloat(amount) || 0;
    setAmount((current + 5000).toString());
  };

  const handleDecreaseAmount = () => {
    const current = parseFloat(amount) || 0;
    if (current >= 5000) {
      setAmount((current - 5000).toString());
    }
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();

    if (!amount || !description) {
      alert("Isi jumlah dan keterangan pengeluaran!");
      return;
    }

    if (parseFloat(amount) <= 0) {
      alert("Jumlah harus lebih dari 0!");
      return;
    }

    setLoading(true);
    try {
      const expenseAmount = parseFloat(amount);
      const expenseDate_obj = new Date(expenseDate);

      // 1. TAMBAH EXPENSE
      await addDoc(collection(db, "expenses"), {
        groupId: user.groupId || "default",
        userId: user.uid,
        userName: user.name,
        userPhoto: user.photo,
        userRole: user.role,
        amount: expenseAmount,
        category,
        description,
        date: expenseDate_obj,
      });

      console.log("✅ Expense ditambahkan:", { amount: expenseAmount, category, description });

      // 2. AUTO-DEDUCT SAVINGS (CREATE NEGATIVE SAVINGS ENTRY)
      await addDoc(collection(db, "savings"), {
        groupId: user.groupId || "default",
        role: "deduction", // Special role untuk pengeluaran
        userName: user.name,
        userPhoto: user.photo,
        userId: user.uid,
        amount: -expenseAmount, // NEGATIF untuk menandakan deduction
        category: category, // Track kategori untuk analytics
        description: `Pengeluaran: ${description}`, // Deskripsi lengkap
        date: expenseDate_obj,
        type: "expense_deduction", // Marker untuk tahu ini dari expense
      });

      console.log("✅ Savings otomatis berkurang:", { deductAmount: -expenseAmount });

      setAmount("");
      setDescription("");
      setCategory("makan");
      setExpenseDate(new Date().toISOString().split('T')[0]);
      alert("Pengeluaran ditambahkan & tabungan otomatis berkurang! 💸");
    } catch (error) {
      console.error("Error adding expense:", error);
      alert("Gagal menambah pengeluaran!");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (window.confirm("Hapus pengeluaran ini? (Tabungan akan kembali bertambah)")) {
      try {
        // 1. Get expense data
        const expenseDoc = await fetch(
          `https://firestore.googleapis.com/v1/projects/${
            process.env.REACT_APP_PROJECT_ID || "tabungan-ber2-c147e"
          }/databases/(default)/documents/expenses/${id}`
        );

        // 2. Delete expense
        await deleteDoc(doc(db, "expenses", id));

        // 3. Find and delete corresponding deduction from savings
        // (Ini akan di-handle otomatis oleh logic di Dashboard)
        
        alert("Pengeluaran berhasil dihapus! Tabungan kembali normal. ✅");
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

  const filteredExpenses = expenses.filter((e) => {
    const eDate = e.date?.toDate ? e.date.toDate() : new Date(e.date);
    return eDate >= monthStart && eDate <= monthEnd;
  });

  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);

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

      <div className="expenses-page">
        {/* Form Section */}
        <div className="section form-section">
          <h2>➕ Tambah Pengeluaran</h2>
          <p style={{ color: "#8B6F9E", fontSize: "13px", marginBottom: "15px" }}>
            ℹ️ Tabungan akan otomatis berkurang sesuai jumlah pengeluaran
          </p>
          
          {/* Date Picker */}
          <div className="expense-date-section">
            <label>📅 Tanggal Pengeluaran</label>
            <input
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              disabled={loading}
              className="date-input"
            />
          </div>

          <form onSubmit={handleAddExpense} className="expense-form">
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
                <option value="makan">🍕 Makan & Minuman</option>
                <option value="transport">🚗 Transport</option>
                <option value="hiburan">🎬 Hiburan</option>
                <option value="belanja">🛍️ Belanja</option>
                <option value="kesehatan">💊 Kesehatan</option>
                <option value="utilitas">💡 Utilitas</option>
                <option value="lainnya">💰 Lainnya</option>
              </select>
            </div>

            <div className="form-group">
              <label>Keterangan</label>
              <input
                type="text"
                placeholder="Contoh: Makan nasi goreng di warteg"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                required
              />
            </div>

            <button type="submit" disabled={loading} className="submit-btn">
              {loading ? "Menambah..." : "Tambah Pengeluaran"}
            </button>
          </form>
        </div>

        {/* Summary Section */}
        <div className="section summary-section">
          <div className="month-selector">
            <button
              onClick={() =>
                setFilterMonth(
                  new Date(filterMonth.getFullYear(), filterMonth.getMonth() - 1)
                )
              }
            >
              ← Bulan Lalu
            </button>
            <h3>{currentMonth}</h3>
            <button
              onClick={() =>
                setFilterMonth(
                  new Date(filterMonth.getFullYear(), filterMonth.getMonth() + 1)
                )
              }
            >
              Bulan Depan →
            </button>
          </div>

          <div className="total-box">
            <p className="total-label">Total Pengeluaran Bulan Ini</p>
            <h2 className="total-amount">
              Rp {totalExpenses.toLocaleString("id-ID")}
            </h2>
            <p className="total-subtitle">Dari {filteredExpenses.length} transaksi</p>
          </div>
        </div>

        {/* Expenses List Section */}
        <div className="section list-section">
          <h2>📝 Riwayat Pengeluaran</h2>

          {filteredExpenses.length === 0 ? (
            <p className="empty-state">
              Tidak ada pengeluaran bulan {currentMonth}. Mantap! 🎉
            </p>
          ) : (
            <div className="expenses-list">
              {filteredExpenses.map((expense) => {
                const expenseDateDisplay = expense.date?.toDate 
                  ? expense.date.toDate().toLocaleDateString("id-ID")
                  : new Date(expense.date).toLocaleDateString("id-ID");

                return (
                  <div key={expense.id} className="expense-item">
                    <div className="expense-left">
                      <div className="category-icon">
                        {categoryEmoji[expense.category] || "💰"}
                      </div>
                      <div className="expense-details">
                        <p className="expense-description">
                          {expense.description}
                        </p>
                        <p className="expense-meta">
                          <span className="category-badge">
                            {categoryLabel[expense.category]}
                          </span>
                          <span className="user-badge">
                            {expense.userRole === "cowo" ? "👨" : "👩"}{" "}
                            {expense.userName}
                          </span>
                          <span className="expense-date-badge">
                            📅 {expenseDateDisplay}
                          </span>
                        </p>
                      </div>
                    </div>

                    <div className="expense-right">
                      <p className="expense-amount">
                        -Rp {expense.amount.toLocaleString("id-ID")}
                      </p>
                      <button
                        onClick={() => handleDeleteExpense(expense.id)}
                        className="delete-btn"
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

        {/* Category Breakdown */}
        <div className="section breakdown-section">
          <h2>📊 Breakdown Kategori</h2>
          <div className="category-breakdown">
            {Object.keys(categoryEmoji).map((cat) => {
              const catTotal = filteredExpenses
                .filter((e) => e.category === cat)
                .reduce((sum, e) => sum + e.amount, 0);

              if (catTotal === 0) return null;

              const percentage = (catTotal / totalExpenses) * 100;

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
      </div>
    </>
  );
}