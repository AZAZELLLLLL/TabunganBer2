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
import "./App.css";

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState("menu");
  const [prevPage, setPrevPage] = useState(null);
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
        setUser({
          uid: currentUser.uid,
          name: currentUser.displayName || "User",
          email: currentUser.email,
          photo: currentUser.photoURL || "https://via.placeholder.com/150",
          role: localStorage.getItem("userRole") || "cowo",
          groupId: currentUser.uid,
        });
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
    setPrevPage(currentPage); // Simpan halaman sebelumnya

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
      </div>
    </div>
  );
}

export default App;