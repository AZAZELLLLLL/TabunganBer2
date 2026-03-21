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
import PairingVerification from "./PairingVerification"; // ← NEW
import "./App.css";

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState("menu");
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Handle splash screen
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  // Check if user is logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        // ← FIXED: Don't set user here, let Login.js handle it!
        // This is just for checking if logged in
        // Login.js will call setUser with proper data
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const handleNavigate = (page) => {
    if (page === currentPage) return;

    setIsTransitioning(true);

    setTimeout(() => {
      setCurrentPage(page);
      setIsTransitioning(false);
    }, 300);
  };

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

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  // Loading state
  if (loading) {
    return <div className="app loading">Loading...</div>;
  }

  // Splash screen
  if (showSplash) {
    return (
      <div className="app">
        <Splash onComplete={handleSplashComplete} />
      </div>
    );
  }

  // Not logged in - show login
  if (!user) {
    return (
      <div className="app">
        <Login setUser={setUser} />
      </div>
    );
  }

  // Logged in - show pages with transitions
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

        {/* ← ADD THIS: Handle pairing verification page */}
        {currentPage === "pairing" && (
          <PairingVerification
            user={user}
            onBack={() => setCurrentPage("menu")}
          />
        )}
      </div>
    </div>
  );
}

export default App;

/**
 * FIXES APPLIED:
 * 
 * 1. Removed localStorage role setting from useEffect
 *    └─ Login.js now handles all role management from Firestore
 * 
 * 2. Added PairingVerification import
 *    └─ For owner pairing management
 * 
 * 3. Added pairing page routing
 *    └─ if currentPage === "pairing" → show PairingVerification
 * 
 * 4. Cleaned up user state management
 *    └─ Let Login.js be responsible for setUser
 *    └─ App.js just checks auth state
 */