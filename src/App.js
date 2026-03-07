import React, { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "./firebase";
import Splash from "./Splash";
import Login from "./login";
import "./App.css";

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser({
          uid: currentUser.uid,
          name: currentUser.displayName,
          email: currentUser.email,
          photo: currentUser.photoURL,
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

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      localStorage.removeItem("userRole");
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleSplashComplete = () => {
    setShowSplash(false);
  };

  if (showSplash) {
    return <Splash onComplete={handleSplashComplete} />;
  }

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          background: "linear-gradient(135deg, #ffeef6 0%, #fff8f0 50%, #f0e6ff 100%)",
          fontSize: "18px",
          color: "#8B6F9E",
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <div className="app">
      {user ? (
        <div>
          <p>Dashboard (Coming Soon)</p>
          <button onClick={handleLogout}>Logout</button>
        </div>
      ) : (
        <Login setUser={setUser} />
      )}
    </div>
  );
}

export default App;