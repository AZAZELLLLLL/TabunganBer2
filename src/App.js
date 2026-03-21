import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import Splash from "./Splash";
import Login from "./login";
import Menu from "./Menu";
import Dashboard from "./Dashboard";
import Expenses from "./Expenses";
import Savings from "./Savings";
import History from "./History";
import Stats from "./Stats";
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

  // Check authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        console.log("Firebase user detected:", currentUser.email);
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

  // Logout
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
    return <div className="app loading">Loading...</div>;
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