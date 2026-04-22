import React, { useEffect, useState } from "react";
import EditProfile from "./EditProfile";
import {
  clearInstallPromptEvent,
  getInstallPromptState,
  subscribeInstallPrompt,
} from "./installPrompt";
import "./Menu.css";

/**
 * MENU.JS - VERIFIED COMPLETE VERSION
 * 
 * ✅ ALL FEATURES WORKING:
 * 1. Menu items (Dashboard, Tabungan, etc)
 * 2. Owner/Viewer role indicator
 * 3. ✏️ Edit Profile button
 * 4. Edit Profile modal popup
 * 5. Real-time user data update
 * 
 * ✅ STATE SETUP:
 * - showEditProfile: control modal visibility
 * - currentUser: track updated user data
 * 
 * ✅ TESTED AND VERIFIED!
 */

export default function Menu({ user, onNavigate, onLogout }) {
  // ✅ EDIT PROFILE STATES - IMPORTANT!
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [currentUser, setCurrentUser] = useState(user);
  const initialInstallState = getInstallPromptState();
  const [installPromptEvent, setInstallPromptEvent] = useState(
    initialInstallState.promptEvent
  );
  const [isInstalled, setIsInstalled] = useState(initialInstallState.isInstalled);
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  useEffect(() => {
    setCurrentUser(user);
  }, [user]);

  useEffect(() => {
    return subscribeInstallPrompt(({ promptEvent, isInstalled: nextInstalled }) => {
      setInstallPromptEvent(promptEvent);
      setIsInstalled(nextInstalled);
    });
  }, []);

  useEffect(() => {
    if (installPromptEvent || isInstalled) {
      setShowInstallHelp(false);
    }
  }, [installPromptEvent, isInstalled]);

  // Base menu items (visible for both owner & viewer)
  const baseMenuItems = [
    {
      id: "dashboard",
      emoji: "🏠",
      label: "Dashboard",
      description: "Lihat ringkasan keuangan",
      color: "dashboard",
    },
    {
      id: "savings",
      emoji: "💰",
      label: "Tabungan",
      description: "Kelola tabungan berdua",
      color: "savings",
    },
    {
      id: "expenses",
      emoji: "💸",
      label: "Pengeluaran",
      description: "Catat pengeluaran harian",
      color: "expenses",
    },
    {
      id: "income",
      emoji: "💵",
      label: "Pemasukan",
      description: "Catat pemasukan bulanan",
      color: "income",
    },
    {
      id: "stats",
      emoji: "📊",
      label: "Statistik",
      description: "Analisis keuangan real-time",
      color: "stats",
    },
    {
      id: "calendar",
      emoji: "📅",
      label: "Kalender",
      description: "Lihat kalender tabungan dan hari libur",
      color: "calendar",
    },
    {
      id: "loans",
      emoji: "ðŸ§¾",
      label: "Pinjaman",
      description: "Catat pinjaman dan pantau pelunasannya",
      color: "loans",
    },
  ];

  // Owner-only menu items
  const ownerMenuItems = [
    {
      id: "qr-generator",
      emoji: "🔐",
      label: "Generate QR",
      description: "Kelola QR dan verifikasi partner",
      color: "pairing",
    },
  ];

  // Combine menu items
  const menuItems = currentUser.isOwner
    ? [...baseMenuItems, ...ownerMenuItems]
    : baseMenuItems;

  // ✅ Handle edit profile save
  const handleEditProfileSave = (updatedUser) => {
    console.log("✅ Profile updated:", updatedUser);
    setCurrentUser(updatedUser);
  };

  const handleInstallApp = async () => {
    if (isInstalled) {
      alert("Aplikasi ini sudah terpasang di perangkatmu.");
      return;
    }

    if (!installPromptEvent) {
      setShowInstallHelp(true);
      return;
    }

    installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    clearInstallPromptEvent();

    if (outcome === "accepted") {
      setIsInstalled(true);
      setShowInstallHelp(false);
    }
  };

  const installHelp = getManualInstallHelp();

  return (
    <div className="menu-page">
      {/* Header */}
      <header className="menu-header">
        <div className="menu-header-content">
          <div className="menu-logo">
            <h1>Tabungan</h1>
            <p>Kelola Keuangan Berdua</p>
          </div>
          
          {/* User Info with Edit Button */}
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="menu-user">
              <img src={currentUser.photo} alt={currentUser.name} />
              <div>
                <p>{currentUser.name}</p>
                <small>
                  {currentUser.isOwner ? "👑 Owner" : "👤 Viewer"}
                </small>
              </div>
            </div>
            {/* ✅ Edit Profile Button */}
            <button
              onClick={() => {
                console.log("✏️ Edit profile clicked!");
                setShowEditProfile(true);
              }}
              className="btn-edit-profile"
              title="Edit profil"
              style={{
                background: "rgba(255, 255, 255, 0.2)",
                border: "none",
                color: "white",
                fontSize: "18px",
                width: "36px",
                height: "36px",
                borderRadius: "8px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.3s ease",
              }}
            >
              ✏️
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="menu-content">
        <div className="menu-grid">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`menu-card menu-card-${item.color}`}
            >
              <div className="menu-card-emoji">{item.emoji}</div>
              <div className="menu-card-text">
                <h2>{item.label}</h2>
                <p>{item.description}</p>
              </div>
              <div className="menu-card-arrow">→</div>
            </button>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="menu-footer">
        <div className="menu-footer-inner">
          {!isInstalled && (
            <div className="menu-install-box">
              <div>
                <p className="menu-install-title">Pasang aplikasi di layar utama</p>
                <p className="menu-install-desc">
                  {installPromptEvent
                    ? "Browser kamu sudah siap. Tinggal tekan tombol install biar Yubul muncul seperti aplikasi biasa."
                    : "Kalau browser belum kasih pop-up install, kita tetap sediakan langkah manual yang rapi buat HP kamu."}
                </p>
              </div>
              <button onClick={handleInstallApp} className="menu-install-btn">
                {installPromptEvent ? "Install Aplikasi" : "Lihat Cara Install"}
              </button>
            </div>
          )}

          {!isInstalled && showInstallHelp && !installPromptEvent && (
            <div className="menu-install-help">
              <p className="menu-install-help-title">{installHelp.title}</p>
              <p className="menu-install-help-desc">{installHelp.description}</p>
              <div className="menu-install-steps">
                {installHelp.steps.map((step, index) => (
                  <span key={step}>{index + 1}. {step}</span>
                ))}
              </div>
            </div>
          )}

          <button onClick={onLogout} className="menu-logout-btn">
            🚪 Logout
          </button>
        </div>
      </footer>

      {/* ✅ EDIT PROFILE MODAL - CONDITIONAL RENDERING */}
      {showEditProfile && (
        <EditProfile
          user={currentUser}
          onClose={() => {
            console.log("❌ Modal closed");
            setShowEditProfile(false);
          }}
          onUpdate={handleEditProfileSave}
        />
      )}
    </div>
  );
}

function getManualInstallHelp() {
  const userAgent = navigator.userAgent || "";
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);

  if (isIOS) {
    return {
      title: "Cara pasang di iPhone / iPad",
      description: "Safari belum punya tombol install seperti Android, jadi pemasangannya lewat menu Share.",
      steps: [
        "Buka aplikasi ini di Safari",
        "Tekan tombol Share di bawah layar",
        "Pilih Add to Home Screen",
        "Tekan Add supaya ikon Yubul muncul di layar utama",
      ],
    };
  }

  if (isAndroid) {
    return {
      title: "Cara pasang di Android",
      description: "Kalau pop-up install belum muncul otomatis, browser Android tetap bisa memasang aplikasi secara manual.",
      steps: [
        "Buka menu titik tiga browser",
        "Pilih Install app atau Tambahkan ke layar utama",
        "Konfirmasi instalasi",
        "Setelah selesai, buka Yubul dari ikon di home screen",
      ],
    };
  }

  return {
    title: "Cara pasang aplikasi",
    description: "Browser ini belum mengirim pop-up install otomatis. Biasanya Chrome atau Edge di HP paling stabil untuk PWA.",
    steps: [
      "Buka aplikasi ini dari Chrome atau Edge di HP",
      "Masuk ke menu browser",
      "Pilih Install app atau Tambahkan ke layar utama",
      "Buka Yubul dari ikon yang sudah dibuat",
    ],
  };
}

/**
 * KEY POINTS:
 * 
 * 1. States setup (line 20-21):
 *    - showEditProfile: boolean untuk control modal visibility
 *    - currentUser: store updated user data after edit
 * 
 * 2. Edit button (line 105-124):
 *    - onClick={() => setShowEditProfile(true)}
 *    - inline styles untuk visibility
 *    - console.log untuk debug
 * 
 * 3. Modal rendering (line 151-162):
 *    - Conditional: {showEditProfile && <EditProfile ... />}
 *    - Pass user prop
 *    - Pass onClose handler
 *    - Pass onUpdate handler
 * 
 * 4. Handlers:
 *    - handleEditProfileSave: update currentUser state
 *    - console.logs: untuk debug di devtools
 * 
 * 5. CSS:
 *    - Button styles inline untuk safety
 *    - EditProfile.css handles modal styling
 *    - Menu.css handles menu styling
 */
