import React, { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

/**
 * EDITPROFILE - GOOGLE AVATAR VERSION
 * 
 * ✅ NO avatar upload needed!
 * ✅ Use Google profile avatar directly
 * ✅ Super fast - instant save!
 * ✅ No Firebase Storage needed (GRATIS!)
 * 
 * Features:
 * - Edit Nama
 * - Edit Gender
 * - Show Google Avatar (read-only, linked to Google account)
 * 
 * If user want change avatar:
 * → Go to Google Account settings
 * → https://myaccount.google.com/personal-info
 * → Change profile picture there
 */

export default function EditProfile({ user, onClose, onUpdate }) {
  const [name, setName] = useState(user.name || "");
  const [gender, setGender] = useState(user.gender || "cowo");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      setError("❌ Nama tidak boleh kosong!");
      return;
    }

    if (name.trim().length < 3) {
      setError("❌ Nama minimal 3 karakter!");
      return;
    }

    setLoading(true);
    setError(null);
    setProgress(30);

    try {
      setProgress(60);

      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        name: name.trim(),
        gender: gender,
        updatedAt: new Date(),
      });

      console.log("✅ Profile saved instantly!");
      setProgress(100);

      const updatedUserData = {
        ...user,
        name: name.trim(),
        gender: gender,
      };

      if (onUpdate) {
        onUpdate(updatedUserData);
      }

      alert("✅ Profil berhasil diperbarui!");

      setTimeout(() => {
        if (onClose) {
          onClose();
        }
      }, 500);
    } catch (err) {
      console.error("❌ Error:", err);
      setError("❌ " + err.message);
      setProgress(0);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setName(user.name || "");
    setGender(user.gender || "cowo");
    setError(null);
    setProgress(0);
    if (onClose) {
      onClose();
    }
  };

  const hasChanges =
    name.trim() !== user.name ||
    gender !== user.gender;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: "rgba(0, 0, 0, 0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "20px",
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
          maxWidth: "500px",
          width: "100%",
          maxHeight: "90vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px",
            background: "linear-gradient(135deg, #D4869B, #8B6F9E)",
            color: "white",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "20px" }}>✏️ Edit Profil</h2>
          <button
            onClick={handleCancel}
            disabled={loading}
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              border: "none",
              color: "white",
              fontSize: "24px",
              cursor: "pointer",
              width: "40px",
              height: "40px",
              borderRadius: "10px",
            }}
          >
            ✕
          </button>
        </div>

        {/* Progress Bar */}
        {loading && (
          <div
            style={{
              height: "4px",
              background: "#E0E0E0",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                background: "linear-gradient(90deg, #D4869B, #8B6F9E)",
                width: `${progress}%`,
                transition: "width 0.3s ease",
              }}
            />
          </div>
        )}

        {/* Content */}
        <div
          style={{
            padding: "30px",
            overflowY: "auto",
            flex: 1,
          }}
        >
          {error && (
            <div
              style={{
                background: "#FFE8E8",
                border: "2px solid #E74C3C",
                color: "#C0392B",
                padding: "12px",
                borderRadius: "8px",
                marginBottom: "20px",
              }}
            >
              {error}
            </div>
          )}

          {loading && (
            <div
              style={{
                background: "#E8F5E9",
                border: "2px solid #27AE60",
                color: "#27AE60",
                padding: "12px",
                borderRadius: "8px",
                marginBottom: "20px",
              }}
            >
              ⏳ Saving...
            </div>
          )}

          {/* Google Avatar Section */}
          <div style={{ textAlign: "center", marginBottom: "30px" }}>
            <h3 style={{ margin: "0 0 15px 0", color: "#666", fontSize: "14px" }}>
              👤 Avatar (dari Google Account)
            </h3>
            <img
              src={user.photo}
              alt="Google Avatar"
              style={{
                width: "120px",
                height: "120px",
                borderRadius: "50%",
                border: "4px solid #D4A5E8",
                objectFit: "cover",
                marginBottom: "15px",
              }}
            />
            <div style={{ fontSize: "12px", color: "#999" }}>
              Linked ke Google Account
            </div>
            <button
              onClick={() => {
                window.open("https://myaccount.google.com/personal-info", "_blank");
              }}
              style={{
                marginTop: "12px",
                padding: "8px 16px",
                background: "linear-gradient(135deg, #D4869B, #8B6F9E)",
                color: "white",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "12px",
              }}
            >
              🔗 Ubah di Google Account
            </button>
          </div>

          {/* Divider */}
          <div
            style={{
              height: "1px",
              background: "#E0E0E0",
              margin: "20px 0",
            }}
          />

          {/* Nama */}
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontWeight: "600",
                marginBottom: "8px",
                fontSize: "14px",
              }}
            >
              📝 Nama Lengkap
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masukkan nama lengkap"
              disabled={loading}
              maxLength="50"
              style={{
                width: "100%",
                padding: "12px",
                border: "2px solid #E0E0E0",
                borderRadius: "8px",
                fontSize: "14px",
                fontFamily: "inherit",
                boxSizing: "border-box",
              }}
            />
            <small style={{ color: "#999", display: "block", marginTop: "4px" }}>
              Nama ini akan muncul di semua halaman
            </small>
          </div>

          {/* Gender */}
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontWeight: "600",
                marginBottom: "8px",
                fontSize: "14px",
              }}
            >
              👫 Gender
            </label>
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setGender("cowo")}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "12px",
                  background:
                    gender === "cowo"
                      ? "linear-gradient(135deg, #D4869B, #8B6F9E)"
                      : "#F5F5F5",
                  color: gender === "cowo" ? "white" : "#333",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                👨 Cowo
              </button>
              <button
                onClick={() => setGender("cewe")}
                disabled={loading}
                style={{
                  flex: 1,
                  padding: "12px",
                  background:
                    gender === "cewe"
                      ? "linear-gradient(135deg, #D4869B, #8B6F9E)"
                      : "#F5F5F5",
                  color: gender === "cewe" ? "white" : "#333",
                  border: "none",
                  borderRadius: "8px",
                  cursor: "pointer",
                  fontWeight: "600",
                  opacity: loading ? 0.6 : 1,
                }}
              >
                👩 Cewe
              </button>
            </div>
          </div>

          {/* Info Box */}
          <div
            style={{
              background: "linear-gradient(135deg, #FFF8F0, #F0E6FF)",
              border: "2px solid #D4A5E8",
              padding: "12px",
              borderRadius: "8px",
              fontSize: "13px",
              color: "#666",
            }}
          >
            ⚡ <strong>INSTANT SAVE!</strong> Tidak perlu upload foto, langsung simpan!
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "20px",
            borderTop: "2px solid #FFE8F1",
            display: "flex",
            gap: "12px",
            background: "#F9F9F9",
          }}
        >
          <button
            onClick={handleCancel}
            disabled={loading}
            style={{
              flex: 1,
              padding: "12px",
              background: "#F5F5F5",
              color: "#333",
              border: "2px solid #E0E0E0",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              opacity: loading ? 0.6 : 1,
            }}
          >
            ❌ Batal
          </button>
          <button
            onClick={handleSaveProfile}
            disabled={loading || !hasChanges || !name.trim()}
            style={{
              flex: 1,
              padding: "12px",
              background:
                loading || !hasChanges || !name.trim()
                  ? "#CCC"
                  : "linear-gradient(135deg, #D4869B, #8B6F9E)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor:
                loading || !hasChanges || !name.trim()
                  ? "not-allowed"
                  : "pointer",
              fontWeight: "600",
            }}
          >
            {loading ? "⏳ Saving..." : "✅ Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * KEY DIFFERENCES FROM PREVIOUS VERSION:
 * 
 * ❌ REMOVED:
 * - Avatar upload button
 * - File input
 * - Image compression
 * - Firebase Storage upload
 * - Progress tracking for upload
 * 
 * ✅ ADDED:
 * - Google Avatar display (read-only)
 * - Link to Google Account settings
 * - Instant save (no upload)
 * 
 * ✅ BENEFITS:
 * - NO Firebase Storage needed
 * - NO upload delay
 * - INSTANT save (1-2 detik)
 * - Free tier Firebase is OK
 * - User avatar always in sync with Google Account
 * 
 * USER FLOW:
 * 1. Click ✏️ button
 * 2. Edit nama + gender
 * 3. Click Simpan → INSTANT! ✅
 * 4. Want change avatar? → Click "Ubah di Google Account"
 * 5. User go to Google settings, change photo
 * 6. Refresh app → new avatar appears ✅
 */