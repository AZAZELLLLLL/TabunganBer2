import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db, OWNER_EMAIL } from "./firebase";
import { ensureOwnerGroup } from "./groupUtils";
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

  // Restore session and keep user profile synced in real-time.
  useEffect(() => {
    let unsubscribeUserDoc = null;

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
        unsubscribeUserDoc = null;
      }

      if (firebaseUser) {
        setLoading(true);

        const userRef = doc(db, "users", firebaseUser.uid);
        unsubscribeUserDoc = onSnapshot(
          userRef,
          async (userDoc) => {
            if (!userDoc.exists()) {
              setUser(null);
              setLoading(false);
              return;
            }

            try {
              let userData = userDoc.data();
              const isOwner =
                firebaseUser.email?.toLowerCase() === OWNER_EMAIL.toLowerCase();

              if (isOwner) {
                const ensuredGroup = await ensureOwnerGroup({
                  uid: firebaseUser.uid,
                  email: firebaseUser.email || "",
                  name: userData.name || firebaseUser.displayName || "",
                  photo: userData.photo || firebaseUser.photoURL || "",
                  groupId: userData.groupId || null,
                });

                if (ensuredGroup?.groupId && ensuredGroup.groupId !== userData.groupId) {
                  userData = {
                    ...userData,
                    groupId: ensuredGroup.groupId,
                  };
                }
              }

              const fullUser = {
                uid: firebaseUser.uid,
                name: userData.name || firebaseUser.displayName || "",
                email: firebaseUser.email,
                photo: userData.photo || firebaseUser.photoURL || "",
                googlePhoto: firebaseUser.photoURL || "",
                gender: userData.gender || "",
                groupId: userData.groupId || null,
                role: isOwner ? "owner" : "viewer",
                isOwner,
                approvalStatus: userData.approvalStatus || null,
              };

              if (isOwner || userData.approvalStatus === "approved") {
                setUser(fullUser);
              } else {
                setUser(null);
              }
            } catch (error) {
              console.error("Error restoring session:", error);
              setUser(null);
            } finally {
              setLoading(false);
            }
          },
          (error) => {
            console.error("User snapshot error:", error);
            setUser(null);
            setLoading(false);
          }
        );
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      if (unsubscribeUserDoc) {
        unsubscribeUserDoc();
      }
      unsubscribeAuth();
    };
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
