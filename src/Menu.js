import React, { useState } from "react";
import EditProfile from "./EditProfile";
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
        <button onClick={onLogout} className="menu-logout-btn">
          🚪 Logout
        </button>
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