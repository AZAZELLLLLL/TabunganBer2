import React, { useState, useEffect } from "react";
import {
  collection,
  addDoc,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import "./Dashboard.css";

export default function Dashboard({ user, onLogout, onNavigate }) {
  const [savings, setSavings] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [cowoAmount, setCowoAmount] = useState("");
  const [ceweAmount, setCeweAmount] = useState("");
  const [savingDate, setSavingDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

  // Debug: Log user data
  useEffect(() => {
    console.log("Current user:", user);
    console.log("GroupId:", user?.groupId);
  }, [user]);

  // Fetch data real-time
  useEffect(() => {
    const groupId = user.groupId || "default";
    console.log("Fetching data for groupId:", groupId);

    // Fetch Savings (include deductions)
    const savingsQuery = query(
      collection(db, "savings"),
      where("groupId", "==", groupId)
    );

    const unsubscribeSavings = onSnapshot(
      savingsQuery,
      (snapshot) => {
        console.log("Savings snapshot:", snapshot.docs.length);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSavings(data.sort((a, b) => b.date - a.date));
      },
      (error) => {
        console.error("Savings fetch error:", error);
      }
    );

    // Fetch Expenses
    const expensesQuery = query(
      collection(db, "expenses"),
      where("groupId", "==", groupId)
    );

    const unsubscribeExpenses = onSnapshot(
      expensesQuery,
      (snapshot) => {
        console.log("Expenses snapshot:", snapshot.docs.length);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setExpenses(data);
      },
      (error) => {
        console.error("Expenses fetch error:", error);
      }
    );

    // Fetch Income
    const incomeQuery = query(
      collection(db, "income"),
      where("groupId", "==", groupId)
    );

    const unsubscribeIncome = onSnapshot(
      incomeQuery,
      (snapshot) => {
        console.log("Income snapshot:", snapshot.docs.length);
        const data = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setIncome(data);
      },
      (error) => {
        console.error("Income fetch error:", error);
      }
    );

    return () => {
      unsubscribeSavings();
      unsubscribeExpenses();
      unsubscribeIncome();
    };
  }, [user.groupId]);

  const handleAddSavings = async (e, role) => {
    e.preventDefault();
    const amount = role === "cowo" ? cowoAmount : ceweAmount;

    console.log("Adding savings:", { role, amount, savingDate, user });

    if (!amount || parseFloat(amount) <= 0) {
      alert("Isi jumlah uang yang valid!");
      return;
    }

    setLoading(true);
    try {
      const docData = {
        groupId: user.groupId || "default",
        role,
        userName: user.name,
        userPhoto: user.photo,
        userId: user.uid,
        amount: parseFloat(amount),
        date: new Date(savingDate),
      };

      console.log("Document data to save:", docData);

      const docRef = await addDoc(collection(db, "savings"), docData);
      console.log("Document written with ID:", docRef.id);

      if (role === "cowo") {
        setCowoAmount("");
      } else {
        setCeweAmount("");
      }
      alert("Tabungan berhasil ditambahkan! 💕");
    } catch (error) {
      console.error("Error adding savings:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      alert(`Gagal menambah tabungan! ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBothSavings = async () => {
    console.log("Adding both savings:", { cowoAmount, ceweAmount, savingDate, user });

    if (!cowoAmount || !ceweAmount) {
      alert("Isi jumlah tabungan kedua-duanya!");
      return;
    }

    if (parseFloat(cowoAmount) <= 0 || parseFloat(ceweAmount) <= 0) {
      alert("Jumlah harus lebih dari 0!");
      return;
    }

    setLoading(true);
    try {
      // Tambah Cowo
      const cowoData = {
        groupId: user.groupId || "default",
        role: "cowo",
        userName: user.name,
        userPhoto: user.photo,
        userId: user.uid,
        amount: parseFloat(cowoAmount),
        date: new Date(savingDate),
      };

      console.log("Adding Cowo:", cowoData);
      const cowoRef = await addDoc(collection(db, "savings"), cowoData);
      console.log("Cowo document ID:", cowoRef.id);

      // Tambah Cewe
      const ceweData = {
        groupId: user.groupId || "default",
        role: "cewe",
        userName: user.name,
        userPhoto: user.photo,
        userId: user.uid,
        amount: parseFloat(ceweAmount),
        date: new Date(savingDate),
      };

      console.log("Adding Cewe:", ceweData);
      const ceweRef = await addDoc(collection(db, "savings"), ceweData);
      console.log("Cewe document ID:", ceweRef.id);

      setCowoAmount("");
      setCeweAmount("");
      alert("Tabungan keduanya berhasil ditambahkan! 💕💕");
    } catch (error) {
      console.error("Error adding savings:", error);
      console.error("Error code:", error.code);
      console.error("Error message:", error.message);
      alert(`Gagal menambah tabungan! ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals - INCLUDE DEDUCTIONS (negative amounts)
  const totalSavings = savings.reduce((sum, s) => sum + (s.amount || 0), 0);
  
  // Filter only regular savings (not deductions)
  const regularSavings = savings.filter(s => s.role && s.role !== "deduction");
  const cowoSavings = regularSavings
    .filter((s) => s.role === "cowo")
    .reduce((sum, s) => sum + (s.amount || 0), 0);
  const ceweSavings = regularSavings
    .filter((s) => s.role === "cewe")
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  // Calculate deductions this month
  const now = new Date();
  const monthStart = new Date(
    now.getFullYear(),
    now.getMonth(),
    1
  );
  const monthEnd = new Date(
    now.getFullYear(),
    now.getMonth() + 1,
    0
  );

  const currentMonthDeductions = savings
    .filter((s) => s.role === "deduction")
    .filter((s) => {
      const sDate = s.date?.toDate ? s.date.toDate() : new Date(s.date);
      return sDate >= monthStart && sDate <= monthEnd;
    })
    .reduce((sum, s) => sum + Math.abs(s.amount || 0), 0);

  const currentMonthExpenses = expenses
    .filter((e) => {
      const eDate = e.date?.toDate ? e.date.toDate() : new Date(e.date);
      return eDate >= monthStart && eDate <= monthEnd;
    })
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const currentMonthIncome = income
    .filter((i) => {
      const iDate = i.date?.toDate ? i.date.toDate() : new Date(i.date);
      return iDate >= monthStart && iDate <= monthEnd;
    })
    .reduce((sum, i) => sum + (i.amount || 0), 0);

  const monthlyBalance = currentMonthIncome - currentMonthExpenses;

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

      <div className="dashboard-content" style={{ paddingTop: "20px" }}>
        <div className="container">
          {/* Summary Cards */}
          <div className="summary-grid">
            <div className="summary-card total">
              <p className="card-label">💑 Total Tabungan Berdua</p>
              <h2>Rp {totalSavings.toLocaleString("id-ID")}</h2>
              <p className="card-subtitle">Dari {regularSavings.length} transaksi (net deductions)</p>
            </div>

            <div className="summary-card cowo">
              <p className="card-label">👨 Tabungan Cowo</p>
              <h3>Rp {cowoSavings.toLocaleString("id-ID")}</h3>
            </div>

            <div className="summary-card cewe">
              <p className="card-label">👩 Tabungan Cewe</p>
              <h3>Rp {ceweSavings.toLocaleString("id-ID")}</h3>
            </div>

            <div className="summary-card balance">
              <p className="card-label">💹 Balance Bulan Ini</p>
              <h3 className={monthlyBalance >= 0 ? "positive" : "negative"}>
                Rp {Math.abs(monthlyBalance).toLocaleString("id-ID")}
              </h3>
              <small>{monthlyBalance >= 0 ? "Surplus 📈" : "Deficit 📉"}</small>
            </div>
          </div>

          {/* Month Summary Info */}
          <div className="section" style={{ background: "linear-gradient(135deg, #FFE8F1 0%, #F0E6FF 100%)", borderLeft: "5px solid #D4869B" }}>
            <h3>📊 Ringkasan Bulan Ini</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "15px" }}>
              <div>
                <p style={{ color: "#8B6F9E", fontSize: "12px", marginBottom: "5px" }}>📥 Pemasukan</p>
                <h4 style={{ color: "#27AE60", margin: "0" }}>Rp {currentMonthIncome.toLocaleString("id-ID")}</h4>
              </div>
              <div>
                <p style={{ color: "#8B6F9E", fontSize: "12px", marginBottom: "5px" }}>📤 Pengeluaran</p>
                <h4 style={{ color: "#E74C3C", margin: "0" }}>Rp {currentMonthExpenses.toLocaleString("id-ID")}</h4>
              </div>
              <div>
                <p style={{ color: "#8B6F9E", fontSize: "12px", marginBottom: "5px" }}>💰 Deductions dari Tabungan</p>
                <h4 style={{ color: "#E74C3C", margin: "0" }}>Rp {currentMonthDeductions.toLocaleString("id-ID")}</h4>
              </div>
            </div>
          </div>

          {/* Add Savings Section */}
          <div className="section add-savings-section">
            <h3>➕ Tambah Tabungan Berdua</h3>
            
            {/* Date Picker */}
            <div className="savings-date-section">
              <label>📅 Tanggal Menabung</label>
              <input
                type="date"
                value={savingDate}
                onChange={(e) => setSavingDate(e.target.value)}
                disabled={loading}
                className="date-input"
              />
            </div>

            <div className="savings-form-grid">
              {/* Cowo Form */}
              <div className="savings-form">
                <h4>👨 Tabungan Cowo</h4>
                <form
                  onSubmit={(e) => handleAddSavings(e, "cowo")}
                  className="form"
                >
                  <input
                    type="number"
                    placeholder="Jumlah (Rp)"
                    value={cowoAmount}
                    onChange={(e) => {
                      let val = parseInt(e.target.value) || 0;
                      if (val < 0) val = 0;
                      setCowoAmount(val);
                    }}
                    step="5000"
                    min="0"
                    disabled={loading}
                    required
                  />
                  <button type="submit" disabled={loading} className="form-btn">
                    {loading ? "Menambah..." : "Tambah Cowo"}
                  </button>
                </form>
              </div>

              {/* Cewe Form */}
              <div className="savings-form">
                <h4>👩 Tabungan Cewe</h4>
                <form
                  onSubmit={(e) => handleAddSavings(e, "cewe")}
                  className="form"
                >
                  <input
                    type="number"
                    placeholder="Jumlah (Rp)"
                    value={ceweAmount}
                    onChange={(e) => {
                      let val = parseInt(e.target.value) || 0;
                      if (val < 0) val = 0;
                      setCeweAmount(val);
                    }}
                    step="5000"
                    min="0"
                    disabled={loading}
                    required
                  />
                  <button type="submit" disabled={loading} className="form-btn">
                    {loading ? "Menambah..." : "Tambah Cewe"}
                  </button>
                </form>
              </div>
            </div>

            {/* Tambah Keduanya Button */}
            <div className="savings-both-section">
              <button
                onClick={handleAddBothSavings}
                disabled={loading || !cowoAmount || !ceweAmount}
                className="submit-both-btn"
              >
                💕 Tambah Keduanya
              </button>
            </div>
          </div>

          {/* Recent Savings & Deductions */}
          <div className="section recent-savings">
            <h3>📝 Riwayat Tabungan Terbaru</h3>
            {savings.length === 0 ? (
              <p className="empty-state">
                Belum ada tabungan. Mulai simpan uang berdua! 💕
              </p>
            ) : (
              <div className="savings-list">
                {savings.slice(0, 10).map((saving) => {
                  const savingDateDisplay = saving.date?.toDate 
                    ? saving.date.toDate().toLocaleDateString("id-ID")
                    : new Date(saving.date).toLocaleDateString("id-ID");
                  
                  const isDeduction = saving.role === "deduction";
                  const displayAmount = isDeduction 
                    ? `Rp ${Math.abs(saving.amount).toLocaleString("id-ID")}` 
                    : `Rp ${saving.amount.toLocaleString("id-ID")}`;

                  return (
                    <div key={saving.id} className="savings-item" style={{
                      borderLeftColor: isDeduction ? "#E74C3C" : "#D4869B",
                      background: isDeduction ? "#FFE8E8" : "#FFF8F0"
                    }}>
                      <div className="saving-info">
                        <div className="saving-avatar" style={{
                          background: isDeduction ? "rgba(231, 76, 60, 0.1)" : "rgba(212, 134, 155, 0.1)"
                        }}>
                          {isDeduction ? "💸" : (saving.role === "cowo" ? "👨" : "👩")}
                        </div>
                        <div className="saving-details">
                          <p className="saving-name">
                            {isDeduction ? "Pengeluaran" : saving.userName}
                          </p>
                          <p className="saving-role">
                            {isDeduction ? saving.description : (saving.role === "cowo" ? "Cowok" : "Cewe")}
                          </p>
                          <p className="saving-date">{savingDateDisplay}</p>
                        </div>
                      </div>
                      <div className="saving-amount" style={{
                        color: isDeduction ? "#E74C3C" : "#27AE60"
                      }}>
                        {isDeduction ? "-" : "+"}{displayAmount}
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