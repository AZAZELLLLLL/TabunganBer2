import React, { useEffect, useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { QRCodeCanvas } from "qrcode.react";
import { subscribeToGroupByGroupId } from "./approvalUtils";
import { db } from "./firebase";
import "./PairingVerification.css";

function buildNextApprovals(approvalList = [], viewerUid, nextStatus, actorUid) {
  const timestampField =
    nextStatus === "approved" ? "approvedAt" : "rejectedAt";
  const actorField = nextStatus === "approved" ? "approvedBy" : "rejectedBy";

  return approvalList.map((request) =>
    request.uid === viewerUid
      ? {
          ...request,
          status: nextStatus,
          [timestampField]: new Date(),
          [actorField]: actorUid,
        }
      : request
  );
}

export default function PairingVerification({ user, onBack }) {
  const [groupData, setGroupData] = useState(null);
  const [qrValue, setQrValue] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  useEffect(() => {
    let unsubscribe = () => {};

    setLoading(true);
    unsubscribe = subscribeToGroupByGroupId(
      user.groupId,
      (nextGroupData) => {
        if (!nextGroupData) {
          setGroupData(null);
          setPendingRequests([]);
          setLoading(false);
          return;
        }

        const nextApprovals = Array.isArray(nextGroupData.pendingApprovals)
          ? nextGroupData.pendingApprovals
          : [];

        setGroupData(nextGroupData);
        setQrValue(
          nextGroupData.qrCodeData || `yubul://group/${nextGroupData.groupId}`
        );
        setPendingRequests(
          nextApprovals.filter((request) => request.status === "pending")
        );
        setLoading(false);
      },
      (error) => {
        console.error("Error loading pairing data:", error);
        alert("Error loading pairing data!");
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user.groupId]);

  const syncGroupState = async (nextApprovals, nextMembers) => {
    if (!groupData?.id) {
      throw new Error("Data group belum siap.");
    }

    await updateDoc(doc(db, "groups", groupData.id), {
      pendingApprovals: nextApprovals,
      members: nextMembers,
      memberCount: nextMembers.length,
      isPaired: nextMembers.length > 1,
      updatedAt: new Date(),
    });
  };

  const handleApprove = async (viewerUid, viewerName) => {
    setActionLoading(`accept-${viewerUid}`);

    try {
      const updatedPending = buildNextApprovals(
        groupData?.pendingApprovals || [],
        viewerUid,
        "approved",
        user.uid
      );
      const members = Array.from(
        new Set([...(groupData?.members || []), viewerUid])
      );

      await syncGroupState(updatedPending, members);
      alert(`${viewerName} approved! They can now access the app.`);
    } catch (error) {
      console.error("Error approving:", error);
      alert(`Error approving ${viewerName}!`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (viewerUid, viewerName) => {
    setActionLoading(`reject-${viewerUid}`);

    try {
      const updatedPending = buildNextApprovals(
        groupData?.pendingApprovals || [],
        viewerUid,
        "rejected",
        user.uid
      );

      await syncGroupState(updatedPending, groupData?.members || []);
      alert(`${viewerName} rejected.`);
    } catch (error) {
      console.error("Error rejecting:", error);
      alert(`Error rejecting ${viewerName}!`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCopyQRText = async () => {
    try {
      await navigator.clipboard.writeText(qrValue);
      alert("QR code data copied to clipboard!");
    } catch (error) {
      console.error("Error copying:", error);
      alert("Failed to copy!");
    }
  };

  const handleDownloadQR = () => {
    const canvas = document.querySelector(".pairing-qr-canvas canvas");
    if (!canvas) return;

    const url = canvas.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = `pairing-qr-${user.groupId}.png`;
    link.click();
    alert("QR code downloaded!");
  };

  if (loading) {
    return (
      <div className="pairing-verification-page">
        <div className="verification-container">
          <div className="loading-spinner">
            <p>Loading pairing data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!groupData) {
    return (
      <div className="pairing-verification-page">
        <div className="verification-container">
          <div className="error-message">
            <p>Group data not found!</p>
            <button onClick={onBack} className="btn-back">
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pairing-verification-page">
      <div className="verification-container">
        <div className="verification-header">
          <button onClick={onBack} className="btn-back-icon">
            Back
          </button>
          <h1>Verifikasi Pairing</h1>
          <div className="spacer"></div>
        </div>

        <div className="verification-section qr-section">
          <h2>Share QR Code</h2>
          <p className="section-description">
            Share QR code ini ke partner untuk scan dan request akses
          </p>

          <div className="pairing-qr-canvas">
            {qrValue && (
              <QRCodeCanvas value={qrValue} size={240} level="H" includeMargin={true} />
            )}
          </div>

          <div className="qr-actions">
            <button onClick={handleCopyQRText} className="btn-secondary">
              Copy QR Data
            </button>
            <button onClick={handleDownloadQR} className="btn-secondary">
              Download QR
            </button>
          </div>
        </div>

        <div className="verification-section approvals-section">
          <h2>Pending Requests ({pendingRequests.length})</h2>
          <p className="section-description">Orang-orang yang minta akses:</p>

          {pendingRequests.length === 0 ? (
            <div className="empty-state">
              <p>Tidak ada permintaan akses</p>
              <small>Tunggu partner scan QR code kamu</small>
            </div>
          ) : (
            <div className="approvals-list">
              {pendingRequests.map((request) => (
                <div key={request.uid} className="approval-item">
                  <div className="approval-info">
                    <img src={request.photo} alt={request.name} />
                    <div className="approval-details">
                      <p className="approval-name">{request.name}</p>
                      <small className="approval-email">{request.email}</small>
                      <small className="approval-time">
                        Requested {formatTime(request.scannedAt)}
                      </small>
                    </div>
                  </div>

                  <div className="approval-actions">
                    <button
                      onClick={() => handleApprove(request.uid, request.name)}
                      disabled={actionLoading !== null}
                      className="btn-accept"
                    >
                      {actionLoading === `accept-${request.uid}` ? "..." : "Accept"}
                    </button>
                    <button
                      onClick={() => handleReject(request.uid, request.name)}
                      disabled={actionLoading !== null}
                      className="btn-reject"
                    >
                      {actionLoading === `reject-${request.uid}` ? "..." : "Reject"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="verification-footer">
          <p className="footer-text">
            Only you (owner) can see this page and approve or reject requests.
          </p>
        </div>
      </div>
    </div>
  );
}

function formatTime(timestamp) {
  if (!timestamp) return "unknown";

  const now = new Date();
  const requested = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const diff = now - requested;

  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return requested.toLocaleDateString();
}
