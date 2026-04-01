import React, { useState, useEffect, useRef } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  deleteDoc,
  doc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  exportSavingsToExcel,
  exportSavingsToWord,
  parseSavingsImportFile,
} from "./reportUtils";
import "./History.css";

export default function History({ user, onNavigate }) {
  const [savings, setSavings] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [activeTab, setActiveTab] = useState("savings");
  const [filterMonth, setFilterMonth] = useState(new Date());
  const [filterPerson, setFilterPerson] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [importingSavings, setImportingSavings] = useState(false);
  const importInputRef = useRef(null);

  // Fetch savings data
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

  // Fetch expenses data
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

  // Filter savings (hanya yang bukan deduction)
  const regularSavings = savings.filter(s => s.role && s.role !== "deduction");

  // Filter by month
  const monthStart = new Date(
    filterMonth.getFullYear(),
    filterMonth.getMonth(),
    1
  );
  const monthEnd = new Date(
    filterMonth.getFullYear(),
    filterMonth.getMonth() + 1,
    0,
    23,
    59,
    59,
    999
  );

  // Filtered savings
  const filteredSavings = regularSavings
    .filter((s) => {
      const sDate = s.date?.toDate ? s.date.toDate() : new Date(s.date);
      return sDate >= monthStart && sDate <= monthEnd;
    })
    .filter((s) => filterPerson === "all" || s.role === filterPerson);

  // Filtered expenses
  const filteredExpenses = expenses
    .filter((e) => {
      const eDate = e.date?.toDate ? e.date.toDate() : new Date(e.date);
      return eDate >= monthStart && eDate <= monthEnd;
    })
    .filter((e) => filterPerson === "all" || e.userRole === filterPerson)
    .filter((e) => filterCategory === "all" || e.category === filterCategory)
    .filter((e) => 
      searchQuery === "" || 
      (e.description || "").toLowerCase().includes(searchQuery.toLowerCase())
    );

  // Calculate totals
  const totalSavings = filteredSavings.reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalExpenses = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const balance = totalSavings - totalExpenses;

  // Per person savings
  const cowoSavings = filteredSavings
    .filter(s => s.role === "cowo")
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  const ceweSavings = filteredSavings
    .filter(s => s.role === "cewe")
    .reduce((sum, s) => sum + (s.amount || 0), 0);

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

  const handleDeleteSaving = async (id) => {
    if (window.confirm("Hapus tabungan ini? Data tidak bisa dikembalikan.")) {
      try {
        await deleteDoc(doc(db, "savings", id));
        alert("Tabungan berhasil dihapus! ✅");
      } catch (error) {
        console.error("Error deleting:", error);
        alert("Gagal menghapus!");
      }
    }
  };

  const handleDeleteExpense = async (id) => {
    if (window.confirm("Hapus pengeluaran ini? Tabungan akan bertambah kembali.")) {
      try {
        await deleteDoc(doc(db, "expenses", id));
        alert("Pengeluaran berhasil dihapus! ✅");
      } catch (error) {
        console.error("Error deleting:", error);
        alert("Gagal menghapus!");
      }
    }
  };

  const currentMonth = filterMonth.toLocaleDateString("id-ID", {
    month: "long",
    year: "numeric",
  });

  const savingsReportSummary = {
    totalTransactions: filteredSavings.length,
    totalAmount: totalSavings,
    cowoAmount: cowoSavings,
    ceweAmount: ceweSavings,
  };

  const buildSavingSignature = (saving) => {
    const savingDate = saving.date?.toDate ? saving.date.toDate() : new Date(saving.date);

    return [
      savingDate.getTime(),
      (saving.userName || "").trim().toLowerCase(),
      saving.role || "",
      Number(saving.amount || 0),
    ].join("|");
  };

  const handleExportSavingsExcel = () => {
    if (!filteredSavings.length) {
      alert(`Belum ada data tabungan untuk bulan ${currentMonth}.`);
      return;
    }

    exportSavingsToExcel({
      savings: filteredSavings,
      monthLabel: currentMonth,
      summary: savingsReportSummary,
    });
  };

  const handleExportSavingsWord = () => {
    if (!filteredSavings.length) {
      alert(`Belum ada data tabungan untuk bulan ${currentMonth}.`);
      return;
    }

    exportSavingsToWord({
      savings: filteredSavings,
      monthLabel: currentMonth,
      summary: savingsReportSummary,
    });
  };

  const handleOpenImportDialog = () => {
    importInputRef.current?.click();
  };

  const handleImportSavings = async (event) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;
    if (!user.groupId) {
      alert("Akun ini belum terhubung ke group pasangan, jadi data belum bisa diimpor.");
      event.target.value = "";
      return;
    }

    setImportingSavings(true);

    try {
      const parsedRows = await parseSavingsImportFile(selectedFile);
      const existingSignatures = new Set(regularSavings.map(buildSavingSignature));
      const rowsToImport = [];
      let duplicateCount = 0;

      parsedRows.forEach((row) => {
        const signature = [
          row.date.getTime(),
          (row.userName || "").trim().toLowerCase(),
          row.role,
          Number(row.amount || 0),
        ].join("|");

        if (existingSignatures.has(signature)) {
          duplicateCount += 1;
          return;
        }

        existingSignatures.add(signature);
        rowsToImport.push(row);
      });

      if (!rowsToImport.length) {
        alert(
          duplicateCount > 0
            ? "Semua data di file ini sudah pernah masuk, jadi tidak ada yang ditambahkan."
            : "Tidak ada data valid yang bisa diimpor."
        );
        return;
      }

      const isConfirmed = window.confirm(
        `Import ${rowsToImport.length} data tabungan ke bulan ${currentMonth}?` +
          (duplicateCount > 0 ? `\n${duplicateCount} data duplikat akan dilewati.` : "")
      );

      if (!isConfirmed) return;

      for (let index = 0; index < rowsToImport.length; index += 400) {
        const batch = writeBatch(db);
        const chunk = rowsToImport.slice(index, index + 400);

        chunk.forEach((row) => {
          const savingRef = doc(collection(db, "savings"));
          batch.set(savingRef, {
            groupId: user.groupId || "default",
            role: row.role,
            userName:
              row.userName || (row.role === "cowo" ? "Import Cowo" : "Import Cewe"),
            userPhoto: user.photo || "",
            userId: user.uid,
            amount: Number(row.amount),
            date: row.date,
            importedAt: new Date(),
            importedBy: user.uid,
            importFileName: selectedFile.name,
          });
        });

        // eslint-disable-next-line no-await-in-loop
        await batch.commit();
      }

      alert(
        `Import berhasil! ${rowsToImport.length} data tabungan ditambahkan.` +
          (duplicateCount > 0 ? ` ${duplicateCount} data duplikat dilewati.` : "")
      );
    } catch (error) {
      console.error("Import savings error:", error);
      alert(`Gagal impor data tabungan: ${error.message}`);
    } finally {
      event.target.value = "";
      setImportingSavings(false);
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

      <div className="history-page">
        {/* Header */}
        <div className="history-header">
          <h1>📋 Riwayat Tabungan & Pengeluaran</h1>
          <p>Kelola dan pantau semua transaksi keuangan berdua</p>
        </div>

        {/* Tabs */}
        <div className="tabs-section">
          <div className="tabs-container">
            <button
              className={`tab-btn ${activeTab === "savings" ? "active" : ""}`}
              onClick={() => setActiveTab("savings")}
            >
              💰 Tabungan
            </button>
            <button
              className={`tab-btn ${activeTab === "expenses" ? "active" : ""}`}
              onClick={() => setActiveTab("expenses")}
            >
              💸 Pengeluaran
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-icon">📥</div>
            <div className="summary-info">
              <p className="summary-label">Total Masuk</p>
              <p className="summary-amount">Rp {totalSavings.toLocaleString("id-ID")}</p>
              <p className="summary-detail">{filteredSavings.length} transaksi</p>
            </div>
          </div>

          <div className="summary-card">
            <div className="summary-icon">📤</div>
            <div className="summary-info">
              <p className="summary-label">Total Keluar</p>
              <p className="summary-amount">Rp {totalExpenses.toLocaleString("id-ID")}</p>
              <p className="summary-detail">{filteredExpenses.length} transaksi</p>
            </div>
          </div>

          <div className={`summary-card ${balance >= 0 ? "positive" : "negative"}`}>
            <div className="summary-icon">{balance >= 0 ? "✨" : "⚠️"}</div>
            <div className="summary-info">
              <p className="summary-label">Balance Bulan Ini</p>
              <p className="summary-amount">Rp {Math.abs(balance).toLocaleString("id-ID")}</p>
              <p className="summary-detail">{balance >= 0 ? "Surplus" : "Deficit"}</p>
            </div>
          </div>
        </div>

        {/* SAVINGS TAB */}
        {activeTab === "savings" && (
          <div className="tab-content">
            {/* Filter Section */}
            <div className="filter-section">
              <div className="filter-group">
                <label>📅 Bulan</label>
                <div className="month-selector">
                  <button
                    onClick={() =>
                      setFilterMonth(
                        new Date(filterMonth.getFullYear(), filterMonth.getMonth() - 1)
                      )
                    }
                    className="month-btn"
                  >
                    ← Lalu
                  </button>
                  <span className="current-month">{currentMonth}</span>
                  <button
                    onClick={() =>
                      setFilterMonth(
                        new Date(filterMonth.getFullYear(), filterMonth.getMonth() + 1)
                      )
                    }
                    className="month-btn"
                  >
                    Depan →
                  </button>
                </div>
              </div>

              <div className="filter-group">
                <label>👤 Filter Person</label>
                <select
                  value={filterPerson}
                  onChange={(e) => setFilterPerson(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">📊 Semua</option>
                  <option value="cowo">👨 Cowo</option>
                  <option value="cewe">👩 Cewe</option>
                </select>
              </div>
            </div>

            {/* Savings Breakdown */}
            <div className="breakdown-section">
              <h3>💰 Breakdown Tabungan {currentMonth}</h3>
              <div className="breakdown-cards">
                <div className="breakdown-card cowo">
                  <div className="breakdown-icon">👨</div>
                  <div className="breakdown-info">
                    <p className="breakdown-label">Kontribusi Cowo</p>
                    <p className="breakdown-amount">Rp {cowoSavings.toLocaleString("id-ID")}</p>
                    <p className="breakdown-detail">{filteredSavings.filter(s => s.role === "cowo").length} transaksi</p>
                  </div>
                </div>

                <div className="breakdown-card cewe">
                  <div className="breakdown-icon">👩</div>
                  <div className="breakdown-info">
                    <p className="breakdown-label">Kontribusi Cewe</p>
                    <p className="breakdown-amount">Rp {ceweSavings.toLocaleString("id-ID")}</p>
                    <p className="breakdown-detail">{filteredSavings.filter(s => s.role === "cewe").length} transaksi</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Savings Table/List */}
            <div className="data-section">
              <div className="data-section-head">
                <div>
                  <h3>📊 Detail Tabungan</h3>
                  <p className="report-note">
                    Export laporan bulan {currentMonth} ke Excel atau Word, lalu import lagi
                    dari file Excel/CSV kalau mau menambah data lebih cepat.
                  </p>
                </div>

                <div className="report-actions">
                  <button
                    type="button"
                    className="report-btn secondary"
                    onClick={handleExportSavingsExcel}
                    disabled={!filteredSavings.length}
                  >
                    Export Excel
                  </button>
                  <button
                    type="button"
                    className="report-btn secondary"
                    onClick={handleExportSavingsWord}
                    disabled={!filteredSavings.length}
                  >
                    Export Word
                  </button>
                  <button
                    type="button"
                    className="report-btn primary"
                    onClick={handleOpenImportDialog}
                    disabled={importingSavings}
                  >
                    {importingSavings ? "Mengimpor..." : "Import Excel/CSV"}
                  </button>
                  <input
                    ref={importInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleImportSavings}
                    hidden
                  />
                </div>
              </div>

              <div className="report-summary">
                <span>{filteredSavings.length} transaksi</span>
                <span>Total Rp {totalSavings.toLocaleString("id-ID")}</span>
                <span>Format import: Tanggal, Nama, Tipe, Jumlah</span>
              </div>
              {filteredSavings.length === 0 ? (
                <p className="empty-state">Tidak ada data tabungan bulan {currentMonth}</p>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>📅 Tanggal & Waktu</th>
                        <th>👤 Nama</th>
                        <th>👨/👩 Tipe</th>
                        <th>💰 Jumlah</th>
                        <th>⚙️ Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSavings.map((saving) => {
                        const savingDate = saving.date?.toDate 
                          ? saving.date.toDate()
                          : new Date(saving.date);
                        const dateStr = savingDate.toLocaleDateString("id-ID", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        });
                        const timeStr = savingDate.toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit"
                        });

                        return (
                          <tr key={saving.id}>
                            <td data-label="Tanggal & Waktu">
                              <div className="datetime-cell">
                                <div className="date">{dateStr}</div>
                                <div className="time">{timeStr}</div>
                              </div>
                            </td>
                            <td data-label="Nama">{saving.userName}</td>
                            <td data-label="Tipe">
                              <span className={`badge ${saving.role}`}>
                                {saving.role === "cowo" ? "👨 Cowok" : "👩 Cewe"}
                              </span>
                            </td>
                            <td data-label="Jumlah" className="amount-cell">
                              <span className="amount positive">+Rp {saving.amount.toLocaleString("id-ID")}</span>
                            </td>
                            <td data-label="Aksi">
                              <button
                                onClick={() => handleDeleteSaving(saving.id)}
                                className="delete-btn"
                                title="Hapus tabungan"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* EXPENSES TAB */}
        {activeTab === "expenses" && (
          <div className="tab-content">
            {/* Filter Section */}
            <div className="filter-section">
              <div className="filter-group">
                <label>📅 Bulan</label>
                <div className="month-selector">
                  <button
                    onClick={() =>
                      setFilterMonth(
                        new Date(filterMonth.getFullYear(), filterMonth.getMonth() - 1)
                      )
                    }
                    className="month-btn"
                  >
                    ← Lalu
                  </button>
                  <span className="current-month">{currentMonth}</span>
                  <button
                    onClick={() =>
                      setFilterMonth(
                        new Date(filterMonth.getFullYear(), filterMonth.getMonth() + 1)
                      )
                    }
                    className="month-btn"
                  >
                    Depan →
                  </button>
                </div>
              </div>

              <div className="filter-group">
                <label>👤 Filter Person</label>
                <select
                  value={filterPerson}
                  onChange={(e) => setFilterPerson(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">📊 Semua</option>
                  <option value="cowo">👨 Cowo</option>
                  <option value="cewe">👩 Cewe</option>
                </select>
              </div>

              <div className="filter-group">
                <label>📁 Kategori</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="filter-select"
                >
                  <option value="all">📊 Semua</option>
                  <option value="makan">🍕 Makan & Minuman</option>
                  <option value="transport">🚗 Transport</option>
                  <option value="hiburan">🎬 Hiburan</option>
                  <option value="belanja">🛍️ Belanja</option>
                  <option value="kesehatan">💊 Kesehatan</option>
                  <option value="utilitas">💡 Utilitas</option>
                  <option value="lainnya">💰 Lainnya</option>
                </select>
              </div>

              <div className="filter-group">
                <label>🔍 Cari Deskripsi</label>
                <input
                  type="text"
                  placeholder="Ketik kata kunci..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
              </div>
            </div>

            {/* Expenses Breakdown */}
            <div className="breakdown-section">
              <h3>💸 Breakdown Pengeluaran {currentMonth}</h3>
              <div className="category-breakdown">
                {Object.keys(categoryEmoji).map((cat) => {
                  const catTotal = filteredExpenses
                    .filter((e) => e.category === cat)
                    .reduce((sum, e) => sum + e.amount, 0);

                  if (catTotal === 0) return null;

                  return (
                    <div key={cat} className="category-item">
                      <div className="category-icon">{categoryEmoji[cat]}</div>
                      <div className="category-info">
                        <p className="category-name">{categoryLabel[cat]}</p>
                        <p className="category-amount">Rp {catTotal.toLocaleString("id-ID")}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Expenses Table/List */}
            <div className="data-section">
              <h3>📊 Detail Pengeluaran</h3>
              {filteredExpenses.length === 0 ? (
                <p className="empty-state">Tidak ada data pengeluaran bulan {currentMonth}</p>
              ) : (
                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>📅 Tanggal & Waktu</th>
                        <th>📝 Deskripsi</th>
                        <th>📁 Kategori</th>
                        <th>👤 Nama</th>
                        <th>💸 Jumlah</th>
                        <th>⚙️ Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredExpenses.map((expense) => {
                        const expenseDate = expense.date?.toDate 
                          ? expense.date.toDate()
                          : new Date(expense.date);
                        const dateStr = expenseDate.toLocaleDateString("id-ID", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric"
                        });
                        const timeStr = expenseDate.toLocaleTimeString("id-ID", {
                          hour: "2-digit",
                          minute: "2-digit"
                        });

                        return (
                          <tr key={expense.id}>
                            <td data-label="Tanggal & Waktu">
                              <div className="datetime-cell">
                                <div className="date">{dateStr}</div>
                                <div className="time">{timeStr}</div>
                              </div>
                            </td>
                            <td data-label="Deskripsi" className="description-cell">{expense.description}</td>
                            <td data-label="Kategori">
                              <span className="category-badge">
                                {categoryEmoji[expense.category]} {categoryLabel[expense.category]}
                              </span>
                            </td>
                            <td data-label="Nama">{expense.userName}</td>
                            <td data-label="Jumlah" className="amount-cell">
                              <span className="amount negative">-Rp {expense.amount.toLocaleString("id-ID")}</span>
                            </td>
                            <td data-label="Aksi">
                              <button
                                onClick={() => handleDeleteExpense(expense.id)}
                                className="delete-btn"
                                title="Hapus pengeluaran"
                              >
                                ✕
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
