import React, { useMemo, useRef, useState } from "react";
import { collection, doc, getDocs, query, updateDoc, where } from "firebase/firestore";
import { db } from "./firebase";
import "./EditProfile.css";

const MAX_IMAGE_SIDE = 360;
const TARGET_IMAGE_BYTES = 240 * 1024;

function dataUrlSize(dataUrl = "") {
  const base64 = dataUrl.split(",")[1] || "";
  return Math.ceil((base64.length * 3) / 4);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("File foto tidak bisa dibaca."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Foto gagal diproses."));
    image.src = src;
  });
}

async function compressImage(file) {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);

  const ratio = Math.min(1, MAX_IMAGE_SIDE / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * ratio));
  canvas.height = Math.max(1, Math.round(image.height * ratio));

  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const qualities = [0.86, 0.74, 0.64, 0.54];
  let bestResult = canvas.toDataURL("image/jpeg", qualities[qualities.length - 1]);

  for (const quality of qualities) {
    const compressed = canvas.toDataURL("image/jpeg", quality);
    bestResult = compressed;
    if (dataUrlSize(compressed) <= TARGET_IMAGE_BYTES) {
      break;
    }
  }

  return {
    dataUrl: bestResult,
    width: canvas.width,
    height: canvas.height,
    size: dataUrlSize(bestResult),
  };
}

async function syncGroupProfile(user, nextProfile) {
  if (!user?.groupId) return;

  const groupQuery = query(
    collection(db, "groups"),
    where("groupId", "==", user.groupId)
  );
  const groupSnapshot = await getDocs(groupQuery);

  if (groupSnapshot.empty) return;

  const groupDoc = groupSnapshot.docs[0];
  const groupData = groupDoc.data();
  const groupUpdates = {};

  if (groupData.ownerId === user.uid) {
    if (groupData.ownerName !== nextProfile.name) {
      groupUpdates.ownerName = nextProfile.name;
    }
    if (groupData.ownerPhoto !== nextProfile.photo) {
      groupUpdates.ownerPhoto = nextProfile.photo;
    }
  }

  if (Array.isArray(groupData.pendingApprovals)) {
    const nextApprovals = groupData.pendingApprovals.map((request) => {
      if (request.uid !== user.uid) return request;

      return {
        ...request,
        name: nextProfile.name,
        photo: nextProfile.photo,
        gender: nextProfile.gender,
      };
    });

    const approvalsChanged =
      JSON.stringify(nextApprovals) !== JSON.stringify(groupData.pendingApprovals);

    if (approvalsChanged) {
      groupUpdates.pendingApprovals = nextApprovals;
    }
  }

  if (Object.keys(groupUpdates).length > 0) {
    groupUpdates.updatedAt = new Date();
    await updateDoc(doc(db, "groups", groupDoc.id), groupUpdates);
  }
}

export default function EditProfile({ user, onClose, onUpdate }) {
  const fileInputRef = useRef(null);
  const googlePhoto = user.googlePhoto || "";
  const currentPhoto = user.photo || googlePhoto || "";
  const startsWithCustomPhoto =
    Boolean(user.photo) && Boolean(googlePhoto) && user.photo !== googlePhoto;

  const [name, setName] = useState(user.name || "");
  const [gender, setGender] = useState(user.gender || "cowo");
  const [useGooglePhoto, setUseGooglePhoto] = useState(!startsWithCustomPhoto);
  const [customPhoto, setCustomPhoto] = useState(startsWithCustomPhoto ? user.photo : "");
  const [previewPhoto, setPreviewPhoto] = useState(currentPhoto);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [uploadInfo, setUploadInfo] = useState("");

  const finalPhoto = useMemo(() => {
    if (useGooglePhoto) {
      return googlePhoto || customPhoto || currentPhoto || "";
    }

    return customPhoto || googlePhoto || currentPhoto || "";
  }, [currentPhoto, customPhoto, googlePhoto, useGooglePhoto]);

  const hasChanges =
    name.trim() !== (user.name || "").trim() ||
    gender !== (user.gender || "") ||
    finalPhoto !== currentPhoto;

  const handlePickFile = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("File harus berupa gambar ya.");
      event.target.value = "";
      return;
    }

    try {
      setLoading(true);
      setError("");
      setSuccess("");

      const compressed = await compressImage(file);
      setCustomPhoto(compressed.dataUrl);
      setPreviewPhoto(compressed.dataUrl);
      setUseGooglePhoto(false);
      setUploadInfo(
        `${compressed.width}x${compressed.height}px • ${(compressed.size / 1024).toFixed(0)} KB`
      );
    } catch (uploadError) {
      console.error("Profile image error:", uploadError);
      setError(uploadError.message || "Foto belum berhasil diproses.");
    } finally {
      setLoading(false);
      event.target.value = "";
    }
  };

  const handleUseGooglePhoto = () => {
    setUseGooglePhoto(true);
    setPreviewPhoto(googlePhoto || customPhoto || currentPhoto || "");
    setUploadInfo(googlePhoto ? "Menggunakan foto profil Google." : "");
  };

  const handleUseCustomPhoto = () => {
    if (!customPhoto) {
      handlePickFile();
      return;
    }

    setUseGooglePhoto(false);
    setPreviewPhoto(customPhoto);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      setError("Nama tidak boleh kosong.");
      return;
    }

    if (name.trim().length < 3) {
      setError("Nama minimal 3 karakter.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccess("");

    try {
      const nextProfile = {
        name: name.trim(),
        gender,
        photo: finalPhoto,
      };

      await updateDoc(doc(db, "users", user.uid), {
        ...nextProfile,
        updatedAt: new Date(),
      });

      await syncGroupProfile(user, nextProfile);

      const updatedUser = {
        ...user,
        ...nextProfile,
      };

      onUpdate?.(updatedUser);
      setSuccess("Profil berhasil diperbarui dan langsung disinkronkan.");

      setTimeout(() => {
        onClose?.();
      }, 500);
    } catch (saveError) {
      console.error("Save profile error:", saveError);
      setError(saveError.message || "Profil belum berhasil disimpan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="edit-profile-modal-overlay" onClick={() => !loading && onClose?.()}>
      <div className="edit-profile-page" onClick={(event) => event.stopPropagation()}>
        <div className="edit-profile-header">
          <button className="edit-back-btn" onClick={onClose} disabled={loading}>
            Kembali
          </button>
          <h1>Edit Profil</h1>
          <div style={{ width: 90 }} />
        </div>

        <div className="edit-profile-content">
          <div className="edit-profile-container">
            {error && (
              <div className="edit-error-banner">
                <span>{error}</span>
                <button className="edit-error-close" onClick={() => setError("")}>
                  ×
                </button>
              </div>
            )}

            {success && <div className="edit-success-banner">{success}</div>}

            <section className="edit-section">
              <h2 className="section-title">Foto Profil</h2>
              <div className="avatar-preview-wrapper">
                <div className={`avatar-display ${hasChanges ? "changed" : ""}`}>
                  {previewPhoto ? (
                    <img src={previewPhoto} alt={name || "Preview profil"} />
                  ) : (
                    <div className="avatar-placeholder">
                      <span>👤</span>
                      <p>Belum ada foto</p>
                    </div>
                  )}
                  {hasChanges && <span className="avatar-changed-badge">Preview Baru</span>}
                </div>

                <div className="avatar-status">
                  <p className="status-label">Sumber Foto</p>
                  <p className="status-value">
                    {useGooglePhoto ? "Google Profile" : "Foto Kustom"}
                  </p>
                  {uploadInfo ? <p className="file-info">{uploadInfo}</p> : null}
                  <p className="edit-readonly-hint">
                    Foto kustom disimpan ringan di Firestore, jadi tidak perlu Firebase Storage.
                  </p>
                </div>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={handleFileChange}
              />

              <div
                className={`upload-dropzone ${customPhoto ? "has-file" : ""}`}
                onClick={() => !loading && handlePickFile()}
              >
                <div className="dropzone-content">
                  <span className="dropzone-icon">🖼️</span>
                  <p className="dropzone-title">Pilih foto dari HP atau laptop</p>
                  <p className="dropzone-subtitle">
                    Foto akan otomatis diperkecil supaya cepat tersimpan.
                  </p>
                  <p className="dropzone-hint">Format yang cocok: JPG, PNG, WEBP</p>
                </div>
              </div>

              <button
                className="edit-upload-btn"
                onClick={handleUseCustomPhoto}
                disabled={loading}
              >
                {customPhoto ? "Gunakan Foto Kustom" : "Upload Foto Kustom"}
              </button>

              <button
                className="edit-clear-btn"
                onClick={handleUseGooglePhoto}
                disabled={loading || !googlePhoto}
              >
                Pakai Foto Google
              </button>
            </section>

            <section className="edit-section">
              <h2 className="section-title">Data Profil</h2>
              <label className="edit-input-label" htmlFor="profile-name">
                Nama yang tampil di aplikasi
              </label>
              <input
                id="profile-name"
                className="edit-name-input"
                type="text"
                value={name}
                maxLength={50}
                disabled={loading}
                onChange={(event) => setName(event.target.value)}
                placeholder="Masukkan nama kamu"
              />
              <div className="edit-input-counter">
                <span className={name.trim().length > 40 ? "warning" : ""}>
                  {name.trim().length}/50
                </span>
              </div>

              <label className="edit-input-label">Peran di hubungan ini</label>
              <div className="edit-gender-actions">
                <button
                  type="button"
                  className={`edit-gender-btn ${gender === "cowo" ? "is-active cowo" : ""}`}
                  onClick={() => setGender("cowo")}
                  disabled={loading}
                >
                  👨 Cowo
                </button>
                <button
                  type="button"
                  className={`edit-gender-btn ${gender === "cewe" ? "is-active cewe" : ""}`}
                  onClick={() => setGender("cewe")}
                  disabled={loading}
                >
                  👩 Cewe
                </button>
              </div>

              <div className="edit-input-hint">
                <p>
                  Nama dan foto yang kamu simpan di sini akan langsung diperbarui di profil aktif
                  dan di data pairing group.
                </p>
              </div>
            </section>

            <section className="edit-section">
              <h2 className="section-title">Info Akun</h2>
              <div className="edit-account-info">
                <div className="edit-info-row">
                  <span className="edit-info-label">Email</span>
                  <span className="edit-info-value">{user.email || "-"}</span>
                </div>
                <div className="edit-info-row">
                  <span className="edit-info-label">Status</span>
                  <span className="edit-info-value">{user.isOwner ? "Owner" : "Viewer"}</span>
                </div>
                <div className="edit-info-row">
                  <span className="edit-info-label">Group</span>
                  <span className="edit-info-value">{user.groupId || "Belum terhubung"}</span>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div className="edit-profile-footer">
          <button className="edit-cancel-btn" onClick={onClose} disabled={loading}>
            Batal
          </button>
          <button className="edit-save-btn" onClick={handleSave} disabled={loading || !hasChanges}>
            {loading ? (
              <>
                <span className="edit-spinner" />
                Menyimpan...
              </>
            ) : (
              "Simpan Perubahan"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
