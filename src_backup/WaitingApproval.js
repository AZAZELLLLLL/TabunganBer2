import React, { useEffect } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import "./WaitingApproval.css";

/**
 * WAITING APPROVAL COMPONENT
 * 
 * Untuk VIEWER (role="viewer")
 * Ditampilkan saat:
 * - User scan QR code → send approval request
 * - approvalStatus = "pending"
 * - Waiting untuk owner accept
 * 
 * Fungsi:
 * 1. Show full-screen "⏳ Waiting..." message
 * 2. Real-time listener ke user document
 * 3. Detect perubahan approvalStatus
 * 4. Saat berubah jadi "approved" → callback ke parent
 * 5. Parent akan redirect ke Menu ✅
 * 6. Jika "rejected" → show error, option to try again
 */

export default function WaitingApproval({ user, onApproved, onRejected }) {
  // ============================================
  // REAL-TIME LISTENER
  // ============================================

  /**
   * useEffect: Listen to user document perubahan
   * 
   * Apa yang terjadi:
   * 1. Set up real-time listener ke users/{uid}
   * 2. Setiap kali document berubah → callback
   * 3. Check: approvalStatus berubah?
   *    - Jadi "approved" → call onApproved()
   *    - Jadi "rejected" → call onRejected()
   * 4. Parent handle redirect/error
   */
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
            onApproved(); // Parent will handle redirect
          } else if (userData.approvalStatus === "rejected") {
            console.log("❌ REJECTED!");
            onRejected(); // Parent will handle error screen
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

  // ============================================
  // RENDER
  // ============================================

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
            Owner sedang mereview request kamu...
          </p>
          <p className="waiting-subtext">
            Jangan tutup halaman ini. Kamu akan langsung redirect ke Menu saat disetujui ✅
          </p>
        </div>

        {/* Status */}
        <div className="waiting-status">
          <div className="status-item">
            <div className="status-icon">📱</div>
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

        {/* Tips */}
        <div className="waiting-tips">
          <h3>💡 Tips:</h3>
          <ul>
            <li>Pastikan sudah share QR code ke owner</li>
            <li>Owner akan lihat notification tentang request kamu</li>
            <li>Tunggu sampai disetujui ✅</li>
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
 * PARENT COMPONENT (Login.js) HARUS:
 * 
 * 1. Show WaitingApproval jika:
 *    - user.approvalStatus === "pending"
 *    - AND user.groupId exists
 * 
 * 2. Handle onApproved callback:
 *    const handleApproved = () => {
 *      // Fetch latest user data
 *      // Update state
 *      // Redirect ke Menu
 *    }
 * 
 * 3. Handle onRejected callback:
 *    const handleRejected = () => {
 *      // Show error message
 *      // Option: scan QR lagi atau logout
 *    }
 * 
 * Contoh di Login.js:
 * 
 * if (user.approvalStatus === "pending") {
 *   return (
 *     <WaitingApproval
 *       user={user}
 *       onApproved={handleApproved}
 *       onRejected={handleRejected}
 *     />
 *   );
 * }
 */