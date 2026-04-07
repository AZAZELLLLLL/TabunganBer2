import React, { useState } from "react";
import { signInWithPopup, signOut } from "firebase/auth";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { auth, googleProvider, db, OWNER_EMAIL } from "./firebase";
import {
  getGroupDataByGroupId,
  isViewerBlockedStatus,
  resolveViewerApprovalStatus,
} from "./approvalUtils";
import QRScan from "./QRScan";
import WaitingApproval from "./WaitingApproval";
import "./Login.css";

/**
 * LOGIN WITH GENDER - COMPLETE WORKING VERSION
 * 
 * Form:
 * 1. 📝 Nama Lengkap (input)
 * 2. 👫 Cowo/Cewe (buttons - CLICKABLE!)
 * 3. 📧 Akun Google (select button)
 * 4. 🚀 Masuk Aplikasi (submit)
 */

export default function LoginWithGender({ setUser }) {
  const [loading, setLoading] = useState(false);
  
  // Form states
  const [fullName, setFullName] = useState("");
  const [gender, setGender] = useState(""); // "cowo" or "cewe"
  const [googleUser, setGoogleUser] = useState(null);

  // UI states
  const [showQRScan, setShowQRScan] = useState(false);
  const [showWaitingApproval, setShowWaitingApproval] = useState(false);
  const [showRejected, setShowRejected] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [lastDeviceInfo, setLastDeviceInfo] = useState(null);
  const [waitingGroupId, setWaitingGroupId] = useState(null);

  // ✅ Select Google Account
  const handleSelectGoogle = async () => {
    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      
      setGoogleUser({
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
      });
      
      setLoading(false);
    } catch (error) {
      console.error("Google auth error:", error);
      alert("❌ Google login gagal: " + error.message);
      setLoading(false);
    }
  };

  // ✅ Submit form
  const handleMasuk = async (e) => {
    e.preventDefault();
    
    if (!fullName.trim()) {
      alert("❌ Nama harus diisi!");
      return;
    }
    
    if (!gender) {
      alert("❌ Pilih Cowo atau Cewe!");
      return;
    }
    
    if (!googleUser) {
      alert("❌ Pilih akun Google dulu!");
      return;
    }

    try {
      setLoading(true);
      
      const isOwner = googleUser.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();
      const userRef = doc(db, "users", googleUser.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        const groupData = !isOwner && userData.groupId
          ? await getGroupDataByGroupId(userData.groupId)
          : null;
        
        await updateDoc(userRef, {
          name: fullName,
          gender: gender,
          updatedAt: new Date(),
        });
        
        if (isOwner) {
          console.log("✅ Owner!");
          setUser({
            uid: googleUser.uid,
            name: fullName,
            email: googleUser.email,
            photo: userData.photo || googleUser.photoURL,
            googlePhoto: googleUser.photoURL,
            gender: gender,
            groupId: userData.groupId,
            role: "owner",
            isOwner: true,
          });
        } else {
          const effectiveStatus = resolveViewerApprovalStatus({
            userData,
            groupData,
            viewerUid: googleUser.uid,
          });
          
          if (effectiveStatus === "approved") {
            if (userData.approvalStatus !== "approved") {
              try {
                await updateDoc(userRef, {
                  approvalStatus: "approved",
                  updatedAt: new Date(),
                });
              } catch (syncError) {
                console.warn("Viewer self-sync approval skipped:", syncError);
              }
            }

            setUser({
              uid: googleUser.uid,
              name: fullName,
              email: googleUser.email,
              photo: userData.photo || googleUser.photoURL,
              googlePhoto: googleUser.photoURL,
              gender: gender,
              groupId: userData.groupId,
              role: "viewer",
              isOwner: false,
              approvalStatus: "approved",
            });
          } else if (effectiveStatus === "pending") {
            setLastDeviceInfo(userData.deviceInfo || null);
            setWaitingGroupId(userData.groupId || null);
            setShowWaitingApproval(true);
          } else if (isViewerBlockedStatus(effectiveStatus)) {
            setShowRejected(true);
            setRejectionReason(
              effectiveStatus === "logged_out"
                ? "Owner mengeluarkan akun ini dari group. Silakan scan ulang kalau mau bergabung lagi."
                : "Owner rejected your request."
            );
          } else {
            setShowQRScan(true);
          }
        }
      } else {
        if (isOwner) {
          await setDoc(userRef, {
            uid: googleUser.uid,
            name: fullName,
            email: googleUser.email,
            photo: googleUser.photoURL,
            gender: gender,
            role: "owner",
            isOwner: true,
            groupId: null,
            approvalStatus: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          
          setUser({
            uid: googleUser.uid,
            name: fullName,
            email: googleUser.email,
            photo: googleUser.photoURL,
            googlePhoto: googleUser.photoURL,
            gender: gender,
            role: "owner",
            isOwner: true,
          });
        } else {
          await setDoc(userRef, {
            uid: googleUser.uid,
            name: fullName,
            email: googleUser.email,
            photo: googleUser.photoURL,
            gender: gender,
            role: "viewer",
            isOwner: false,
            groupId: null,
            approvalStatus: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          });
          
          setShowQRScan(true);
        }
      }
      
      setLoading(false);
    } catch (error) {
      console.error("Error:", error);
      alert("❌ Error: " + error.message);
      setLoading(false);
    }
  };

  const handleQRScanComplete = async (groupId, deviceInfo) => {
    try {
      const userRef = doc(db, "users", googleUser.uid);
      await updateDoc(userRef, {
        groupId: groupId,
        approvalStatus: "pending",
        approvalRequestedAt: new Date(),
        deviceInfo: deviceInfo,
        updatedAt: new Date(),
      });

      setLastDeviceInfo(deviceInfo);
      setWaitingGroupId(groupId);
      setShowQRScan(false);
      setShowWaitingApproval(true);
    } catch (error) {
      console.error("Error:", error);
      alert("Error: " + error.message);
    }
  };

  const handleApprovalApproved = async () => {
    try {
      const userRef = doc(db, "users", googleUser.uid);
      const userDoc = await getDoc(userRef);
      
      if (userDoc.exists()) {
        const userData = userDoc.data();
        setUser({
          uid: googleUser.uid,
          name: fullName,
          email: googleUser.email,
          photo: userData.photo || googleUser.photoURL,
          googlePhoto: googleUser.photoURL,
          gender: gender,
          groupId: userData.groupId || waitingGroupId,
          role: "viewer",
          isOwner: false,
        });
      }
      
      setShowWaitingApproval(false);
      setWaitingGroupId(null);
    } catch (error) {
      console.error("Error:", error);
      alert("Error: " + error.message);
    }
  };

  const handleApprovalRejected = (status) => {
    setShowWaitingApproval(false);
    setShowRejected(true);
    setWaitingGroupId(null);
    setRejectionReason(
      status === "logged_out"
        ? "Owner mengeluarkan akun ini dari group. Scan ulang QR kalau ingin masuk lagi."
        : "Owner rejected your request."
    );
  };

  // Show QR Scan
  if (showQRScan) {
    return (
      <QRScan
        user={{
          uid: googleUser.uid,
          name: fullName,
          email: googleUser.email,
          photo: googleUser.photoURL,
          gender: gender,
        }}
        onComplete={handleQRScanComplete}
      />
    );
  }

  // Show Waiting Approval
  if (showWaitingApproval) {
    return (
      <WaitingApproval
        user={{
          uid: googleUser.uid,
          name: fullName,
          email: googleUser.email,
          photo: googleUser.photoURL,
          gender: gender,
          groupId: waitingGroupId,
        }}
        deviceInfo={lastDeviceInfo}
        onApproved={handleApprovalApproved}
        onRejected={handleApprovalRejected}
      />
    );
  }

  // Show Rejection
  if (showRejected) {
    return (
      <div className="login-page">
        <div className="login-wrapper">
          <div className="login-form-section">
            <div className="login-card">
              <div className="login-header">
                <h2>❌ Ditolak</h2>
              </div>
              <p style={{ textAlign: "center", color: "#999" }}>{rejectionReason}</p>
              <button
                onClick={async () => {
                  await signOut(auth);
                  setShowRejected(false);
                  setGoogleUser(null);
                  setFullName("");
                  setGender("");
                  setWaitingGroupId(null);
                  setLastDeviceInfo(null);
                }}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: "#E74C3C",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                }}
              >
                🔄 Coba Lagi
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ SHOW LOGIN FORM
  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="gradient-blob blob-1"></div>
        <div className="gradient-blob blob-2"></div>
        <div className="gradient-blob blob-3"></div>
      </div>

      <div className="login-wrapper">
        {/* LEFT SIDE */}
        <div className="login-brand-section">
          <div className="brand-content">
            <div className="brand-logo">
              <img src="/logo_nobg.png" alt="Yubul" />
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

        {/* RIGHT SIDE - FORM */}
        <div className="login-form-section">
          <div className="login-card">
            <div className="login-header">
              <h2>Selamat datang di Yubul! 🎉</h2>
              <p>Mulai kelola keuangan berdua sekarang</p>
            </div>

            <form onSubmit={handleMasuk} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* NAMA INPUT */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontWeight: "600", fontSize: "14px", color: "#333" }}>
                  📝 Nama Lengkap
                </label>
                <input
                  type="text"
                  placeholder="Masukkan nama lengkap kamu"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  style={{
                    padding: "12px 16px",
                    border: "2px solid #E0E0E0",
                    borderRadius: "12px",
                    fontSize: "14px",
                    fontFamily: "inherit",
                  }}
                />
              </div>

              {/* GENDER BUTTONS - FULLY INLINE STYLED */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontWeight: "600", fontSize: "14px", color: "#333" }}>
                  👫 Kamu siapa di hubungan ini?
                </label>
                <div style={{ display: "flex", gap: "12px" }}>
                  {/* COWO BUTTON */}
                  <button
                    type="button"
                    onClick={() => setGender("cowo")}
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: "12px 16px",
                      background: gender === "cowo" 
                        ? "linear-gradient(135deg, #8B6F9E, #D4A5E8)"
                        : "#F0F0F0",
                      color: gender === "cowo" ? "white" : "#333",
                      border: gender === "cowo" ? "2px solid #D4A5E8" : "2px solid #E0E0E0",
                      borderRadius: "12px",
                      fontWeight: "600",
                      cursor: loading ? "not-allowed" : "pointer",
                      opacity: loading ? 0.7 : 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "8px",
                      transition: "all 0.3s ease",
                    }}
                  >
                    <span style={{ fontSize: "24px" }}>👨</span>
                    <span style={{ fontSize: "14px" }}>Cowo</span>
                  </button>

                  {/* CEWE BUTTON */}
                  <button
                    type="button"
                    onClick={() => setGender("cewe")}
                    disabled={loading}
                    style={{
                      flex: 1,
                      padding: "12px 16px",
                      background: gender === "cewe"
                        ? "linear-gradient(135deg, #D4A5E8, #E8D4F8)"
                        : "#F0F0F0",
                      color: gender === "cewe" ? "white" : "#333",
                      border: gender === "cewe" ? "2px solid #D4A5E8" : "2px solid #E0E0E0",
                      borderRadius: "12px",
                      fontWeight: "600",
                      cursor: loading ? "not-allowed" : "pointer",
                      opacity: loading ? 0.7 : 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: "8px",
                      transition: "all 0.3s ease",
                    }}
                  >
                    <span style={{ fontSize: "24px" }}>👩</span>
                    <span style={{ fontSize: "14px" }}>Cewe</span>
                  </button>
                </div>
              </div>

              {/* GOOGLE ACCOUNT */}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <label style={{ fontWeight: "600", fontSize: "14px", color: "#333" }}>
                  📧 Akun Google
                </label>
                
                {!googleUser ? (
                  <button
                    type="button"
                    onClick={handleSelectGoogle}
                    disabled={loading}
                    style={{
                      padding: "12px 16px",
                      background: "linear-gradient(135deg, #8B6F9E, #D4A5E8)",
                      color: "white",
                      border: "none",
                      borderRadius: "12px",
                      fontWeight: "600",
                      cursor: loading ? "not-allowed" : "pointer",
                      opacity: loading ? 0.7 : 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "10px",
                    }}
                  >
                    {loading ? "Loading..." : "📧 Pilih Akun Google"}
                  </button>
                ) : (
                  <div style={{
                    padding: "12px 16px",
                    background: "#F8F8F8",
                    border: "2px solid #D4A5E8",
                    borderRadius: "12px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}>
                    <img 
                      src={googleUser.photoURL} 
                      alt="Avatar" 
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "50%",
                        border: "2px solid #D4A5E8",
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: "0", fontWeight: "600", color: "#333", fontSize: "14px" }}>
                        {googleUser.displayName}
                      </p>
                      <p style={{ margin: "3px 0 0", color: "#999", fontSize: "12px" }}>
                        {googleUser.email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setGoogleUser(null)}
                      disabled={loading}
                      style={{
                        padding: "6px 12px",
                        background: "#E8D4F8",
                        color: "#8B6F9E",
                        border: "none",
                        borderRadius: "8px",
                        cursor: "pointer",
                        fontSize: "12px",
                        fontWeight: "600",
                      }}
                    >
                      ✏️ Ganti
                    </button>
                  </div>
                )}
              </div>

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={loading || !fullName.trim() || !gender || !googleUser}
                style={{
                  padding: "14px 24px",
                  background: loading || !fullName.trim() || !gender || !googleUser
                    ? "#CCC"
                    : "linear-gradient(135deg, #8B6F9E, #D4A5E8)",
                  color: "white",
                  border: "none",
                  borderRadius: "12px",
                  fontWeight: "700",
                  fontSize: "16px",
                  cursor: loading || !fullName.trim() || !gender || !googleUser ? "not-allowed" : "pointer",
                  marginTop: "10px",
                }}
              >
                {loading ? "⏳ Sedang masuk..." : "🚀 Masuk Aplikasi"}
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: "20px" }}>
              <p style={{ fontSize: "12px", color: "#999", margin: "8px 0" }}>
                🔒 Data kamu aman dengan Firebase
              </p>
              <p style={{ fontSize: "12px", color: "#999", margin: "8px 0" }}>
                Dengan login, kamu setuju dengan Terms & Conditions
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
 * KEY FEATURES:
 * 
 * 1. ✅ Form fields:
 *    - Nama Lengkap (input)
 *    - Cowo/Cewe selection (buttons)
 *    - Akun Google (select button)
 *    - Masuk Aplikasi (submit)
 * 
 * 2. ✅ Gender/Role saved to Firestore:
 *    - gender: "cowo" or "cewe"
 *    - Used for tracking who spends money
 *    - Displayed in Menu: "👨 Cowo" or "👩 Cewe"
 * 
 * 3. ✅ User object includes:
 *    {
 *      uid: "...",
 *      name: "Budi Santoso",
 *      email: "...",
 *      photo: "...",
 *      gender: "cowo",        ← NEW!
 *      role: "owner/viewer",
 *      isOwner: true/false,
 *      groupId: "..."
 *    }
 * 
 * 4. ✅ Used for:
 *    - Menu display: show "👨 Cowo" or "👩 Cewe"
 *    - Expenses tracking: "Nabung si Cowo atau Cewe?"
 *    - Statistics: show by gender
 *    - In owner's request list: show "Cowo/Cewe"
 */
