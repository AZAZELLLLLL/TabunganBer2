import React, { useEffect, useState } from "react";
import {
  addDoc,
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
  useCoupleProfiles,
} from "./coupleProfileUtils";
import "./Expenses.css";

export default function Expenses({ user, onNavigate }) {
  const [expenses, setExpenses] = useState([]);
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("makan");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);
  const [filterCategory, setFilterCategory] = useState("semua");
  const [searchDescription, setSearchDescription] = useState("");
  const coupleProfiles = useCoupleProfiles(user.groupId);

  useEffect(() => {
    const groupId = user.groupId || "default";
    const expensesQuery = query(
      collection(db, "expenses"),
      where("groupId", "==", groupId)
    );

    const unsubscribe = onSnapshot(
      expensesQuery,
      (snapshot) => {
        const data = snapshot.docs.map((entry) => ({
          id: entry.id,
          ...entry.data(),
        }));
        setExpenses(data.sort((first, second) => second.date - first.date));
      },
      (error) => {
        console.error("Error fetching expenses:", error);
      }
    );

    return unsubscribe;
  }, [user.groupId]);

  const handleAddExpense = async (event) => {
    event.preventDefault();

    if (!expenseAmount || parseFloat(expenseAmount) <= 0) {
      alert("Masukkan jumlah pengeluaran yang valid!");
      return;
    }

    if (!expenseDescription.trim()) {
      alert("Masukkan deskripsi pengeluaran!");
      return;
    }

    setLoading(true);
    try {
      const actorProfile = getDisplayProfileForRecord(coupleProfiles, {
        userId: user.uid,
        role: user.gender,
        userName: user.name,
        userPhoto: user.photo,
      });

      await addDoc(collection(db, "expenses"), {
        groupId: user.groupId || "default",
        userId: user.uid,
        userName: actorProfile.name,
        userPhoto: actorProfile.photo || user.photo,
        userRole: actorProfile.role || user.gender || "cowo",
        amount: parseFloat(expenseAmount),
        category: expenseCategory,
        description: expenseDescription,
        date: new Date(expenseDate),
      });

      await addDoc(collection(db, "savings"), {
        groupId: user.groupId || "default",
        role: "deduction",
        amount: -parseFloat(expenseAmount),
        type: "expense_deduction",
        description: `Pengeluaran: ${expenseDescription}`,
        date: new Date(expenseDate),
      });

      setExpenseAmount("");
      setExpenseDescription("");
      setExpenseCategory("makan");
      setExpenseDate(new Date().toISOString().split("T")[0]);
      alert("Pengeluaran berhasil ditambahkan!");
    } catch (error) {
      console.error("Error adding expense:", error);
      alert(`Gagal menambah pengeluaran! ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (id) => {
    if (window.confirm("Hapus pengeluaran ini?")) {
      try {
        await deleteDoc(doc(db, "expenses", id));
        alert("Pengeluaran berhasil dihapus!");
      } catch (error) {
        console.error("Error deleting expense:", error);
        alert("Gagal menghapus pengeluaran!");
      }
    }
  };

  const filteredExpenses = expenses
    .filter((expense) => filterCategory === "semua" || expense.category === filterCategory)
    .filter((expense) =>
      expense.description.toLowerCase().includes(searchDescription.toLowerCase())
    );

  const categories = {
    makan: { label: "Makan & Minuman", icon: "🍕", color: "#FF6B6B" },
    transport: { label: "Transport", icon: "🚗", color: "#4ECDC4" },
    hiburan: { label: "Hiburan", icon: "🎬", color: "#FFE66D" },
    belanja: { label: "Belanja", icon: "🛍️", color: "#A8E6CF" },
    kesehatan: { label: "Kesehatan", icon: "💊", color: "#FF8B94" },
    utilitas: { label: "Utilitas", icon: "💡", color: "#C7CEEA" },
    lainnya: { label: "Lainnya", icon: "💰", color: "#B19CD9" },
  };

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
          transition: "all 0.3s ease",
        }}
        onMouseEnter={(event) => {
          event.target.style.transform = "translateY(-2px)";
          event.target.style.boxShadow = "0 8px 20px rgba(212, 134, 155, 0.3)";
        }}
        onMouseLeave={(event) => {
          event.target.style.transform = "translateY(0)";
          event.target.style.boxShadow = "none";
        }}
      >
        ← Kembali
      </button>

      <div className="expenses-page">
        <div className="container">
          <div className="expenses-header">
            <h1>Kelola Pengeluaran</h1>
            <p>Catat setiap pengeluaran kalian</p>
          </div>

          <div className="section add-expense-section">
            <h2>Tambah Pengeluaran</h2>

            <div className="form-group">
              <label>Tanggal Pengeluaran</label>
              <input
                type="date"
                value={expenseDate}
                onChange={(event) => setExpenseDate(event.target.value)}
                className="date-input"
              />
            </div>

            <form onSubmit={handleAddExpense} className="expense-form">
              <div className="form-group">
                <label>Jumlah Pengeluaran (Rp)</label>
                <input
                  type="number"
                  placeholder="0"
                  value={expenseAmount}
                  onChange={(event) => setExpenseAmount(event.target.value)}
                  min="0"
                  disabled={loading}
                  required
                />
              </div>

              <div className="form-group">
                <label>Kategori</label>
                <select
                  value={expenseCategory}
                  onChange={(event) => setExpenseCategory(event.target.value)}
                  disabled={loading}
                  required
                >
                  {Object.entries(categories).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.icon} {value.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Keterangan</label>
                <input
                  type="text"
                  placeholder="Contoh: Makan di restoran..."
                  value={expenseDescription}
                  onChange={(event) => setExpenseDescription(event.target.value)}
                  disabled={loading}
                  required
                />
              </div>

              <button type="submit" disabled={loading} className="submit-btn">
                {loading ? "Menambah..." : "Tambah Pengeluaran"}
              </button>
            </form>
          </div>

          <div className="section filter-section">
            <h2>Filter</h2>

            <div className="filter-controls">
              <div className="filter-group">
                <label>Kategori</label>
                <select
                  value={filterCategory}
                  onChange={(event) => setFilterCategory(event.target.value)}
                  className="filter-select"
                >
                  <option value="semua">Semua Kategori</option>
                  {Object.entries(categories).map(([key, value]) => (
                    <option key={key} value={key}>
                      {value.icon} {value.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-group">
                <label>Cari Keterangan</label>
                <input
                  type="text"
                  placeholder="Cari..."
                  value={searchDescription}
                  onChange={(event) => setSearchDescription(event.target.value)}
                  className="filter-input"
                />
              </div>
            </div>
          </div>

          <div className="section expenses-list-section">
            <h2>Riwayat Pengeluaran ({filteredExpenses.length})</h2>

            {filteredExpenses.length === 0 ? (
              <p className="empty-state">
                {expenses.length === 0
                  ? "Belum ada pengeluaran. Mulai catat!"
                  : "Tidak ada pengeluaran yang sesuai filter."}
              </p>
            ) : (
              <div className="expenses-list">
                {filteredExpenses.map((expense) => {
                  const expenseDateDisplay = expense.date?.toDate
                    ? expense.date.toDate().toLocaleDateString("id-ID")
                    : new Date(expense.date).toLocaleDateString("id-ID");
                  const categoryInfo = categories[expense.category];
                  const displayProfile = getDisplayProfileForRecord(coupleProfiles, expense);
                  const roleLabel =
                    displayProfile.role === "cewe"
                      ? "Cewe"
                      : displayProfile.role === "cowo"
                        ? "Cowo"
                        : "Pengguna";

                  return (
                    <div
                      key={expense.id}
                      className="expense-item"
                      style={{ borderLeftColor: categoryInfo?.color || "#E74C3C" }}
                    >
                      <div className="expense-info">
                        <div className="expense-category">
                          {(categoryInfo?.icon || "💰")} {categoryInfo?.label || expense.category}
                        </div>
                        <p className="expense-description">{expense.description}</p>
                        <div className="expense-meta">
                          <span className="expense-date">{expenseDateDisplay}</span>
                          <span className="expense-user">
                            {roleLabel} {displayProfile.name}
                          </span>
                        </div>
                      </div>

                      <div className="expense-amount">
                        <p className="amount">
                          -Rp {expense.amount.toLocaleString("id-ID")}
                        </p>
                        <button
                          onClick={() => handleDeleteExpense(expense.id)}
                          className="delete-btn"
                          title="Hapus"
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
