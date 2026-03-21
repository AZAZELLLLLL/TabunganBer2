import React from "react";
import "./Menu.css";

export default function Menu({ user, onNavigate, onLogout }) {
  const menuItems = [
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
    // ← ADD THESE LINES (Owner-only pairing menu)
    ...(user.role === "owner" ? [
      {
        id: "pairing",
        emoji: "🔐",
        label: "Verifikasi Pairing",
        description: "Manage partner requests",
        color: "pairing",
      }
    ] : []),
  ];

  return (
    <div className="menu-page">
      {/* Header */}
      <header className="menu-header">
        <div className="menu-header-content">
          <div className="menu-logo">
            <h1>💕 Infinity Love</h1>
            <p>Kelola Keuangan Berdua</p>
          </div>
          <div className="menu-user">
            <img src={user.photo} alt={user.name} />
            <div>
              <p>{user.name}</p>
              <small>{user.role === "cowo" ? "👨 Cowo" : "👩 Cewe"}</small>
            </div>
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
    </div>
  );
}