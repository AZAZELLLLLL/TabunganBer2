import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db, OWNER_EMAIL } from "./firebase";
import Splash from "./Splash";
import Login from "./login";
import Menu from "./Menu";
import Dashboard from "./Dashboard";
import Expenses from "./Expenses";
import Savings from "./Savings";
import History from "./History";
import Stats from "./Stats";
import SavingsCalendar from "./SavingsCalendar";
import QRGenerator from "./QRGenerator";
import PairingVerification from "./PairingVerification";
import "./App.css";

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState("menu");
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Splash screen timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // ✅ FIX: Restore full user session from Firestore on page refresh
  // Previously: hanya console.log waktu user terdeteksi, tidak setUser()
  // Sekarang: fetch data Firestore lalu rebuild user object lengkap
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const userRef = doc(db, "users", firebaseUser.uid);
          const userDoc = await getDoc(userRef);

          if (userDoc.exists()) {
            const userData = userDoc.data();
            const isOwner =
              firebaseUser.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();

            const fullUser = {
              uid: firebaseUser.uid,
              name: userData.name || firebaseUser.displayName || "",
              email: firebaseUser.email,
              photo: userData.photo || firebaseUser.photoURL || "",
              gender: userData.gender || "",
              groupId: userData.groupId || null,
              role: isOwner ? "owner" : "viewer",
              isOwner: isOwner,
              approvalStatus: userData.approvalStatus || null,
            };

            if (isOwner) {
              // Owner langsung masuk tanpa cek approval
              setUser(fullUser);
            } else if (userData.approvalStatus === "approved") {
              // Viewer yang sudah di-approve masuk
              setUser(fullUser);
            } else {
              // Viewer belum di-approve → ke login flow
              setUser(null);
            }
          } else {
            // Belum ada data di Firestore (belum pernah isi form login)
            setUser(null);
          }
        } catch (error) {
          console.error("Error restoring session:", error);
          setUser(null);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Navigate to page with transition
  const handleNavigate = (page) => {
    if (page === currentPage) return;

    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentPage(page);
      setIsTransitioning(false);
    }, 300);
  };

  // ✅ FIX: Logout HANYA kalau manual — tidak ada auto logout saat refresh
  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setCurrentPage("menu");
      localStorage.removeItem("userRole");
    } catch (error) {
      console.error("Logout error:", error);
      alert("Gagal logout!");
    }
  };

  if (loading) {
    return (
      <div className="app loading" style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "linear-gradient(135deg, #FFE8F1 0%, #F0E6FF 100%)",
        fontSize: "18px",
        color: "#8B6F9E",
        fontWeight: "600"
      }}>
        ⏳ Memuat sesi...
      </div>
    );
  }

  if (showSplash) {
    return (
      <div className="app">
        <Splash onComplete={() => setShowSplash(false)} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="app">
        <Login setUser={setUser} />
      </div>
    );
  }

  return (
    <div className="app">
      <div className={`page-container ${isTransitioning ? "transitioning" : ""}`}>
        {currentPage === "menu" && (
          <Menu user={user} onNavigate={handleNavigate} onLogout={handleLogout} />
        )}

        {currentPage === "dashboard" && (
          <Dashboard user={user} onLogout={handleLogout} onNavigate={handleNavigate} />
        )}

        {currentPage === "expenses" && (
          <Expenses user={user} onNavigate={handleNavigate} />
        )}

        {currentPage === "savings" && (
          <Savings user={user} onNavigate={handleNavigate} />
        )}

        {currentPage === "income" && (
          <History user={user} onNavigate={handleNavigate} />
        )}

        {currentPage === "stats" && (
          <Stats user={user} onNavigate={handleNavigate} />
        )}

        {currentPage === "calendar" && (
          <SavingsCalendar user={user} onNavigate={handleNavigate} />
        )}

        {/* QR Generator - Owner Only */}
        {currentPage === "qr-generator" && user.isOwner === true && (
          <QRGenerator
            user={user}
            onBack={() => handleNavigate("menu")}
          />
        )}

        {currentPage === "pairing" && (
          <PairingVerification
            user={user}
            onBack={() => handleNavigate("menu")}
          />
        )}
      </div>
    </div>
  );
}

export default App; 