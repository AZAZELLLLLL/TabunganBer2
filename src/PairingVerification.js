import React, { useState, useEffect } from "react";
import { doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import { QRCodeCanvas } from "qrcode.react";
import "./PairingVerification.css";

/**
 * PAIRING VERIFICATION COMPONENT
 * 
 * Hanya untuk OWNER (role="owner")
 * Fungsi:
 * 1. Display QR code untuk di-share ke viewer
 * 2. Show list of pending approval requests
 * 3. Owner dapat Accept atau Reject requests
 * 4. Real-time listener untuk detect new requests
 * 
 * Flow:
 * Owner click "🔐 Verifikasi Pairing" di Menu
 *   → Show PairingVerification page
 *   ├─ Top: QR code (to share)
 *   └─ Bottom: Pending approvals list
 *      ├─ If ada request → show nama, accept/reject buttons
 *      └─ If tidak ada → show "Tidak ada permintaan"
 */

export default function PairingVerification({ user, onBack }) {
  // ============================================
  // STATE MANAGEMENT
  // ============================================

  const [groupData, setGroupData] = useState(null); // Store group data
  const [qrValue, setQrValue] = useState(null); // QR code value
  const [pendingRequests, setPendingRequests] = useState([]); // Pending approval requests
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null); // "accept-{uid}" atau "reject-{uid}"

  // ============================================
  // LOAD GROUP DATA & PENDING REQUESTS
  // ============================================

  /**
   * useEffect: Load group data & listen to changes
   * 
   * Apa yang terjadi:
   * 1. Fetch group document dari Firestore (berdasarkan user.groupId)
   * 2. Extract QR code data
   * 3. Get pending approvals list
   * 4. Set up real-time listener untuk detect changes
   */
  useEffect(() => {
    loadGroupData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.groupId]);

  const loadGroupData = async () => {
    setLoading(true);
    try {
      // Step 1: Query untuk find group dengan groupId
      const groupsRef = collection(db, "groups");
      const q = query(groupsRef, where("groupId", "==", user.groupId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.error("Group not found!");
        alert("❌ Group tidak ditemukan!");
        return;
      }

      const groupDoc = querySnapshot.docs[0];
      const data = groupDoc.data();

      console.log("Group data loaded:", data);

      // Step 2: Set group data
      setGroupData({
        docId: groupDoc.id,
        ...data,
      });

      // Step 3: Set QR code value (untuk display)
      setQrValue(data.qrCodeData || `yubul://group/${user.groupId}`);

      // Step 4: Get pending requests
      const pendingList = (data.pendingApprovals || []).filter(
        (req) => req.status === "pending"
      );
      setPendingRequests(pendingList);

      console.log("Pending requests:", pendingList);
    } catch (error) {
      console.error("Error loading group data:", error);
      alert("❌ Error loading pairing data!");
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // OWNER: APPROVE REQUEST
  // ============================================

  /**
   * FUNGSI: Owner accept approval request
   * 
   * Apa yang terjadi:
   * 1. Update groups.pendingApprovals[] → status = "approved"
   * 2. Update groups.members[] → add viewer uid
   * 3. Update users/{viewerUid}.approvalStatus → "approved"
   * 4. Viewer real-time listener → redirect to Menu ✅
   */
  const handleApprove = async (viewerUid, viewerName) => {
    setActionLoading(`accept-${viewerUid}`);
    try {
      console.log("Approving:", viewerName);

      // Step 1: Update group document
      const groupRef = doc(db, "groups", groupData.docId);
      
      // Update pendingApprovals status
      const updatedPending = groupData.pendingApprovals.map((req) =>
        req.uid === viewerUid ? { ...req, status: "approved" } : req
      );

      // Add to members jika belum ada
      const members = groupData.members || [];
      if (!members.includes(viewerUid)) {
        members.push(viewerUid);
      }

      await updateDoc(groupRef, {
        pendingApprovals: updatedPending,
        members: members,
        memberCount: members.length,
        updatedAt: new Date(),
      });

      console.log("Group updated: pending → approved");

      // Step 2: Update user document
      const userRef = doc(db, "users", viewerUid);
      await updateDoc(userRef, {
        approvalStatus: "approved",
        approvalApprovedAt: new Date(),
        updatedAt: new Date(),
      });

      console.log("User updated: approvalStatus → approved");

      // Step 3: Reload data
      await loadGroupData();

      alert(`✅ ${viewerName} approved! They can now access the app.`);
    } catch (error) {
      console.error("Error approving:", error);
      alert(`❌ Error approving ${viewerName}!`);
    } finally {
      setActionLoading(null);
    }
  };

  // ============================================
  // OWNER: REJECT REQUEST
  // ============================================

  /**
   * FUNGSI: Owner reject approval request
   * 
   * Apa yang terjadi:
   * 1. Update groups.pendingApprovals[] → status = "rejected"
   * 2. Update users/{viewerUid}.approvalStatus → "rejected"
   * 3. Viewer: show error, can scan another QR or logout
   */
  const handleReject = async (viewerUid, viewerName) => {
    setActionLoading(`reject-${viewerUid}`);
    try {
      console.log("Rejecting:", viewerName);

      // Step 1: Update group document
      const groupRef = doc(db, "groups", groupData.docId);
      
      const updatedPending = groupData.pendingApprovals.map((req) =>
        req.uid === viewerUid ? { ...req, status: "rejected" } : req
      );

      await updateDoc(groupRef, {
        pendingApprovals: updatedPending,
        updatedAt: new Date(),
      });

      console.log("Group updated: pending → rejected");

      // Step 2: Update user document
      const userRef = doc(db, "users", viewerUid);
      await updateDoc(userRef, {
        approvalStatus: "rejected",
        updatedAt: new Date(),
      });

      console.log("User updated: approvalStatus → rejected");

      // Step 3: Reload data
      await loadGroupData();

      alert(`❌ ${viewerName} rejected.`);
    } catch (error) {
      console.error("Error rejecting:", error);
      alert(`❌ Error rejecting ${viewerName}!`);
    } finally {
      setActionLoading(null);
    }
  };

  // ============================================
  // COPY QR CODE TO CLIPBOARD
  // ============================================

  const handleCopyQRText = async () => {
    try {
      await navigator.clipboard.writeText(qrValue);
      alert("✅ QR code data copied to clipboard!");
    } catch (error) {
      console.error("Error copying:", error);
      alert("❌ Failed to copy!");
    }
  };

  // ============================================
  // DOWNLOAD QR CODE (screenshot)
  // ============================================

  const handleDownloadQR = () => {
    const canvas = document.querySelector(".pairing-qr-canvas canvas");
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = url;
      link.download = `pairing-qr-${user.groupId}.png`;
      link.click();
      alert("✅ QR code downloaded!");
    }
  };

  // ============================================
  // LOADING STATE
  // ============================================

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
            <p>❌ Group data not found!</p>
            <button onClick={onBack} className="btn-back">
              ← Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER UI
  // ============================================

  return (
    <div className="pairing-verification-page">
      <div className="verification-container">
        {/* Header */}
        <div className="verification-header">
          <button onClick={onBack} className="btn-back-icon">
            ← Back
          </button>
          <h1>🔐 Verifikasi Pairing</h1>
          <div className="spacer"></div>
        </div>

        {/* QR Code Section */}
        <div className="verification-section qr-section">
          <h2>📱 Share QR Code</h2>
          <p className="section-description">
            Share QR code ini ke partner untuk scan dan request akses
          </p>

          {/* QR Code Display */}
          <div className="pairing-qr-canvas">
            {qrValue && (
              <QRCodeCanvas
                value={qrValue}
                size={240}
                level="H"
                includeMargin={true}
              />
            )}
          </div>

          {/* Actions */}
          <div className="qr-actions">
            <button onClick={handleCopyQRText} className="btn-secondary">
              📋 Copy QR Data
            </button>
            <button onClick={handleDownloadQR} className="btn-secondary">
              💾 Download QR
            </button>
          </div>
        </div>

        {/* Pending Approvals Section */}
        <div className="verification-section approvals-section">
          <h2>⏳ Pending Requests ({pendingRequests.length})</h2>
          <p className="section-description">
            Orang-orang yang meinta akses:
          </p>

          {pendingRequests.length === 0 ? (
            <div className="empty-state">
              <p>Tidak ada permintaan akses</p>
              <small>Tunggu partner scan QR code kamu</small>
            </div>
          ) : (
            <div className="approvals-list">
              {pendingRequests.map((request) => (
                <div key={request.uid} className="approval-item">
                  {/* Viewer Info */}
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

                  {/* Approval/Reject Buttons */}
                  <div className="approval-actions">
                    <button
                      onClick={() => handleApprove(request.uid, request.name)}
                      disabled={actionLoading !== null}
                      className="btn-accept"
                    >
                      {actionLoading === `accept-${request.uid}`
                        ? "..."
                        : "✅ Accept"}
                    </button>
                    <button
                      onClick={() => handleReject(request.uid, request.name)}
                      disabled={actionLoading !== null}
                      className="btn-reject"
                    >
                      {actionLoading === `reject-${request.uid}`
                        ? "..."
                        : "❌ Reject"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="verification-footer">
          <p className="footer-text">
            💡 Only you (owner) can see this page and approve/reject requests.
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format timestamp untuk display
 * Contoh: "2 minutes ago", "1 hour ago"
 */
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