import React, { useState, useRef } from "react";
import jsQR from "jsqr";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "./firebase";
import "./PairingModal.css";

/**
 * PAIRING MODAL - SIMPLIFIED VERSION
 * 
 * Changes dari version sebelumnya:
 * ❌ REMOVED: Mode selection ("create" / "scan")
 * ❌ REMOVED: handleCreateGroup (owner flow)
 * ✅ KEEP: Only scan QR functionality (viewer only)
 * ✅ KEEP: Real-time listener
 * 
 * Note: QRGenerator component sekarang handle owner QR creation
 * PairingModal hanya untuk viewer yang mau scan QR
 */

export default function PairingModal({ user, onGroupJoined }) {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(false);

  // Start scanning
  const handleStartScanning = async () => {
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        startScanning();
      }
    } catch (error) {
      console.error("Camera error:", error);
      alert("❌ Tidak bisa akses camera. Check permissions!");
      setScanning(false);
    }
  };

  // Scanning loop
  const startScanning = () => {
    const canvas = canvasRef.current;
    const video = videoRef.current;

    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d");

    const scan = () => {
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.hidden = false;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          console.log("QR detected:", code.data);
          setScanResult(code.data);
          handleStopScanning();
          return;
        }
      }

      requestAnimationFrame(scan);
    };

    scan();
  };

  // Stop scanning
  const handleStopScanning = () => {
    setScanning(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
    }
  };

  // Process QR scan & send approval request
  const handleJoinGroup = async () => {
    if (!scanResult) {
      alert("❌ No QR result!");
      return;
    }

    setLoading(true);
    try {
      // Extract groupId dari QR data
      const extractedGroupId = scanResult.split("/").pop();

      console.log("Extracted groupId:", extractedGroupId);

      // Validate group exists
      const groupsRef = collection(db, "groups");
      const q = query(groupsRef, where("groupId", "==", extractedGroupId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("❌ Group tidak ditemukan! QR invalid.");
      }

      const groupDoc = querySnapshot.docs[0];
      const groupData = groupDoc.data();

      console.log("Group found:", groupData);

      // Send approval request (tanpa device info, akan dihandle di QRScan)
      const pendingRequest = {
        uid: user.uid,
        name: user.name,
        email: user.email,
        photo: user.photo,
        scannedAt: new Date(),
        status: "pending",
      };

      await updateDoc(doc(db, "groups", groupDoc.id), {
        pendingApprovals: [...(groupData.pendingApprovals || []), pendingRequest],
        updatedAt: new Date(),
      });

      console.log("Approval request sent");

      // Update user
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        groupId: extractedGroupId,
        role: "viewer",
        approvalStatus: "pending",
        approvalRequestedAt: new Date(),
        updatedAt: new Date(),
      });

      console.log("User updated with pending approval");

      // Callback
      onGroupJoined(extractedGroupId);

      setScanResult(null);
      alert("✅ Request sent! Waiting for owner approval... 🤞");
    } catch (error) {
      console.error("Error:", error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // UI: Scanning camera
  if (scanning && !scanResult) {
    return (
      <div className="pairing-modal-overlay">
        <div className="pairing-modal-content">
          <div className="pairing-step">
            <h2>📸 Scan QR Code</h2>
            <p>Point camera ke QR code dari owner:</p>

            <div className="camera-container">
              <video ref={videoRef} autoPlay playsInline />
              <canvas ref={canvasRef} hidden></canvas>
              <button
                onClick={handleStopScanning}
                className="btn-secondary"
              >
                Stop Scanning
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // UI: QR detected
  if (scanResult && !scanning) {
    return (
      <div className="pairing-modal-overlay">
        <div className="pairing-modal-content">
          <div className="pairing-step">
            <h2>✅ QR Detected!</h2>
            <p>QR code terdeteksi. Confirm untuk send request?</p>

            <div className="confirmation">
              <p className="scan-result">{scanResult}</p>
            </div>

            <div className="button-group">
              <button
                onClick={handleJoinGroup}
                disabled={loading}
                className="btn-success"
              >
                {loading ? "Sending..." : "Send Request"}
              </button>
              <button
                onClick={() => setScanResult(null)}
                className="btn-secondary"
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // UI: Initial scan screen (ONLY SCAN, NO MODE SELECTION!)
  return (
    <div className="pairing-modal-overlay">
      <div className="pairing-modal-content">
        <div className="pairing-step">
          <h2>📸 Scan QR Code</h2>
          <p>Scan QR code dari owner untuk verify akun kamu:</p>

          <button
            onClick={handleStartScanning}
            disabled={loading}
            className="btn-primary"
          >
            {loading ? "Membuka camera..." : "Buka Camera"}
          </button>

          <p className="info-text">
            Minta owner share QR code untuk di-scan. Setelah scan, request mu akan di-send ke owner untuk di-approve.
          </p>
        </div>
      </div>
    </div>
  );
}

/**
 * KEY CHANGES (SIMPLIFIED):
 * 
 * REMOVED:
 * ❌ Mode selection UI ("Create" / "Scan" buttons)
 * ❌ handleCreateGroup function (owner create QR)
 * ❌ setMode state
 * ❌ Owner QR creation logic
 * 
 * KEPT:
 * ✅ QR scanning for viewers
 * ✅ Device detection (via QRScan component)
 * ✅ Approval request sending
 * ✅ Camera access
 * ✅ Real-time listener (di parent Login.js)
 * 
 * NOTE:
 * - Owner QR creation sekarang di QRGenerator.js (Menu item)
 * - Viewer QR scan sekarang di QRScan.js (intercept setelah Google Auth)
 * - PairingModal jadi backup/alternative jika QRScan tidak berfungsi
 */