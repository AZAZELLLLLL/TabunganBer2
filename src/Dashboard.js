import React, { useEffect, useState } from "react";
import {
  addDoc,
  collection,
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
import "./Dashboard.css";

const REPORT_MONTH_STORAGE_KEY = "historyReportMonth";

function toDateObject(value) {
  if (!value) return null;
  if (value?.toDate) return value.toDate();

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatMonthStorageValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatDateLabel(value) {
  const date = toDateObject(value);
  if (!date) return "-";

  return date.toLocaleDateString("id-ID");
}

function isDateWithinMonth(date, monthStart, monthEnd) {
  const parsed = toDateObject(date);
  return Boolean(parsed && parsed >= monthStart && parsed <= monthEnd);
}

export default function Dashboard({ user, onNavigate }) {
  const [savings, setSavings] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [income, setIncome] = useState([]);
  const [cowoAmount, setCowoAmount] = useState("");
  const [ceweAmount, setCeweAmount] = useState("");
  const [savingDate, setSavingDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [loading, setLoading] = useState(false);
  const coupleProfiles = useCoupleProfiles(user.groupId);
  const cowoProfile = getProfileForRole(coupleProfiles, "cowo");
  const ceweProfile = getProfileForRole(coupleProfiles, "cewe");

  useEffect(() => {
    console.log("Current user:", user);
    console.log("GroupId:", user?.groupId);
  }, [user]);

  useEffect(() => {
    const groupId = user.groupId || "default";
    console.log("Fetching data for groupId:", groupId);

    const savingsQuery = query(
      collection(db, "savings"),
      where("groupId", "==", groupId)
    );

    const unsubscribeSavings = onSnapshot(
      savingsQuery,
      (snapshot) => {
        console.log("Savings snapshot:", snapshot.docs.length);
        const data = snapshot.docs
          .map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          .sort((first, second) => {
            const secondDate = toDateObject(second.date)?.getTime() || 0;
            const firstDate = toDateObject(first.date)?.getTime() || 0;
            return secondDate - firstDate;
          });
        setSavings(data);
      },
      (error) => {
        console.error("Savings fetch error:", error);
      }
    );

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

  const handleAddSavings = async (event, role) => {
    event.preventDefault();
    const amount = role === "cowo" ? cowoAmount : ceweAmount;
    const roleProfile = getProfileForRole(coupleProfiles, role);

    if (!amount || parseFloat(amount) <= 0) {
      alert("Isi jumlah uang yang valid!");
      return;
    }

    setLoading(true);
    try {
      const docData = {
        groupId: user.groupId || "default",
        role,
        userName: roleProfile.name,
        userPhoto: roleProfile.photo || user.photo,
        userId: roleProfile.uid || user.uid,
        amount: parseFloat(amount),
        date: new Date(savingDate),
        inputByUserId: user.uid,
        inputByName: user.name,
      };

      await addDoc(collection(db, "savings"), docData);

      if (role === "cowo") {
        setCowoAmount("");
      } else {
        setCeweAmount("");
      }

      alert("Tabungan berhasil ditambahkan!");
    } catch (error) {
      console.error("Error adding savings:", error);
      alert(`Gagal menambah tabungan! ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleAddBothSavings = async () => {
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
      await addDoc(collection(db, "savings"), {
        groupId: user.groupId || "default",
        role: "cowo",
        userName: cowoProfile.name,
        userPhoto: cowoProfile.photo || user.photo,
        userId: cowoProfile.uid || user.uid,
        amount: parseFloat(cowoAmount),
        date: new Date(savingDate),
        inputByUserId: user.uid,
        inputByName: user.name,
      });

      await addDoc(collection(db, "savings"), {
        groupId: user.groupId || "default",
        role: "cewe",
        userName: ceweProfile.name,
        userPhoto: ceweProfile.photo || user.photo,
        userId: ceweProfile.uid || user.uid,
        amount: parseFloat(ceweAmount),
        date: new Date(savingDate),
        inputByUserId: user.uid,
        inputByName: user.name,
      });

      setCowoAmount("");
      setCeweAmount("");
      alert("Tabungan keduanya berhasil ditambahkan!");
    } catch (error) {
      console.error("Error adding savings:", error);
      alert(`Gagal menambah tabungan! ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const totalSavings = savings.reduce((sum, saving) => sum + (saving.amount || 0), 0);
  const regularSavings = savings.filter(
    (saving) => saving.role && saving.role !== "deduction"
  );

  const cowoSavings = regularSavings
    .filter((saving) => saving.role === "cowo")
    .reduce((sum, saving) => sum + (saving.amount || 0), 0);

  const ceweSavings = regularSavings
    .filter((saving) => saving.role === "cewe")
    .reduce((sum, saving) => sum + (saving.amount || 0), 0);

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const currentMonthSavings = regularSavings.filter((saving) =>
    isDateWithinMonth(saving.date, monthStart, monthEnd)
  );

  const currentMonthSavingsTotal = currentMonthSavings.reduce(
    (sum, saving) => sum + (saving.amount || 0),
    0
  );

  const currentMonthCowoSavings = currentMonthSavings
    .filter((saving) => saving.role === "cowo")
    .reduce((sum, saving) => sum + (saving.amount || 0), 0);

  const currentMonthCeweSavings = currentMonthSavings
    .filter((saving) => saving.role === "cewe")
    .reduce((sum, saving) => sum + (saving.amount || 0), 0);

  const currentMonthSavingDays = new Set(
    currentMonthSavings
      .map((saving) => {
        const savingDateValue = toDateObject(saving.date);
        if (!savingDateValue) return "";

        return `${savingDateValue.getFullYear()}-${String(
          savingDateValue.getMonth() + 1
        ).padStart(2, "0")}-${String(savingDateValue.getDate()).padStart(2, "0")}`;
      })
      .filter(Boolean)
  ).size;

  const currentMonthExpenses = expenses
    .filter((expense) => isDateWithinMonth(expense.date, monthStart, monthEnd))
    .reduce((sum, expense) => sum + (expense.amount || 0), 0);

  const currentMonthIncome = income
    .filter((entry) => isDateWithinMonth(entry.date, monthStart, monthEnd))
    .reduce((sum, entry) => sum + (entry.amount || 0), 0);

  const monthlyBalance = currentMonthIncome - currentMonthExpenses;

  const currentMonthLabel = now.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  const previousMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const previousMonthLabel = previousMonthDate.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  const handleOpenMonthlyReport = (date) => {
    try {
      window.localStorage.setItem(
        REPORT_MONTH_STORAGE_KEY,
        formatMonthStorageValue(date)
      );
    } catch (error) {
      console.error("Gagal menyimpan bulan laporan:", error);
    }

    onNavigate("income");
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
        Kembali
      </button>

      <div className="dashboard-content" style={{ paddingTop: "20px" }}>
        <div className="container">
          <div className="summary-grid">
            <div className="summary-card total">
              <p className="card-label">Total Tabungan Berdua</p>
              <h2>Rp {totalSavings.toLocaleString("id-ID")}</h2>
              <p className="card-subtitle">
                Dari {regularSavings.length} transaksi tabungan
              </p>
            </div>

            <div className="summary-card cowo">
              <p className="card-label">Tabungan {cowoProfile.name}</p>
              <h3>Rp {cowoSavings.toLocaleString("id-ID")}</h3>
            </div>

            <div className="summary-card cewe">
              <p className="card-label">Tabungan {ceweProfile.name}</p>
              <h3>Rp {ceweSavings.toLocaleString("id-ID")}</h3>
            </div>

            <div className="summary-card balance">
              <p className="card-label">Balance Bulan Ini</p>
              <h3 className={monthlyBalance >= 0 ? "positive" : "negative"}>
                Rp {Math.abs(monthlyBalance).toLocaleString("id-ID")}
              </h3>
              <small>{monthlyBalance >= 0 ? "Surplus" : "Deficit"}</small>
            </div>
          </div>

          <div
            className="section month-summary-section"
            style={{
              background: "linear-gradient(135deg, #FFE8F1 0%, #F0E6FF 100%)",
              borderLeft: "5px solid #D4869B",
            }}
          >
            <h3>Ringkasan Tabungan Bulan Ini</h3>
            <p className="month-summary-lead">
              Bagian ini sekarang diambil dari rangkuman tabungan bulanan, bukan dari potongan
              deduction lama.
            </p>

            <div className="month-summary-grid">
              <div className="month-summary-card primary">
                <p className="month-summary-label">Tabungan {currentMonthLabel}</p>
                <h4 className="month-summary-value positive">
                  Rp {currentMonthSavingsTotal.toLocaleString("id-ID")}
                </h4>
                <small className="month-summary-meta">
                  {currentMonthSavings.length} transaksi | {currentMonthSavingDays} hari menabung
                </small>
              </div>

              <div className="month-summary-card">
                <p className="month-summary-label">Kontribusi {cowoProfile.name} Bulan Ini</p>
                <h4 className="month-summary-value">
                  Rp {currentMonthCowoSavings.toLocaleString("id-ID")}
                </h4>
                <small className="month-summary-meta">Bagian tabungan {cowoProfile.name.toLowerCase()} bulan ini</small>
              </div>

              <div className="month-summary-card">
                <p className="month-summary-label">Kontribusi {ceweProfile.name} Bulan Ini</p>
                <h4 className="month-summary-value">
                  Rp {currentMonthCeweSavings.toLocaleString("id-ID")}
                </h4>
                <small className="month-summary-meta">Bagian tabungan {ceweProfile.name.toLowerCase()} bulan ini</small>
              </div>

              <div className="month-summary-card report-card">
                <p className="month-summary-label">Cek Laporan Bulanan</p>
                <div className="month-report-actions">
                  <button
                    type="button"
                    className="month-report-btn primary"
                    onClick={() =>
                      handleOpenMonthlyReport(
                        new Date(now.getFullYear(), now.getMonth(), 1)
                      )
                    }
                  >
                    Laporan Bulan Ini
                  </button>
                  <button
                    type="button"
                    className="month-report-btn secondary"
                    onClick={() => handleOpenMonthlyReport(previousMonthDate)}
                  >
                    {previousMonthLabel}
                  </button>
                </div>
                <small className="month-summary-meta">
                  Buka detail tabungan dan export laporan bulan ini atau sebelumnya.
                </small>
              </div>
            </div>
          </div>

          <div className="section add-savings-section">
            <h3>Tambah Tabungan Berdua</h3>

            <div className="savings-date-section">
              <label>Tanggal Menabung</label>
              <input
                type="date"
                value={savingDate}
                onChange={(event) => setSavingDate(event.target.value)}
                disabled={loading}
                className="date-input"
              />
            </div>

            <div className="savings-form-grid">
              <div className="savings-form">
                <h4>Tabungan {cowoProfile.name}</h4>
                <form onSubmit={(event) => handleAddSavings(event, "cowo")} className="form">
                  <input
                    type="number"
                    placeholder="Jumlah (Rp)"
                    value={cowoAmount}
                    onChange={(event) => {
                      let value = parseInt(event.target.value, 10) || 0;
                      if (value < 0) value = 0;
                      setCowoAmount(value);
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

              <div className="savings-form">
                <h4>Tabungan {ceweProfile.name}</h4>
                <form onSubmit={(event) => handleAddSavings(event, "cewe")} className="form">
                  <input
                    type="number"
                    placeholder="Jumlah (Rp)"
                    value={ceweAmount}
                    onChange={(event) => {
                      let value = parseInt(event.target.value, 10) || 0;
                      if (value < 0) value = 0;
                      setCeweAmount(value);
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

            <div className="savings-both-section">
              <button
                onClick={handleAddBothSavings}
                disabled={loading || !cowoAmount || !ceweAmount}
                className="submit-both-btn"
              >
                Tambah Keduanya
              </button>
            </div>
          </div>

          <div className="section recent-savings">
            <h3>Riwayat Tabungan Terbaru</h3>
            {savings.length === 0 ? (
              <p className="empty-state">Belum ada tabungan. Mulai simpan uang berdua!</p>
            ) : (
              <div className="savings-list">
                {savings.slice(0, 10).map((saving) => {
                  const isDeduction = saving.role === "deduction";
                  const displayAmount = `Rp ${Math.abs(
                    saving.amount || 0
                  ).toLocaleString("id-ID")}`;
                  const displayProfile = getDisplayProfileForRecord(coupleProfiles, saving);

                  return (
                    <div
                      key={saving.id}
                      className="savings-item"
                      style={{
                        borderLeftColor: isDeduction ? "#E74C3C" : "#D4869B",
                        background: isDeduction ? "#FFE8E8" : "#FFF8F0",
                      }}
                    >
                      <div className="saving-info">
                        <div
                          className="saving-avatar"
                          style={{
                            background: isDeduction
                              ? "rgba(231, 76, 60, 0.1)"
                              : "rgba(212, 134, 155, 0.1)",
                          }}
                        >
                          {isDeduction ? "Rp" : saving.role === "cowo" ? "C" : "W"}
                        </div>
                        <div className="saving-details">
                          <p className="saving-name">
                            {isDeduction ? "Pengeluaran dari tabungan" : displayProfile.name}
                          </p>
                          <p className="saving-role">
                            {isDeduction
                              ? saving.description || "Pengurangan saldo tabungan"
                              : saving.role === "cowo"
                                ? "Cowok"
                                : "Cewe"}
                          </p>
                          <p className="saving-date">{formatDateLabel(saving.date)}</p>
                        </div>
                      </div>
                      <div
                        className="saving-amount"
                        style={{
                          color: isDeduction ? "#E74C3C" : "#27AE60",
                        }}
                      >
                        {isDeduction ? "-" : "+"}
                        {displayAmount}
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
