import React, { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "./firebase";
import "./Login.css";

export default function Login({ setUser }) {
  const [userRole, setUserRole] = useState("");
  const [loading, setLoading] = useState(false);

  const handleGoogleLogin = async () => {
    if (!userRole) {
      alert("Pilih kamu cowok atau cewek dulu! 💕");
      return;
    }

    try {
      setLoading(true);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      // Simpan role ke localStorage
      localStorage.setItem("userRole", userRole);

      setUser({
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        photo: user.photoURL,
        role: userRole,
        groupId: user.uid,
      });
    } catch (error) {
      console.error("Login failed:", error);
      alert("Login gagal! Coba lagi.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      {/* Background Elements */}
      <div className="login-bg">
        <div className="gradient-blob blob-1"></div>
        <div className="gradient-blob blob-2"></div>
        <div className="gradient-blob blob-3"></div>
      </div>

      {/* Main Container */}
      <div className="login-wrapper">
        {/* Left Side - Branding */}
        <div className="login-brand-section">
          <div className="brand-content">
            <div className="brand-emoji">💑</div>
            <h1 className="brand-name">Yubul</h1>
            <p className="brand-tagline">
              Tabungan berdua bareng pacar jadi makin <span>harmonis</span> 💕
            </p>

            {/* Features */}
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

            {/* Decorative Quote */}
            <div className="love-quote">
              <p>"Cinta + Uang Terkelola = Hubungan Sehat"</p>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="login-form-section">
          <div className="login-card">
            {/* Header */}
            <div className="login-header">
              <h2>Selamat datang di Yubul! 🎉</h2>
              <p>Mulai kelola keuangan berdua sekarang</p>
            </div>

            {/* Role Selection */}
            <div className="role-selection">
              <label className="role-label">Kamu siapa di hubungan ini? 👀</label>
              <div className="role-buttons">
                <button
                  className={`role-btn ${userRole === "cowo" ? "active" : ""}`}
                  onClick={() => setUserRole("cowo")}
                  disabled={loading}
                >
                  <span className="role-emoji">👨‍🦰</span>
                  <span>Cowo</span>
                </button>
                <button
                  className={`role-btn ${userRole === "cewe" ? "active" : ""}`}
                  onClick={() => setUserRole("cewe")}
                  disabled={loading}
                >
                  <span className="role-emoji">👩‍🦱</span>
                  <span>Cewe</span>
                </button>
              </div>
            </div>

            {/* Selected Status */}
            {userRole && (
              <div className="role-status">
                <p>
                  ✨ Mantap! Kamu pilih jadi{" "}
                  <strong>{userRole === "cowo" ? "Cowok" : "Cewe"}</strong> 💪
                </p>
              </div>
            )}

            {/* Google Login Button */}
            <button
              onClick={handleGoogleLogin}
              disabled={!userRole || loading}
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

            {/* Divider */}
            <div className="divider">
              <span>atau</span>
            </div>

            {/* Terms & Security */}
            <div className="login-footer">
              <p className="security-note">
                🔒 Data kamu aman dan terenkripsi dengan Firebase
              </p>
              <p className="terms-note">
                Dengan login, kamu setuju dengan Terms & Conditions kami
              </p>
            </div>
          </div>

          {/* Floating Elements */}
          <div className="floating-elements">
            <div className="float-emoji emoji-1">💕</div>
            <div className="float-emoji emoji-2">✨</div>
            <div className="float-emoji emoji-3">💑</div>
            <div className="float-emoji emoji-4">💰</div>
          </div>
        </div>
      </div>

      {/* Mobile Responsive Note */}
      <div className="mobile-only">
        <div className="login-card-mobile">
          <div className="login-header">
            <div className="brand-emoji-mobile">💑</div>
            <h2>Yubul</h2>
            <p>Tabungan Berdua Jadi Harmonis</p>
          </div>

          <div className="role-selection">
            <label className="role-label">Kamu siapa? 👀</label>
            <div className="role-buttons">
              <button
                className={`role-btn ${userRole === "cowo" ? "active" : ""}`}
                onClick={() => setUserRole("cowo")}
                disabled={loading}
              >
                <span>👨‍🦰 Cowo</span>
              </button>
              <button
                className={`role-btn ${userRole === "cewe" ? "active" : ""}`}
                onClick={() => setUserRole("cewe")}
                disabled={loading}
              >
                <span>👩‍🦱 Cewe</span>
              </button>
            </div>
          </div>

          {userRole && (
            <div className="role-status">
              <p>
                ✨ Mantap! Kamu{" "}
                <strong>{userRole === "cowo" ? "Cowok" : "Cewe"}</strong> 💪
              </p>
            </div>
          )}

          <button
            onClick={handleGoogleLogin}
            disabled={!userRole || loading}
            className="google-login-btn"
          >
            {loading ? "Sedang login..." : "Login dengan Google"}
          </button>

          <p className="security-note">🔒 Data aman dengan Firebase</p>
        </div>
      </div>
    </div>
  );
}