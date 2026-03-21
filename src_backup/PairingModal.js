import React, { useState, useRef } from "react";
import { QRCodeCanvas } from "qrcode.react";
import jsQR from "jsqr";
import { collection, addDoc, query, where, getDocs, updateDoc, doc } from "firebase/firestore";
import { db } from "./firebase";
import "./PairingModal.css";

/**
 * PAIRING MODAL COMPONENT - MODIFIED FOR STEP 4
 * 
 * Fungsi:
 * 1. Owner (Kamu):
 *    - Buat group baru
 *    - Generate QR code
 *    - Share QR ke partner
 * 
 * 2. Viewer (Cewe):
 *    - Scan QR code kamu
 *    - SEND APPROVAL REQUEST (not direct join!)
 *    - Wait for owner approval
 * 
 * Flow:
 * - Owner login → PairingModal shows "Create Group"
 * - Owner clicks → Generate QR code
 * - Cewe scan QR → Extract groupId
 * - Cewe SEND REQUEST (not join directly)
 * - Cewe wait for approval from owner
 * - Owner accept → cewe get access!
 */

export default function PairingModal({ user, onGroupCreated, onGroupJoined }) {
  // ============================================
  // STATE MANAGEMENT
  // ============================================

  const [mode, setMode] = useState(null); // "create" (owner), "scan" (viewer), null (waiting)
  const [groupId, setGroupId] = useState(null);
  const [qrValue, setQrValue] = useState(null); // QR code data
  const [showQR, setShowQR] = useState(false);
  
  // Scanning state
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [loading, setLoading] = useState(false);

  // ============================================
  // OWNER: CREATE GROUP & GENERATE QR
  // ============================================

  /**
   * FUNGSI: Buat group baru untuk owner
   * 
   * Apa yang terjadi:
   * 1. Generate unique groupId (format: GROUP-INITIALS-DATE-RANDOM)
   * 2. Buat dokumen di Firestore/groups
   * 3. Update user document (set groupId & role="owner")
   * 4. Generate QR code
   * 5. Show QR di UI
   * 
   * Contoh:
   * - groupId: "GROUP-YE-2025-0315-A1B2C3"
   * - QR contains: yubul://group/GROUP-YE-2025-0315-A1B2C3
   */
  const handleCreateGroup = async () => {
    setLoading(true);
    try {
      // Step 1: Generate unique groupId
      const initials = user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();

      const date = new Date().toISOString().split("T")[0].replace(/-/g, ""); // YYYYMMDD
      const random = Math.random().toString(36).substring(2, 8).toUpperCase(); // 6 char random

      const newGroupId = `GROUP-${initials}-${date}-${random}`;

      console.log("Creating group:", newGroupId);

      // Step 2: Create group document di Firestore
      const groupRef = await addDoc(collection(db, "groups"), {
        groupId: newGroupId,
        name: `${user.name}'s Group`,
        
        // Owner info
        ownerId: user.uid,
        ownerName: user.name,
        ownerPhoto: user.photo,
        
        // Members
        members: [], // Initially kosong, cewe akan ditambah saat owner accept
        memberCount: 1, // Just owner
        
        // ← NEW: Pending approvals (for requests waiting approval)
        pendingApprovals: [],
        
        // Pairing (QR aktif)
        qrCodeData: `yubul://group/${newGroupId}`, // Data untuk QR
        
        // Status
        isActive: true,
        isPaired: false, // Akan true saat cewe accepted
        
        // Timestamps
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log("Group created with ID:", groupRef.id);

      // Step 3: Update user document (set groupId & role)
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        groupId: newGroupId,
        role: "owner",
        updatedAt: new Date(),
      });

      console.log("User updated with groupId:", newGroupId);

      // Step 4: Set QR value (data yang akan di-encode ke QR)
      setGroupId(newGroupId);
      setQrValue(`yubul://group/${newGroupId}`); // URL yang akan di-scan
      setShowQR(true);

      console.log("QR ready for scanning!");

      // Step 5: Callback ke parent (Login.js)
      onGroupCreated(newGroupId);

      alert("✅ Group created! Scan QR code ke HP partner 📱");
    } catch (error) {
      console.error("Error creating group:", error);
      alert(`❌ Gagal buat group: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // VIEWER: SCAN QR & SEND APPROVAL REQUEST
  // ============================================

  /**
   * FUNGSI: Start camera untuk scan QR
   * 
   * Apa yang terjadi:
   * 1. Request camera permission
   * 2. Get camera stream
   * 3. Display video feed
   * 4. Start scanning loop (jsQR)
   */
  const handleStartScanning = async () => {
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }, // Back camera
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        startScanning(); // Start QR detection loop
      }
    } catch (error) {
      console.error("Camera error:", error);
      alert("❌ Tidak bisa akses camera. Check permissions!");
      setScanning(false);
    }
  };

  /**
   * FUNGSI: Scan loop - detect QR code dari video
   * 
   * Loop terus sampai:
   * - QR ditemukan → extract data
   * - User stop scanning
   * - Error
   */
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
          return; // Stop scanning jika found
        }
      }

      // Continue scanning
      requestAnimationFrame(scan);
    };

    scan();
  };

  /**
   * FUNGSI: Stop camera scanning
   */
  const handleStopScanning = () => {
    setScanning(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
    }
  };

  /**
   * FUNGSI: Process scan result & SEND APPROVAL REQUEST
   * 
   * ← MODIFIED FOR STEP 4
   * 
   * Apa yang terjadi:
   * 1. Extract groupId dari QR data
   *    Format: "yubul://group/GROUP-YE-2025-0315-A1B2C3"
   * 2. Validate group exists di Firestore
   * 3. SEND APPROVAL REQUEST (add to pendingApprovals[])
   *    - NOT adding to members[] yet!
   * 4. Update user document (set groupId, role, approvalStatus)
   * 5. Callback to parent (Login.js will show WaitingApproval)
   */
  const handleJoinGroup = async () => {
    if (!scanResult) {
      alert("❌ No QR result!");
      return;
    }

    setLoading(true);
    try {
      // Step 1: Extract groupId dari QR data
      // Format: "yubul://group/GROUP-YE-2025-0315-A1B2C3"
      const extractedGroupId = scanResult.split("/").pop();

      console.log("Extracted groupId:", extractedGroupId);

      // Step 2: Validate group exists
      const groupsRef = collection(db, "groups");
      const q = query(groupsRef, where("groupId", "==", extractedGroupId));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error("❌ Group tidak ditemukan! QR mungkin invalid.");
      }

      const groupDoc = querySnapshot.docs[0];
      const groupData = groupDoc.data();

      console.log("Group found:", groupData);

      // ← STEP 3: SEND APPROVAL REQUEST (NEW!)
      // Add to pendingApprovals[] instead of members[]
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
        // ← NOT adding to members[] yet! Will be added when owner approves
        updatedAt: new Date(),
      });

      console.log("Approval request sent to owner");

      // ← STEP 4: Update user document
      // Set approvalStatus = "pending" (waiting for owner approval)
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, {
        groupId: extractedGroupId,
        role: "viewer",
        approvalStatus: "pending", // ← NEW! Not approved yet
        approvalRequestedAt: new Date(), // ← NEW! Track when requested
        updatedAt: new Date(),
      });

      console.log("User updated with pending approval status");

      // ← STEP 5: Callback to parent
      // Parent (Login.js) will detect approvalStatus = "pending"
      // and show WaitingApproval screen
      onGroupJoined(extractedGroupId);

      setScanResult(null);
      alert("✅ Request sent! Waiting for owner approval... 🤞");
    } catch (error) {
      console.error("Error sending approval request:", error);
      alert(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ============================================
  // MODAL UI
  // ============================================

  return (
    <div className="pairing-modal-overlay">
      <div className="pairing-modal-content">
        {/* STEP 1: Choose Mode (Owner/Viewer) */}
        {!mode && (
          <div className="pairing-step">
            <h2>💑 Pair dengan Partner</h2>
            <p>Pilih role kamu:</p>

            <div className="button-group">
              <button
                onClick={() => setMode("create")}
                className="btn-create"
                disabled={loading}
              >
                👨 Saya Owner (yang punya akun pertama)
              </button>
              <button
                onClick={() => setMode("scan")}
                className="btn-scan"
                disabled={loading}
              >
                👩 Saya Viewer (partner kamu)
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: OWNER - Generate QR */}
        {mode === "create" && !showQR && (
          <div className="pairing-step">
            <h2>📱 Create & Share QR</h2>
            <p>Generate QR code untuk partner scan:</p>

            <button
              onClick={handleCreateGroup}
              disabled={loading}
              className="btn-primary"
            >
              {loading ? "Membuat..." : "Generate QR Code"}
            </button>

            <p className="info-text">
              Setelah generate, scan dengan HP partner.
            </p>
          </div>
        )}

        {/* STEP 3: OWNER - Show QR */}
        {mode === "create" && showQR && qrValue && (
          <div className="pairing-step">
            <h2>📲 Scan QR Code Ini</h2>
            <p>Minta partner scan QR code di bawah:</p>

            <div className="qr-container">
              <QRCodeCanvas
                value={qrValue}
                size={256}
                level="H"
                includeMargin={true}
              />
            </div>

            <div className="group-info">
              <p>
                <strong>Group ID:</strong> {groupId}
              </p>
              <p className="smaller">Kirim foto QR ke partner via WhatsApp/SMS</p>
            </div>

            <button
              onClick={() => {
                setMode(null);
                setShowQR(false);
              }}
              className="btn-secondary"
            >
              Done
            </button>
          </div>
        )}

        {/* STEP 4: VIEWER - Scan QR */}
        {mode === "scan" && !scanResult && (
          <div className="pairing-step">
            <h2>📸 Scan QR Code</h2>
            <p>Scan QR code dari owner:</p>

            {!scanning && (
              <button
                onClick={handleStartScanning}
                disabled={loading}
                className="btn-primary"
              >
                {loading ? "Membuka camera..." : "Buka Camera"}
              </button>
            )}

            {scanning && (
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
            )}
          </div>
        )}

        {/* STEP 5: VIEWER - Confirm Send Request */}
        {mode === "scan" && scanResult && (
          <div className="pairing-step">
            <h2>✅ QR Detected!</h2>
            <p>QR code terdeteksi. Send request untuk owner approval?</p>

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
        )}
      </div>
    </div>
  );
}

/**
 * FLOW SUMMARY - MODIFIED FOR STEP 4:
 * 
 * OWNER (Kamu):
 * 1. Click "Generate QR Code"
 * 2. groupId dibuat & di-save ke Firestore
 * 3. QR code di-generate
 * 4. Share QR ke Cewe
 * 5. Open PairingVerification menu → see pending requests
 * 6. Accept cewe request
 * 
 * VIEWER (Cewe):
 * 1. Click "Scan QR Code"
 * 2. Open camera
 * 3. Scan QR code dari owner
 * 4. Extract groupId
 * 5. SEND APPROVAL REQUEST (not join directly!)
 * 6. Login.js show WaitingApproval screen ⏳
 * 7. Wait for owner to accept
 * 8. Owner accept → approvalStatus = "approved"
 * 9. Real-time listener → redirect to Menu ✅
 * 
 * KEY CHANGE FROM STEP 3 TO STEP 4:
 * - OLD: Cewe scan → direct add to members[] → immediate access
 * - NEW: Cewe scan → add to pendingApprovals[] → wait for approval → owner accept → access
 * 
 * FIRESTORE UPDATES:
 * - groups.pendingApprovals[] ← updated when cewe scan
 * - groups.members[] ← updated when owner accept (not when scan!)
 * - users.approvalStatus ← "pending" when scan, "approved" when owner accept
 */