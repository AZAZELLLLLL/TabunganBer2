import React, { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import "./WaitingApproval.css";

/**
 * WAITING APPROVAL COMPONENT - UPDATED
 * 
 * Untuk VIEWER (non-owner email)
 * Ditampilkan saat:
 * - User scan QR code → send approval request
 * - approvalStatus = "pending"
 * - Waiting untuk owner accept
 * 
 * Perubahan:
 * 1. Add device info display (type, OS, browser, model)
 * 2. Trigger Google Auth AFTER approval (optional)
 * 3. Keep real-time listener
 * 
 * Flow:
 * 1. Show "⏳ Waiting..." dengan device info
 * 2. Listen to user document perubahan
 * 3. Saat berubah jadi "approved" → callback ke parent
 * 4. Parent akan redirect ke Menu
 */

export default function WaitingApproval({ user, onApproved, onRejected, deviceInfo }) {
  const [waitingMessage, setWaitingMessage] = useState("Waiting for owner approval...");
  const [showDeviceInfo, setShowDeviceInfo] = useState(false);

  useEffect(() => {
    console.log("Setting up real-time listener for approval status...");

    const userRef = doc(db, "users", user.uid);

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      userRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          const userData = docSnapshot.data();
          console.log("User data updated:", userData);

          // Check approval status
          if (userData.approvalStatus === "approved") {
            console.log("✅ APPROVED! Redirecting to Menu...");
            
            // Optional: Show success message first
            setWaitingMessage("✅ Approved! Redirecting...");
            
            // Callback to parent
            setTimeout(() => {
              onApproved();
            }, 1000); // Show success message for 1 second
            
          } else if (userData.approvalStatus === "rejected") {
            console.log("❌ REJECTED!");
            setWaitingMessage("❌ Request rejected");
            
            // Callback to parent
            setTimeout(() => {
              onRejected();
            }, 1500);
          }
        }
      },
      (error) => {
        console.error("Error listening to user document:", error);
      }
    );

    // Cleanup: unsubscribe saat component unmount
    return () => {
      console.log("Unsubscribing from listener...");
      unsubscribe();
    };
  }, [user.uid, onApproved, onRejected]);

  return (
    <div className="waiting-approval-page">
      <div className="waiting-container">
        
        {/* Animation */}
        <div className="waiting-animation">
          <div className="waiting-spinner"></div>
          <div className="waiting-pulse"></div>
        </div>

        {/* Content */}
        <div className="waiting-content">
          <h1>⏳ Waiting for Approval</h1>
          <p className="waiting-message">
            {waitingMessage}
          </p>
          <p className="waiting-subtext">
            Jangan tutup halaman ini. Kamu akan langsung redirect ke Menu saat disetujui ✅
          </p>
        </div>

        {/* Status Timeline */}
        <div className="waiting-status">
          <div className="status-item completed">
            <div className="status-icon">📸</div>
            <p className="status-text">QR Scanned</p>
            <div className="status-check">✅</div>
          </div>

          <div className="status-line"></div>

          <div className="status-item pending">
            <div className="status-icon">🔐</div>
            <p className="status-text">Waiting for Approval</p>
            <div className="status-loader"></div>
          </div>

          <div className="status-line"></div>

          <div className="status-item">
            <div className="status-icon">✨</div>
            <p className="status-text">Access Granted</p>
            <div className="status-check">⏳</div>
          </div>
        </div>

        {/* Device Info Display */}
        <div className="device-info-container">
          <button 
            className="device-info-toggle"
            onClick={() => setShowDeviceInfo(!showDeviceInfo)}
          >
            📱 {showDeviceInfo ? "Hide Device Info" : "Show Device Info"}
          </button>

          {showDeviceInfo && deviceInfo && (
            <div className="device-info-display">
              <h3>Your Device Information:</h3>
              <div className="device-specs">
                <div className="spec-item">
                  <span className="spec-label">Device Type:</span>
                  <span className="spec-value">{deviceInfo.deviceType}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Operating System:</span>
                  <span className="spec-value">{deviceInfo.deviceOS}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Browser:</span>
                  <span className="spec-value">{deviceInfo.deviceBrowser}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Device Model:</span>
                  <span className="spec-value">{deviceInfo.deviceModel}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Screen Resolution:</span>
                  <span className="spec-value">{deviceInfo.screenResolution}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Time Scanned:</span>
                  <span className="spec-value">{deviceInfo.timestamp}</span>
                </div>
              </div>
              <p className="device-hint">
                💡 Owner akan lihat informasi device ini saat memutuskan untuk accept/reject request mu
              </p>
            </div>
          )}
        </div>

        {/* Tips */}
        <div className="waiting-tips">
          <h3>💡 Tips:</h3>
          <ul>
            <li>Pastikan sudah share QR code ke owner</li>
            <li>Owner akan lihat device information dan request mu</li>
            <li>Tunggu sampai disetujui ✅</li>
            <li>Jangan close tab ini sampai approve</li>
          </ul>
        </div>

        {/* Footer */}
        <div className="waiting-footer">
          <p className="footer-hint">
            Sudah lama menunggu? Owner mungkin belum lihat request kamu. Coba hubungi langsung! 📞
          </p>
        </div>

      </div>
    </div>
  );
}

/**
 * PARENT COMPONENT (Login.js) EXPECTED:
 * 
 * <WaitingApproval
 *   user={{
 *     uid: "...",
 *     name: "...",
 *     email: "...",
 *     photo: "..."
 *   }}
 *   deviceInfo={{
 *     deviceType: "Mobile",
 *     deviceOS: "Android 12",
 *     deviceBrowser: "Chrome 98",
 *     deviceModel: "Samsung Galaxy S21",
 *     screenResolution: "1080x2340",
 *     timestamp: "16/03/2026, 14:30:45"
 *   }}
 *   onApproved={handleApprovalApproved}
 *   onRejected={handleApprovalRejected}
 * />
 */