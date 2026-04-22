import React, { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";
import {
  getProfileForRole,
  useCoupleProfiles,
} from "./coupleProfileUtils";
import "./Loans.css";

function toDateObject(value) {
  if (!value) return null;
  if (value?.toDate) return value.toDate();

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDate(value) {
  const date = toDateObject(value);
  if (!date) return "-";

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function Loans({ user, onNavigate }) {
  const [loans, setLoans] = useState([]);
  const [amount, setAmount] = useState("");
  const [borrowerRole, setBorrowerRole] = useState(user.gender || "cowo");
  const [loanDate, setLoanDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const coupleProfiles = useCoupleProfiles(user.groupId);
  const cowoProfile = getProfileForRole(coupleProfiles, "cowo");
  const ceweProfile = getProfileForRole(coupleProfiles, "cewe");
  const canEdit = Boolean(user.isOwner);

  useEffect(() => {
    const groupId = user.groupId || "default";
    const loansQuery = query(collection(db, "loans"), where("groupId", "==", groupId));

    return onSnapshot(
      loansQuery,
      (snapshot) => {
        const nextLoans = snapshot.docs
          .map((entry) => ({
            id: entry.id,
            ...entry.data(),
          }))
          .sort((first, second) => {
            const secondDate = toDateObject(second.loanDate)?.getTime() || 0;
            const firstDate = toDateObject(first.loanDate)?.getTime() || 0;
            return secondDate - firstDate;
          });
        setLoans(nextLoans);
      },
      (error) => {
        console.error("Loans listener error:", error);
      }
    );
  }, [user.groupId]);

  const activeLoans = useMemo(
    () => loans.filter((loan) => loan.status !== "paid"),
    [loans]
  );
  const paidLoans = useMemo(
    () => loans.filter((loan) => loan.status === "paid"),
    [loans]
  );
  const activeAmount = activeLoans.reduce((sum, loan) => sum + Number(loan.amount || 0), 0);
  const paidAmount = paidLoans.reduce((sum, loan) => sum + Number(loan.amount || 0), 0);

  const handleAddLoan = async (event) => {
    event.preventDefault();

    if (!canEdit) {
      alert("Viewer hanya bisa melihat data pinjaman.");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      alert("Masukkan jumlah pinjaman yang valid.");
      return;
    }

    if (!loanDate || !dueDate) {
      alert("Tanggal pinjam dan tanggal pelunasan wajib diisi.");
      return;
    }

    setLoading(true);

    try {
      const borrowerProfile = getProfileForRole(coupleProfiles, borrowerRole);

      await addDoc(collection(db, "loans"), {
        groupId: user.groupId || "default",
        borrowerRole,
        borrowerName: borrowerProfile.name,
        borrowerUid: borrowerProfile.uid || null,
        amount: Number(amount),
        loanDate: new Date(loanDate),
        dueDate: new Date(dueDate),
        note: note.trim(),
        status: "active",
        createdAt: new Date(),
        createdBy: user.uid,
        createdByName: user.name,
        updatedAt: new Date(),
      });

      setAmount("");
      setBorrowerRole(user.gender || "cowo");
      setLoanDate(new Date().toISOString().split("T")[0]);
      setDueDate("");
      setNote("");
      alert("Data pinjaman berhasil ditambahkan.");
    } catch (error) {
      console.error("Add loan error:", error);
      alert(`Gagal menambah pinjaman: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsPaid = async (loan) => {
    if (!canEdit) {
      alert("Viewer hanya bisa melihat data pinjaman.");
      return;
    }

    if (!window.confirm(`Tandai pinjaman ${loan.borrowerName} sebagai lunas?`)) {
      return;
    }

    try {
      await updateDoc(doc(db, "loans", loan.id), {
        status: "paid",
        paidAt: new Date(),
        updatedAt: new Date(),
      });
      alert("Pinjaman berhasil ditandai lunas.");
    } catch (error) {
      console.error("Mark loan paid error:", error);
      alert(`Gagal menandai lunas: ${error.message}`);
    }
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
      >
        ← Kembali
      </button>

      <div className="loans-page">
        <div className="loans-container">
          <div className="loans-header">
            <h1>Pinjaman</h1>
            <p>Catat siapa yang pinjam, kapan jatuh tempo, dan kapan sudah lunas.</p>
          </div>

          <div className="loans-summary-grid">
            <div className="loans-summary-card active">
              <span className="loans-summary-label">Pinjaman aktif</span>
              <strong className="loans-summary-value">{activeLoans.length} data</strong>
              <small>Rp {activeAmount.toLocaleString("id-ID")}</small>
            </div>
            <div className="loans-summary-card due">
              <span className="loans-summary-label">Yang sedang dipinjam</span>
              <strong className="loans-summary-value">Rp {activeAmount.toLocaleString("id-ID")}</strong>
              <small>Total nominal belum lunas</small>
            </div>
            <div className="loans-summary-card paid">
              <span className="loans-summary-label">Sudah lunas</span>
              <strong className="loans-summary-value">{paidLoans.length} data</strong>
              <small>Rp {paidAmount.toLocaleString("id-ID")}</small>
            </div>
          </div>

          <div className="loans-layout">
            <section className="loans-form-card">
              <div className="loans-section-head">
                <h2>Input Pinjaman</h2>
                <p>
                  {canEdit
                    ? "Owner bisa menambah data pinjaman dan menandai pelunasan."
                    : "Viewer bisa melihat data pinjaman, tetapi tidak bisa mengubahnya."}
                </p>
              </div>

              <form className="loans-form" onSubmit={handleAddLoan}>
                <div className="loans-form-group">
                  <label>Siapa yang pinjam</label>
                  <div className="loans-role-grid">
                    <button
                      type="button"
                      className={`loans-role-btn ${borrowerRole === "cowo" ? "active cowo" : ""}`}
                      onClick={() => setBorrowerRole("cowo")}
                      disabled={!canEdit || loading}
                    >
                      {cowoProfile.name}
                    </button>
                    <button
                      type="button"
                      className={`loans-role-btn ${borrowerRole === "cewe" ? "active cewe" : ""}`}
                      onClick={() => setBorrowerRole("cewe")}
                      disabled={!canEdit || loading}
                    >
                      {ceweProfile.name}
                    </button>
                  </div>
                </div>

                <div className="loans-form-group">
                  <label>Total uang yang dipinjam</label>
                  <input
                    type="number"
                    min="0"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="Contoh: 150000"
                    disabled={!canEdit || loading}
                  />
                </div>

                <div className="loans-form-row">
                  <div className="loans-form-group">
                    <label>Tanggal pinjam</label>
                    <input
                      type="date"
                      value={loanDate}
                      onChange={(event) => setLoanDate(event.target.value)}
                      disabled={!canEdit || loading}
                    />
                  </div>
                  <div className="loans-form-group">
                    <label>Tanggal pelunasan</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(event) => setDueDate(event.target.value)}
                      disabled={!canEdit || loading}
                    />
                  </div>
                </div>

                <div className="loans-form-group">
                  <label>Detail tambahan</label>
                  <textarea
                    rows="4"
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    placeholder="Contoh: Dipakai untuk keperluan keluarga, belanja mendadak, dan lain-lain"
                    disabled={!canEdit || loading}
                  />
                </div>

                <button
                  type="submit"
                  className="loans-submit-btn"
                  disabled={!canEdit || loading}
                >
                  {loading ? "Menyimpan..." : "Simpan Pinjaman"}
                </button>
              </form>
            </section>

            <section className="loans-list-card">
              <div className="loans-section-head">
                <h2>Daftar Pinjaman</h2>
                <p>{loans.length} data pinjaman tercatat di group ini.</p>
              </div>

              {loans.length === 0 ? (
                <p className="loans-empty-state">Belum ada data pinjaman.</p>
              ) : (
                <div className="loans-list">
                  {loans.map((loan) => {
                    const isPaid = loan.status === "paid";
                    const borrowerProfile = getProfileForRole(coupleProfiles, loan.borrowerRole);

                    return (
                      <article
                        key={loan.id}
                        className={`loan-item ${isPaid ? "paid" : "active"}`}
                      >
                        <div className="loan-item-top">
                          <div>
                            <span className={`loan-status-badge ${isPaid ? "paid" : "active"}`}>
                              {isPaid ? "Lunas" : "Aktif"}
                            </span>
                            <h3>{borrowerProfile.name}</h3>
                            <p className="loan-note">
                              {loan.note || "Tidak ada keterangan tambahan."}
                            </p>
                          </div>
                          <strong className="loan-amount">
                            Rp {Number(loan.amount || 0).toLocaleString("id-ID")}
                          </strong>
                        </div>

                        <div className="loan-meta-grid">
                          <div>
                            <span className="loan-meta-label">Tanggal pinjam</span>
                            <strong>{formatDate(loan.loanDate)}</strong>
                          </div>
                          <div>
                            <span className="loan-meta-label">Target pelunasan</span>
                            <strong>{formatDate(loan.dueDate)}</strong>
                          </div>
                          <div>
                            <span className="loan-meta-label">Dicatat oleh</span>
                            <strong>{loan.createdByName || user.name}</strong>
                          </div>
                          <div>
                            <span className="loan-meta-label">Status akhir</span>
                            <strong>{isPaid ? formatDate(loan.paidAt) : "Belum lunas"}</strong>
                          </div>
                        </div>

                        {!isPaid && canEdit && (
                          <div className="loan-actions">
                            <button
                              type="button"
                              className="loan-paid-btn"
                              onClick={() => handleMarkAsPaid(loan)}
                            >
                              Tandai Lunas
                            </button>
                          </div>
                        )}
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </div>
      </div>
    </>
  );
}
