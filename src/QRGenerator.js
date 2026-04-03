import React, { useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { collection, doc, onSnapshot, query, updateDoc, where } from "firebase/firestore";
import { db } from "./firebase";
import { ensureOwnerGroup } from "./groupUtils";
import "./QRGenerator.css";

export default function QRGenerator({ user, onBack }) {
  const [groupData, setGroupData] = useState(null);
  const [groupId, setGroupId] = useState(null);
  const [qrValue, setQrValue] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [approvedViewers, setApprovedViewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copyState, setCopyState] = useState("");

  useEffect(() => {
    let unsubscribe = () => {};
    let isMounted = true;

    const init = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!user?.isOwner) {
          throw new Error("Halaman QR hanya bisa diakses owner.");
        }

        const ensuredGroup = await ensureOwnerGroup(user);
        const targetGroupId = ensuredGroup?.groupId || user?.groupId;

        if (!targetGroupId) {
          throw new Error("Group owner belum berhasil dibuat.");
        }

        const groupQuery = query(
          collection(db, "groups"),
          where("groupId", "==", targetGroupId)
        );

        unsubscribe = onSnapshot(
          groupQuery,
          (snapshot) => {
            if (!isMounted) return;

            if (snapshot.empty) {
              setError("Data group tidak ditemukan di Firestore.");
              setLoading(false);
              return;
            }

            const groupDoc = snapshot.docs[0];
            const nextGroupData = groupDoc.data();
            const approvalList = nextGroupData.pendingApprovals || [];

            setGroupData({
              id: groupDoc.id,
              ...nextGroupData,
            });
            setGroupId(nextGroupData.groupId);
            setQrValue(nextGroupData.qrCodeData || `yubul://group/${nextGroupData.groupId}`);
            setPendingRequests(approvalList.filter((request) => request.status === "pending"));
            setApprovedViewers(approvalList.filter((request) => request.status === "approved"));
            setError(null);
            setLoading(false);
          },
          (snapshotError) => {
            console.error("QR snapshot error:", snapshotError);
            setError("Error memuat data: " + snapshotError.message);
            setLoading(false);
          }
        );
      } catch (initError) {
        console.error("QR init error:", initError);
        if (isMounted) {
          setError(initError.message || "Gagal menyiapkan QR code.");
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [user]);

  const handleAccept = async (request) => {
    try {
      if (!groupData?.id) {
        throw new Error("Data group belum siap.");
      }

      const updatedApprovals = (groupData.pendingApprovals || []).map((item) =>
        item.uid === request.uid ? { ...item, status: "approved" } : item
      );
      const members = Array.from(new Set([...(groupData.members || []), request.uid]));

      await updateDoc(doc(db, "groups", groupData.id), {
        pendingApprovals: updatedApprovals,
        members,
        memberCount: members.length,
        isPaired: members.length > 1,
        updatedAt: new Date(),
      });

      await updateDoc(doc(db, "users", request.uid), {
        approvalStatus: "approved",
        approvalApprovedAt: new Date(),
        updatedAt: new Date(),
      });

      alert(`Request dari ${request.name} berhasil di-approve.`);
    } catch (acceptError) {
      console.error("Accept error:", acceptError);
      alert(`Gagal approve viewer: ${acceptError.message}`);
    }
  };

  const handleReject = async (request) => {
    try {
      if (!groupData?.id) {
        throw new Error("Data group belum siap.");
      }

      const updatedApprovals = (groupData.pendingApprovals || []).map((item) =>
        item.uid === request.uid ? { ...item, status: "rejected" } : item
      );

      await updateDoc(doc(db, "groups", groupData.id), {
        pendingApprovals: updatedApprovals,
        updatedAt: new Date(),
      });

      await updateDoc(doc(db, "users", request.uid), {
        approvalStatus: "rejected",
        updatedAt: new Date(),
      });

      alert(`Request dari ${request.name} berhasil ditolak.`);
    } catch (rejectError) {
      console.error("Reject error:", rejectError);
      alert(`Gagal menolak viewer: ${rejectError.message}`);
    }
  };

  const handleCopyText = async (value, successMessage) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState(successMessage);
      window.setTimeout(() => setCopyState(""), 1800);
    } catch (copyError) {
      console.error("Copy QR data error:", copyError);
      alert("Teks belum bisa disalin. Coba copy manual ya.");
    }
  };

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
            <p className="loading-text">Menyiapkan QR code owner...</p>
          </div>
        </div>
      </div>
    );
  }

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
            <p className="error-hint">
              Coba refresh halaman. Kalau masih gagal, login ulang owner supaya group dibuat ulang.
            </p>
            <button className="btn-copy secondary" onClick={() => window.location.reload()}>
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="qr-generator-page">
      <div className="qr-header">
        <button onClick={onBack} className="btn-back">← Back</button>
        <h1>🔐 Generate QR Code</h1>
        <div />
      </div>

      <div className="qr-section">
        <div className="section-header">
          <h2>📱 QR Code Pasangan</h2>
          <p className="section-description">
            Scan QR ini dari device partner untuk mengirim request akses.
          </p>
        </div>

        {qrValue ? (
          <div className="qr-display-container">
            <div className="qr-display">
              <QRCodeCanvas value={qrValue} size={220} level="H" includeMargin />
            </div>
            <div className="group-id-badge">
              <p className="group-id-label">Group ID</p>
              <p className="group-id-value">{groupId}</p>
            </div>
            <div className="qr-share-actions">
              <button
                className="btn-copy"
                onClick={() => handleCopyText(groupId, "Group ID berhasil disalin")}
              >
                Copy Group ID
              </button>
              <button
                className="btn-copy secondary"
                onClick={() => handleCopyText(qrValue, "Link pairing berhasil disalin")}
              >
                Copy Link Pairing
              </button>
            </div>
            <p className="qr-manual-note">
              Kalau QR lagi susah terbaca di HP pasangan, cukup kirim <strong>Group ID</strong> ini
              lalu pasangan bisa masuk manual tanpa scan.
            </p>
            {copyState ? <p className="qr-copy-feedback">{copyState}</p> : null}
          </div>
        ) : (
          <div className="empty-state">
            <span className="empty-icon">❌</span>
            <p className="empty-text">QR tidak tersedia</p>
          </div>
        )}
      </div>

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
            {pendingRequests.map((request) => (
              <div key={request.uid} className="request-card">
                <div className="request-header">
                  <img
                    src={request.photo || "https://via.placeholder.com/50"}
                    alt={request.name}
                    className="viewer-photo"
                  />
                  <div className="viewer-info">
                    <p className="viewer-name">
                      {request.name} {request.gender === "cowo" ? "👨" : "👩"}
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
                  <button onClick={() => handleAccept(request)} className="btn-accept">
                    ✅ Terima
                  </button>
                  <button onClick={() => handleReject(request)} className="btn-reject">
                    ❌ Tolak
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {approvedViewers.length > 0 && (
        <div className="qr-section">
          <div className="section-header">
            <h2>✅ Sudah Bergabung ({approvedViewers.length})</h2>
          </div>
          <div className="approved-container">
            {approvedViewers.map((viewer) => (
              <div key={viewer.uid} className="approved-card">
                <img
                  src={viewer.photo || "https://via.placeholder.com/40"}
                  alt={viewer.name}
                  className="viewer-photo"
                />
                <div className="viewer-info">
                  <p className="viewer-name">
                    {viewer.name} {viewer.gender === "cowo" ? "👨" : "👩"}
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
