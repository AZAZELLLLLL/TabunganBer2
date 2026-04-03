import React, { useState, useRef } from "react";
import jsQR from "jsqr";
import { collection, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "./firebase";
import { getDeviceInfo } from "./DeviceDetection";
import "./QRScan.css";

/**
 * QR SCAN COMPONENT - VIEWER ONLY
 * 
 * Ditampilkan saat:
 * - Viewer (non-owner email) login untuk pertama kali
 * - Belum scan QR apapun
 * 
 * Flow:
 * 1. User click "Buka Camera"
 * 2. Camera opens
 * 3. Scan QR code
 * 4. Collect device info (type, OS, browser, etc)
 * 5. Send approval request + device info to Firestore
 * 6. Callback ke parent → show WaitingApproval
 */

export default function QRScan({ user, onComplete }) {
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [manualGroupId, setManualGroupId] = useState("");
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  // Start scanning
  const handleStartScanning = async () => {
    setScanning(true);
    setError(null);
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        startQRScan();
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("❌ Cannot access camera. Please check permissions!");
      setScanning(false);
    }
  };

  // QR scanning loop
  const startQRScan = () => {
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
          console.log("✅ QR detected:", code.data);
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

  const extractGroupId = (rawValue) => {
    const value = String(rawValue || "").trim();
    if (!value) return "";
    if (value.startsWith("yubul://group/")) {
      return value.split("/").pop()?.trim() || "";
    }

    return value;
  };

  const submitJoinRequest = async (rawGroupValue) => {
    const extractedGroupId = extractGroupId(rawGroupValue).toUpperCase();

    if (!extractedGroupId) {
      throw new Error("Group ID belum diisi.");
    }

    console.log("Extracted groupId:", extractedGroupId);

    // Validate group exists
    const groupsRef = collection(db, "groups");
    const q = query(groupsRef, where("groupId", "==", extractedGroupId));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      throw new Error("Group tidak ditemukan. Cek lagi QR atau Group ID yang dimasukkan.");
    }

    const groupDoc = querySnapshot.docs[0];
    const groupData = groupDoc.data();
    console.log("Group found:", groupData);

    // ← COLLECT DEVICE INFO
    console.log("Collecting device information...");
    const deviceInfo = getDeviceInfo();
    console.log("Device info:", deviceInfo);

    const pendingRequest = {
      uid: user.uid,
      name: user.name,
      email: user.email,
      photo: user.photo,
      gender: user.gender || "",
      scannedAt: new Date(),
      status: "pending",
      deviceInfo,
    };

    const existingRequests = Array.isArray(groupData.pendingApprovals)
      ? groupData.pendingApprovals
      : [];
    const nextApprovals = existingRequests.some((request) => request.uid === user.uid)
      ? existingRequests.map((request) =>
          request.uid === user.uid ? { ...request, ...pendingRequest } : request
        )
      : [...existingRequests, pendingRequest];

    // Send approval request to owner
    await updateDoc(doc(db, "groups", groupDoc.id), {
      pendingApprovals: nextApprovals,
      updatedAt: new Date(),
    });

    console.log("✅ Approval request sent to owner!");

    // Callback to parent with groupId & device info
    onComplete(extractedGroupId, deviceInfo);
  };

  // Process QR scan result
  const handleConfirmScan = async () => {
    if (!scanResult) {
      setError("No QR code scanned!");
      return;
    }

    setLoading(true);
    try {
      await submitJoinRequest(scanResult);
      setLoading(false);
    } catch (err) {
      console.error("Error:", err);
      setError("❌ Error: " + err.message);
      setLoading(false);
    }
  };

  const handleManualJoin = async () => {
    setLoading(true);
    setError(null);

    try {
      await submitJoinRequest(manualGroupId);
      setLoading(false);
    } catch (err) {
      console.error("Manual join error:", err);
      setError("❌ Error: " + err.message);
      setLoading(false);
    }
  };

  // Cancel scan
  const handleCancelScan = () => {
    setScanResult(null);
    setError(null);
  };

  // UI: Camera scanning
  if (scanning && !scanResult) {
    return (
      <div className="qrscan-page">
        <div className="qrscan-container">
          <div className="qrscan-header">
            <h1>📸 Scan QR Code</h1>
            <p>Point camera to QR code from owner:</p>
          </div>

          <div className="camera-container">
            <video ref={videoRef} autoPlay playsInline className="camera-video" />
            <canvas ref={canvasRef} hidden></canvas>
            
            <div className="camera-overlay">
              <div className="camera-frame"></div>
            </div>
          </div>

          <button
            onClick={handleStopScanning}
            className="btn-cancel"
          >
            ❌ Stop Scanning
          </button>
        </div>
      </div>
    );
  }

  // UI: QR detected
  if (scanResult && !scanning) {
    return (
      <div className="qrscan-page">
        <div className="qrscan-container">
          <div className="qrscan-header">
            <h1>✅ QR Code Detected!</h1>
            <p>QR code scanned successfully</p>
          </div>

          <div className="scan-result">
            <div className="result-icon">✅</div>
            <p className="result-text">{scanResult}</p>
          </div>

          <div className="device-info-preview">
            <h3>📱 Device Information:</h3>
            <div className="device-details">
              <p><span>Device:</span> {getDeviceInfo().deviceType}</p>
              <p><span>OS:</span> {getDeviceInfo().deviceOS}</p>
              <p><span>Browser:</span> {getDeviceInfo().deviceBrowser}</p>
              <small className="device-hint">
                Owner akan lihat info ini untuk memverifikasi request mu
              </small>
            </div>
          </div>

          <div className="button-group">
            <button
              onClick={handleConfirmScan}
              disabled={loading}
              className="btn-success"
            >
              {loading ? "Sending..." : "✅ Send Request to Owner"}
            </button>
            <button
              onClick={handleCancelScan}
              disabled={loading}
              className="btn-secondary"
            >
              ❌ Cancel
            </button>
          </div>

          {error && <p className="error-message">{error}</p>}
        </div>
      </div>
    );
  }

  // UI: Initial scan screen (no camera yet)
  return (
    <div className="qrscan-page">
      <div className="qrscan-container">
        <div className="qrscan-header">
          <h1>🔐 Verify with QR Code</h1>
          <p>Scan QR code from owner to request access:</p>
        </div>

        <div className="qrscan-illustration">
          <div className="qr-icon">📱</div>
          <p>Ask owner to share their QR code</p>
        </div>

        <button
          onClick={handleStartScanning}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? "Opening camera..." : "📷 Open Camera"}
        </button>

        <div className="manual-join-box">
          <h3>Atau masuk pakai Group ID</h3>
          <p>Kalau QR tidak muncul atau kamera susah scan, minta owner kirim Group ID.</p>
          <input
            type="text"
            value={manualGroupId}
            onChange={(event) => setManualGroupId(event.target.value.toUpperCase())}
            placeholder="Contoh: GROUP-YB-20260401-ABC123"
            className="manual-group-input"
            disabled={loading}
          />
          <button
            onClick={handleManualJoin}
            disabled={loading || !manualGroupId.trim()}
            className="btn-primary manual-join-btn"
          >
            {loading ? "Mengirim..." : "Masuk dengan Group ID"}
          </button>
        </div>

        <div className="qrscan-steps">
          <h3>📋 How it works:</h3>
          <ol>
            <li>Ask owner to generate QR code</li>
            <li>Click "📷 Open Camera"</li>
            <li>Point camera to QR code</li>
            <li>Send request to owner</li>
            <li>Wait for approval ⏳</li>
          </ol>
        </div>

        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
}

/**
 * PARENT COMPONENT (Login.js) EXPECTED:
 * 
 * <QRScan
 *   user={{ uid, name, email, photo }}
 *   onComplete={handleQRScanComplete}
 * />
 * 
 * onComplete callback signature:
 * (groupId, deviceInfo) => void
 */
