import React, { useState, useEffect } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { collection, query, where, getDocs, updateDoc, doc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import "./QRGenerator.css";

/**
 * QR GENERATOR - WORKING VERSION
 * 
 * - Real-time pending requests
 * - Accept/Reject functionality
 * - Show approved viewers
 * - Display QR code
 */

export default function QRGenerator({ user, onBack }) {
  const [qrValue, setQrValue] = useState(null);
  const [groupId, setGroupId] = useState(null);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [approvedViewers, setApprovedViewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showQR, setShowQR] = useState(false);

  // ✅ Load group data
  useEffect(() => {
    loadGroupData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.groupId]);

  const loadGroupData = async () => {
    try {
      if (!user?.groupId) {
        console.log("No groupId!");
        setLoading(false);
        setError("No group found");
        return;
      }

      console.log("Loading group:", user.groupId);

      const groupsRef = collection(db, "groups");
      const q = query(groupsRef, where("groupId", "==", user.groupId));
      
      // Real-time listener
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          console.log("Snapshot received!");
          
          if (snapshot.empty) {
            console.log("No group data!");
            setError("Group not found");
            setLoading(false);
            return;
          }

          const groupDoc = snapshot.docs[0];
          const groupData = groupDoc.data();

          console.log("Group data:", groupData);

          setGroupId(groupData.groupId);
          setQrValue(`yubul://group/${groupData.groupId}`);
          
          const allRequests = groupData.pendingApprovals || [];
          const pending = allRequests.filter(r => r.status !== "approved") || [];
          const approved = allRequests.filter(r => r.status === "approved") || [];
          
          console.log("Pending:", pending.length, "Approved:", approved.length);
          
          setPendingRequests(pending);
          setApprovedViewers(approved);
          setError(null);
          setLoading(false);
        },
        (error) => {
          console.error("Snapshot error:", error);
          setError("Error: " + error.message);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error("Error:", err);
      setError("Error: " + err.message);
      setLoading(false);
    }
  };

  const handleAccept = async (index) => {
    try {
      if (!groupId) return;

      const groupsRef = collection(db, "groups");
      const q = query(groupsRef, where("groupId", "==", groupId));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return;

      const groupDoc = snapshot.docs[0];
      const groupData = groupDoc.data();
      
      const updated = groupData.pendingApprovals.map((req, i) =>
        i === index ? { ...req, status: "approved" } : req
      );
      
      await updateDoc(doc(db, "groups", groupDoc.id), {
        pendingApprovals: updated,
      });

      const viewerRef = doc(db, "users", pendingRequests[index].uid);
      await updateDoc(viewerRef, {
        approvalStatus: "approved",
      });

      console.log("✅ Approved!");
    } catch (err) {
      console.error("Accept error:", err);
      alert("Error: " + err.message);
    }
  };

  const handleReject = async (index) => {
    try {
      if (!groupId) return;

      const groupsRef = collection(db, "groups");
      const q = query(groupsRef, where("groupId", "==", groupId));
      const snapshot = await getDocs(q);
      
      if (snapshot.empty) return;

      const groupDoc = snapshot.docs[0];
      const groupData = groupDoc.data();
      
      const updated = groupData.pendingApprovals.map((req, i) =>
        i === index ? { ...req, status: "rejected" } : req
      );
      
      await updateDoc(doc(db, "groups", groupDoc.id), {
        pendingApprovals: updated,
      });

      const viewerRef = doc(db, "users", pendingRequests[index].uid);
      await updateDoc(viewerRef, {
        approvalStatus: "rejected",
      });

      console.log("❌ Rejected!");
    } catch (err) {
      console.error("Reject error:", err);
      alert("Error: " + err.message);
    }
  };

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        flexDirection: "column",
        padding: "20px",
      }}>
        <div style={{
          background: "white",
          borderRadius: "20px",
          padding: "30px",
          marginBottom: "20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <button
            onClick={onBack}
            style={{
              padding: "10px 20px",
              border: "2px solid #D4A5E8",
              background: "white",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            ← Back
          </button>
          <h1 style={{ margin: "0", fontSize: "24px" }}>🔐 Generate QR Code</h1>
          <div></div>
        </div>

        <div style={{
          background: "white",
          borderRadius: "20px",
          padding: "60px 30px",
          textAlign: "center",
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <div>
            <div style={{
              width: "50px",
              height: "50px",
              border: "4px solid #E0E0E0",
              borderTop: "4px solid #667eea",
              borderRadius: "50%",
              animation: "spin 1s linear infinite",
              margin: "0 auto 20px",
            }}></div>
            <p style={{ fontSize: "18px", color: "#999", margin: "0" }}>Loading...</p>
          </div>
        </div>

        <style>{`
          @keyframes spin { to { transform: rotate(360deg); } }
        `}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        flexDirection: "column",
        padding: "20px",
      }}>
        <div style={{
          background: "white",
          borderRadius: "20px",
          padding: "30px",
          marginBottom: "20px",
        }}>
          <button
            onClick={onBack}
            style={{
              padding: "10px 20px",
              border: "2px solid #D4A5E8",
              background: "white",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
            }}
          >
            ← Back
          </button>
        </div>

        <div style={{
          background: "white",
          borderRadius: "20px",
          padding: "30px",
          textAlign: "center",
          border: "2px solid #E74C3C",
        }}>
          <p style={{ color: "#E74C3C", fontSize: "16px", fontWeight: "600", margin: "0" }}>
            ❌ {error}
          </p>
          <p style={{ color: "#999", fontSize: "14px", margin: "10px 0 0" }}>
            Check console for more details
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
      display: "flex",
      flexDirection: "column",
      padding: "20px",
      gap: "20px",
    }}>
      {/* HEADER */}
      <div style={{
        background: "white",
        borderRadius: "20px",
        padding: "30px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <button
          onClick={onBack}
          style={{
            padding: "10px 20px",
            border: "2px solid #D4A5E8",
            background: "white",
            borderRadius: "8px",
            cursor: "pointer",
            fontWeight: "600",
          }}
        >
          ← Back
        </button>
        <h1 style={{ margin: "0", fontSize: "24px" }}>🔐 Generate QR Code</h1>
        <div></div>
      </div>

      {/* QR SECTION */}
      <div style={{
        background: "white",
        borderRadius: "20px",
        padding: "30px",
      }}>
        <h2 style={{ margin: "0 0 20px", fontSize: "20px" }}>📱 QR Code</h2>
        
        {qrValue ? (
          <div style={{ textAlign: "center" }}>
            {showQR && (
              <div style={{ marginBottom: "20px" }}>
                <QRCodeCanvas
                  value={qrValue}
                  size={250}
                  level="H"
                  includeMargin={true}
                  style={{ border: "10px solid #fff", borderRadius: "10px" }}
                />
                <p style={{ marginTop: "15px", color: "#999", fontSize: "14px", margin: "0" }}>
                  <strong>Group ID:</strong> {groupId}
                </p>
              </div>
            )}
            
            <button
              onClick={() => setShowQR(!showQR)}
              style={{
                padding: "12px 24px",
                background: showQR ? "#E74C3C" : "#667eea",
                color: "white",
                border: "none",
                borderRadius: "12px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              {showQR ? "Hide QR" : "Show QR"}
            </button>
          </div>
        ) : (
          <p style={{ color: "#999", margin: "0" }}>❌ No QR code available</p>
        )}
      </div>

      {/* PENDING SECTION */}
      <div style={{
        background: "white",
        borderRadius: "20px",
        padding: "30px",
      }}>
        <h2 style={{ margin: "0 0 20px", fontSize: "20px" }}>⏳ Pending ({pendingRequests.length})</h2>
        
        {pendingRequests.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px", color: "#999" }}>
            <p style={{ fontSize: "48px", margin: "0" }}>📋</p>
            <p style={{ margin: "10px 0 0" }}>No pending requests</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
            {pendingRequests.map((request, index) => (
              <div key={index} style={{
                padding: "20px",
                border: "2px solid #E0E0E0",
                borderRadius: "12px",
                background: "#F9F9F9",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "15px" }}>
                  <img
                    src={request.photo || "https://via.placeholder.com/50"}
                    alt={request.name}
                    style={{ width: "50px", height: "50px", borderRadius: "50%", objectFit: "cover" }}
                  />
                  <div style={{ flex: 1 }}>
                    <p style={{ margin: "0", fontWeight: "600", color: "#333" }}>
                      {request.name} ({request.gender === "cowo" ? "👨" : "👩"})
                    </p>
                    <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#999" }}>
                      {request.email}
                    </p>
                  </div>
                </div>

                {request.deviceInfo && (
                  <div style={{
                    padding: "12px",
                    background: "white",
                    borderRadius: "8px",
                    marginBottom: "15px",
                    fontSize: "13px",
                  }}>
                    <p style={{ margin: "0 0 8px", fontWeight: "600" }}>📱 Device:</p>
                    <p style={{ margin: "0 0 4px" }}><strong>Type:</strong> {request.deviceInfo.deviceType}</p>
                    <p style={{ margin: "0 0 4px" }}><strong>OS:</strong> {request.deviceInfo.deviceOS}</p>
                    <p style={{ margin: "0 0 4px" }}><strong>Browser:</strong> {request.deviceInfo.deviceBrowser}</p>
                    <p style={{ margin: "0 0 4px" }}><strong>Model:</strong> {request.deviceInfo.deviceModel}</p>
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px" }}>
                  <button
                    onClick={() => handleAccept(index)}
                    style={{
                      flex: 1,
                      padding: "10px",
                      background: "#4CAF50",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    ✅ Accept
                  </button>
                  <button
                    onClick={() => handleReject(index)}
                    style={{
                      flex: 1,
                      padding: "10px",
                      background: "#E74C3C",
                      color: "white",
                      border: "none",
                      borderRadius: "8px",
                      fontWeight: "600",
                      cursor: "pointer",
                    }}
                  >
                    ❌ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* APPROVED SECTION */}
      {approvedViewers.length > 0 && (
        <div style={{
          background: "white",
          borderRadius: "20px",
          padding: "30px",
        }}>
          <h2 style={{ margin: "0 0 20px", fontSize: "20px" }}>✅ Approved ({approvedViewers.length})</h2>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {approvedViewers.map((viewer, index) => (
              <div key={index} style={{
                padding: "15px",
                background: "#F0F8F0",
                borderRadius: "12px",
                border: "2px solid #4CAF50",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}>
                <img
                  src={viewer.photo || "https://via.placeholder.com/40"}
                  alt={viewer.name}
                  style={{ width: "40px", height: "40px", borderRadius: "50%", objectFit: "cover" }}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: "0", fontWeight: "600", color: "#333" }}>
                    {viewer.name} ({viewer.gender === "cowo" ? "👨" : "👩"})
                  </p>
                  <p style={{ margin: "3px 0 0", fontSize: "12px", color: "#999" }}>
                    {viewer.email}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}