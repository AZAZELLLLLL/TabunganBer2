import React, { useState, useEffect } from "react";
import { signInWithPopup, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, googleProvider, db, OWNER_EMAIL } from "./firebase";
import QRScan from "./QRScan";
import WaitingApproval from "./WaitingApproval";
import "./Login.css";

/**
 * REDESIGNED LOGIN SYSTEM
 * 
 * Flow:
 * 1. User click "Login dengan Google"
 * 2. Check after auth:
 *    - If email === OWNER_EMAIL → go to Menu (no verification)
 *    - If email !== OWNER_EMAIL → show QRScan (need to scan first)
 * 3. After QR scan & approval → Google Auth (for viewer flow)
 * 4. Go to Menu
 */

export default function Login({ setUser }) {
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [googleAuthResult, setGoogleAuthResult] = useState(null); // Store Google auth result
  
  // QR Scan states
  const [showQRScan, setShowQRScan] = useState(false);
  const [showWaitingApproval, setShowWaitingApproval] = useState(false);
  const [showRejected, setShowRejected] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Listen to auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log("User authenticated:", user.email);
        
        // Check if owner or viewer
        const isOwner = user.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
        console.log("Is owner?", isOwner);

        try {
          const userRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();

            if (isOwner) {
              // ✅ OWNER: Direct access
              console.log("✅ Owner login detected!");
              
              setUser({
                uid: user.uid,
                name: userData.name || user.displayName,
                email: user.email,
                photo: userData.photo || user.photoURL,
                groupId: userData.groupId,
                role: "owner",
                isOwner: true,
              });
              setCheckingAuth(false);
              
            } else {
              // VIEWER: Check approval status
              const approvalStatus = userData.approvalStatus;
              console.log("Viewer approval status:", approvalStatus);

              if (approvalStatus === "approved") {
                // ✅ Already approved
                console.log("✅ Viewer approved!");
                
                setUser({
                  uid: user.uid,
                  name: userData.name || user.displayName,
                  email: user.email,
                  photo: userData.photo || user.photoURL,
                  groupId: userData.groupId,
                  role: "viewer",
                  isOwner: false,
                });
                setCheckingAuth(false);
                
              } else if (approvalStatus === "pending") {
                // ⏳ Waiting for approval
                console.log("⏳ Viewer pending...");
                
                setShowWaitingApproval(true);
                setCurrentUser({
                  uid: user.uid,
                  name: user.displayName,
                  email: user.email,
                  photo: user.photoURL,
                  groupId: userData.groupId,
                });
                setCheckingAuth(false);
                
              } else if (approvalStatus === "rejected") {
                // ❌ Rejected
                console.log("❌ Viewer rejected.");
                
                setShowRejected(true);
                setRejectionReason("Owner rejected your request. Try with different QR code.");
                setCheckingAuth(false);
                
              } else {
                // null: First time viewer - show QR scan
                console.log("First time viewer - show QR scan");
                
                // Store current user untuk QR scan component
                setCurrentUser({
                  uid: user.uid,
                  name: user.displayName,
                  email: user.email,
                  photo: user.photoURL,
                });
                setShowQRScan(true);
                setCheckingAuth(false);
              }
            }
          } else {
            // User document doesn't exist - create it
            if (isOwner) {
              // Create owner document
              console.log("Creating owner document");
              
              await setDoc(userRef, {
                uid: user.uid,
                name: user.displayName,
                email: user.email,
                photo: user.photoURL,
                role: "owner",
                isOwner: true,
                groupId: null,
                approvalStatus: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              });

              setUser({
                uid: user.uid,
                name: user.displayName,
                email: user.email,
                photo: user.photoURL,
                role: "owner",
                isOwner: true,
              });
              setCheckingAuth(false);
              
            } else {
              // Create viewer document (first time)
              console.log("Creating viewer document");
              
              await setDoc(userRef, {
                uid: user.uid,
                name: user.displayName,
                email: user.email,
                photo: user.photoURL,
                role: "viewer",
                isOwner: false,
                groupId: null,
                approvalStatus: null,
                createdAt: new Date(),
                updatedAt: new Date(),
              });

              setCurrentUser({
                uid: user.uid,
                name: user.displayName,
                email: user.email,
                photo: user.photoURL,
              });
              setShowQRScan(true);
              setCheckingAuth(false);
            }
          }
        } catch (error) {
          console.error("Error checking user:", error);
          alert("❌ Error: " + error.message);
          setCheckingAuth(false);
        }
      } else {
        setCheckingAuth(false);
      }
    });

    return unsubscribe;
  }, [setUser]);

  // Handle Google Login
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      console.log("Login initiated with:", result.user.email);
      // onAuthStateChanged will handle the rest
    } catch (error) {
      console.error("Login error:", error);
      alert("❌ Login failed: " + error.message);
      setLoading(false);
    }
  };

  // Handle QR scan complete
  const handleQRScanComplete = async (groupId, deviceInfo) => {
    console.log("✅ QR scan complete, device info collected");
    
    try {
      // Update user document with approval request sent
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        groupId: groupId,
        role: "viewer",
        approvalStatus: "pending",
        approvalRequestedAt: new Date(),
        deviceInfo: deviceInfo,
        updatedAt: new Date(),
      });

      console.log("User updated with pending approval");

      // Show waiting approval screen
      setShowQRScan(false);
      setShowWaitingApproval(true);
    } catch (error) {
      console.error("Error:", error);
      alert("Error: " + error.message);
    }
  };

  // Handle approval approved
  const handleApprovalApproved = async () => {
    console.log("✅ Approval approved!");
    
    try {
      const userRef = doc(db, "users", currentUser.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        
        setUser({
          uid: currentUser.uid,
          name: userData.name,
          email: currentUser.email,
          photo: userData.photo,
          groupId: userData.groupId,
          role: "viewer",
          isOwner: false,
        });
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error! Please refresh.");
    }
    
    setShowWaitingApproval(false);
  };

  // Handle approval rejected
  const handleApprovalRejected = () => {
    console.log("❌ Approval rejected");
    setShowWaitingApproval(false);
    setShowRejected(true);
    setRejectionReason("Owner rejected your request. Try with different QR code.");
  };

  // Handle retry pairing
  const handleRetryPairing = async () => {
    console.log("Retrying pairing...");
    
    try {
      await signOut(auth);
      setShowRejected(false);
      setShowQRScan(false);
      setCurrentUser(null);
    } catch (error) {
      console.error("Error:", error);
    }
  };

  // Checking auth
  if (checkingAuth) {
    return (
      <div className="login-page">
        <div className="login-wrapper">
          <div className="login-form-section">
            <div className="login-card">
              <div className="login-header">
                <h2>Checking auth... 🔄</h2>
              </div>
              <div className="loading-spinner"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show QRScan for viewers
  if (showQRScan && currentUser) {
    return (
      <QRScan
        user={currentUser}
        onComplete={handleQRScanComplete}
      />
    );
  }

  // Show WaitingApproval
  if (showWaitingApproval && currentUser) {
    return (
      <WaitingApproval
        user={currentUser}
        onApproved={handleApprovalApproved}
        onRejected={handleApprovalRejected}
      />
    );
  }

  // Show rejection screen
  if (showRejected) {
    return (
      <div className="login-page">
        <div className="login-wrapper">
          <div className="login-form-section">
            <div className="login-card">
              <div className="login-header">
                <h2>❌ Access Denied</h2>
              </div>
              
              <div style={{ padding: "20px", textAlign: "center" }}>
                <p style={{ color: "#8B6F9E", marginBottom: "20px" }}>
                  {rejectionReason}
                </p>
              </div>
              
              <button
                onClick={handleRetryPairing}
                className="google-login-btn"
                style={{ background: "linear-gradient(135deg, #E74C3C, #C0392B)" }}
              >
                🔄 Try Again
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Login UI
  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="gradient-blob blob-1"></div>
        <div className="gradient-blob blob-2"></div>
        <div className="gradient-blob blob-3"></div>
      </div>

      <div className="login-wrapper">
        <div className="login-brand-section">
          <div className="brand-content">
            <div className="brand-logo">
              <img src="/logo_nobg.png" alt="Infinity Love" />
            </div>
            <h1 className="brand-name">Yubul</h1>
            <p className="brand-tagline">
              Tabungan berdua bareng pacar jadi makin <span>harmonis</span> 💕
            </p>

            <div className="features-list">
              <div className="feature-item">
                <span className="feature-icon">💰</span>
                <div>
                  <p>Kelola Tabungan</p>
                  <small>Tracking uang kalian berdua dengan mudah</small>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📊</span>
                <div>
                  <p>Lihat Statistik</p>
                  <small>Analisis pengeluaran dan pemasukan realtime</small>
                </div>
              </div>
              <div className="feature-item">
                <span className="feature-icon">💕</span>
                <div>
                  <p>Transparansi</p>
                  <small>Lihat kemana uang keluar dengan jelas</small>
                </div>
              </div>
            </div>

            <div className="love-quote">
              <p>"Cinta + Uang Terkelola = Hubungan Sehat"</p>
            </div>
          </div>
        </div>

        <div className="login-form-section">
          <div className="login-card">
            <div className="login-header">
              <h2>Selamat datang di Yubul! 🎉</h2>
              <p>Mulai kelola keuangan berdua sekarang</p>
            </div>

            <button
              onClick={handleGoogleLogin}
              disabled={loading}
              className="google-login-btn"
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Sedang login...
                </>
              ) : (
                <>
                  <img
                    src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                    alt="Google"
                  />
                  Login dengan Google
                </>
              )}
            </button>

            <div className="divider">
              <span>atau</span>
            </div>

            <div className="login-footer">
              <p className="security-note">
                🔒 Data kamu aman dan terenkripsi dengan Firebase
              </p>
              <p className="terms-note">
                Dengan login, kamu setuju dengan Terms & Conditions kami
              </p>
            </div>
          </div>

          <div className="floating-elements">
            <div className="float-emoji emoji-1">💕</div>
            <div className="float-emoji emoji-2">✨</div>
            <div className="float-emoji emoji-3">💑</div>
            <div className="float-emoji emoji-4">💰</div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * FLOW:
 * 
 * OWNER:
 *   Click "Login dengan Google"
 *     ↓
 *   Google popup
 *     ↓
 *   Select account (watermelon.cowo@gmail.com)
 *     ↓
 *   onAuthStateChanged → Check email === OWNER_EMAIL ✅
 *     ↓
 *   setUser({ isOwner: true })
 *     ↓
 *   Go to Menu (with "🔐 Generate QR")
 * 
 * VIEWER:
 *   Click "Login dengan Google"
 *     ↓
 *   Google popup
 *     ↓
 *   Select account (other email)
 *     ↓
 *   onAuthStateChanged → Check email !== OWNER_EMAIL
 *     ↓
 *   approvalStatus == null → Show QRScan
 *     ↓
 *   Scan QR
 *     ↓
 *   Send approval request + device info
 *     ↓
 *   Show WaitingApproval ⏳
 *     ↓
 *   Owner approve
 *     ↓
 *   approvalStatus = "approved"
 *     ↓
 *   setUser({ isOwner: false })
 *     ↓
 *   Go to Menu (NO "🔐 Generate QR")
 */