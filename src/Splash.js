import React, { useEffect, useState } from "react";
import "./Splash.css";

export default function Splash({ onComplete }) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    setShowContent(true);
    const timer = setTimeout(() => {
      onComplete();
    }, 3000); // 3 detik loading

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="splash-container">
      <div className={`splash-content ${showContent ? "active" : ""}`}>
        {/* Animated Background */}
        <div className="splash-bg">
          <div className="blob blob-1"></div>
          <div className="blob blob-2"></div>
          <div className="blob blob-3"></div>
        </div>

        {/* Main Content */}
        <div className="splash-main">
          {/* Floating Hearts */}
          <div className="floating-hearts">
            <span className="heart heart-1">💕</span>
            <span className="heart heart-2">💑</span>
            <span className="heart heart-3">💰</span>
            <span className="heart heart-4">✨</span>
          </div>

  {/* Logo & Title */}
          <div className="splash-logo">
            <img src="/logo_nobg.png" alt="Tabungan Berdua" className="logo-image" />
          </div>

          <h1 className="splash-brand">Yubul</h1>
          <h2 className="splash-title">Tabungan Berdua</h2>
          <p className="splash-subtitle">Kelola Keuangan Bersama Pasangan</p>

          {/* Loading Animation */}
          <div className="loading-animation">
            <div className="loading-bar"></div>
            <p className="loading-text">Mempersiapkan aplikasi untuk kalian...</p>
          </div>

          {/* Animated Text */}
          <div className="splash-text">
            <p className="text-line">
              <span>💕</span> Cinta
            </p>
            <p className="text-line">
              <span>+</span> Uang
            </p>
            <p className="text-line">
              <span>=</span> Harmonis
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}