import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  collection,
  query,
  where,
  getDocs,
  updateDoc,
  doc,
  onSnapshot,
} from "firebase/firestore";
import { db } from "./firebase";
import "./QRGenerator.css";

export default function QRGenerator({ user, onBack }) {
  const [qrValue, setQrValue] = useState(null);
  const [groupId, setGroupId] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [approvedViewers, setApprovedViewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!user?.groupId) {
      setError("Group tidak ditemukan. Pastikan akun owner sudah punya group.");
      setLoading(false);
      return;
    }

    const groupsRef = collection(db, "groups");
    const q = query(groupsRef, where("groupId", "==", user.groupId));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        if (snapshot.empty) {
          setError("Data group tidak ditemukan di Firestore.");
          setLoading(false);
          return;
        }

        const groupDoc = snapshot.docs[0];
        const groupData = groupDoc.data();

        setGroupId(groupData.groupId);
        setQrValue(`yubul://group/${groupData.groupId}`);

        const allRequests = groupData.pendingApprovals || [];
        setPendingRequests(allRequests.filter((r) => r.status !== "approved"));
        setApprovedViewers(allRequests.filter((r) => r.status === "approved"));

        setError(null);
        setLoading(false);
      },
      (err) => {
        console.error("Snapshot error:", err);
        setError("Error memuat data: " + err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user?.groupId]);

  const handleAccept = async (index) => {
    try {
      const groupsRef = collection(db, "groups");
      const q = query(groupsRef, where("groupId", "==", groupId));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return;

      const groupDoc = snapshot.docs[0];
      const groupData = groupDoc.data();

      const updated = groupData.pendingApprovals.map((req, i) =>
        i === index ? { ...req, status: "approved" } : req
      );

      await updateDoc(doc(db, "groups", groupDoc.id), {
        pendingApprovals: updated,
      });

      await updateDoc(doc(db, "users", pendingRequests[index].uid), {
        approvalStatus: "approved",
      });

      alert("✅ Viewer berhasil di-approve!");
    } catch (err) {
      console.error("Accept error:", err);
      alert("Error: " + err.message);
    }
  };

  const handleReject = async (index) => {
    try {
      const groupsRef = collection(db, "groups");
      const q = query(groupsRef, where("groupId", "==", groupId));
      const snapshot = await getDocs(q);
      if (snapshot.empty) return;

      const groupDoc = snapshot.docs[0];
      const groupData = groupDoc.data();

      const updated = groupData.pendingApprovals.map((req, i) =>
        i === index ? { ...req, status: "rejected" } : req
      );

      await updateDoc(doc(db, "groups", groupDoc.id), {
        pendingApprovals: updated,
      });

      await updateDoc(doc(db, "users", pendingRequests[index].uid), {
        approvalStatus: "rejected",
      });

      alert("❌ Viewer ditolak.");
    } catch (err) {
      console.error("Reject error:", err);
      alert("Error: " + err.message);
    }
  };

  // ─── LOADING ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="qr-generator-page">
        <div className="qr-header">
          <button onClick={onBack} className="btn-back">← Back</button>
          <h1>🔐 Generate QR Code</h1>
          <div />
        </div>
        <div className="qr-section">
          <div className="loading-container">
            <div className="spinner" />
            <p className="loading-text">Memuat data...</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── ERROR ───────────────────────────────────────────────────
  if (error) {
    return (
      <div className="qr-generator-page">
        <div className="qr-header">
          <button onClick={onBack} className="btn-back">← Back</button>
          <h1>🔐 Generate QR Code</h1>
          <div />
        </div>
        <div className="qr-section">
          <div className="error-state">
            <p className="error-title">❌ {error}</p>
            <p className="error-hint">Coba refresh halaman atau hubungi developer.</p>
          </div>
        </div>
      </div>
    );
  }

  // ─── MAIN ─────────────────────────────────────────────────────
  return (
    <div className="qr-generator-page">

      {/* HEADER */}
      <div className="qr-header">
        <button onClick={onBack} className="btn-back">← Back</button>
        <h1>🔐 Generate QR Code</h1>
        <div />
      </div>

      {/* QR CODE */}
      <div className="qr-section">
        <div className="section-header">
          <h2>📱 QR Code Pasangan</h2>
          <p className="section-description">
            Tunjukkan QR ini ke pasanganmu untuk bergabung ke aplikasi.
          </p>
        </div>

        {qrValue ? (
          <div className="qr-display-container">
            <div className="qr-display">
              <QRCodeSVG
                value={qrValue}
                size={220}
                level="H"
                includeMargin={true}
              />
            </div>
            <div className="group-id-badge">
              <p className="group-id-label">Group ID</p>
              <p className="group-id-value">{groupId}</p>
            </div>
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-icon">❌</span>
            <p className="empty-text">QR tidak tersedia</p>
          </div>
        )}
      </div>

      {/* PENDING REQUESTS */}
      <div className="qr-section">
        <div className="section-header">
          <h2>
            ⏳ Permintaan Masuk
            {pendingRequests.length > 0 && (
              <span className="pending-count-badge">{pendingRequests.length}</span>
            )}
          </h2>
        </div>

        {pendingRequests.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📋</span>
            <p className="empty-text">Belum ada permintaan masuk</p>
          </div>
        ) : (
          <div className="requests-container">
            {pendingRequests.map((request, index) => (
              <div key={index} className="request-card">
                <div className="request-header">
                  <img
                    src={request.photo || "https://via.placeholder.com/50"}
                    alt={request.name}
                    className="viewer-photo"
                  />
                  <div className="viewer-info">
                    <p className="viewer-name">
                      {request.name}{" "}
                      {request.gender === "cowo" ? "👨" : "👩"}
                    </p>
                    <p className="viewer-email">{request.email}</p>
                  </div>
                </div>

                {request.deviceInfo && (
                  <div className="device-info-section">
                    <p className="device-info-title">📱 Info Device:</p>
                    <p className="device-specs"><b>Type:</b> {request.deviceInfo.deviceType}</p>
                    <p className="device-specs"><b>OS:</b> {request.deviceInfo.deviceOS}</p>
                    <p className="device-specs"><b>Browser:</b> {request.deviceInfo.deviceBrowser}</p>
                  </div>
                )}

                <div className="request-actions">
                  <button onClick={() => handleAccept(index)} className="btn-accept">
                    ✅ Terima
                  </button>
                  <button onClick={() => handleReject(index)} className="btn-reject">
                    ❌ Tolak
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* APPROVED VIEWERS */}
      {approvedViewers.length > 0 && (
        <div className="qr-section">
          <div className="section-header">
            <h2>✅ Sudah Bergabung ({approvedViewers.length})</h2>
          </div>
          <div className="approved-container">
            {approvedViewers.map((viewer, index) => (
              <div key={index} className="approved-card">
                <img
                  src={viewer.photo || "https://via.placeholder.com/40"}
                  alt={viewer.name}
                  className="viewer-photo"
                />
                <div className="viewer-info">
                  <p className="viewer-name">
                    {viewer.name}{" "}
                    {viewer.gender === "cowo" ? "👨" : "👩"}
                  </p>
                  <p className="viewer-email">{viewer.email}</p>
                </div>
                <span className="approved-badge">✅ Approved</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}