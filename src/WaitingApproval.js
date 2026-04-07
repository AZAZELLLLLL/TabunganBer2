import React, { useEffect, useRef, useState } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "./firebase";
import {
  getApprovalRequestByUid,
  isViewerBlockedStatus,
  resolveViewerApprovalStatus,
  subscribeToGroupByGroupId,
} from "./approvalUtils";
import "./WaitingApproval.css";

export default function WaitingApproval({
  user,
  onApproved,
  onRejected,
  deviceInfo,
}) {
  const [waitingMessage, setWaitingMessage] = useState("Waiting for owner approval...");
  const [showDeviceInfo, setShowDeviceInfo] = useState(false);
  const [latestUserData, setLatestUserData] = useState(null);
  const callbackLockRef = useRef(false);

  useEffect(() => {
    const userRef = doc(db, "users", user.uid);

    return onSnapshot(
      userRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          setLatestUserData(docSnapshot.data());
        }
      },
      (error) => {
        console.error("Error listening to user document:", error);
      }
    );
  }, [user.uid]);

  useEffect(() => {
    const activeGroupId = latestUserData?.groupId || user.groupId;

    if (!activeGroupId) {
      return () => {};
    }

    return subscribeToGroupByGroupId(
      activeGroupId,
      async (groupData) => {
        const effectiveStatus = resolveViewerApprovalStatus({
          userData: latestUserData,
          groupData,
          viewerUid: user.uid,
        });

        if (effectiveStatus === "approved") {
          setWaitingMessage("Approved! Redirecting...");

          if (latestUserData?.approvalStatus !== "approved") {
            try {
              const requestData = getApprovalRequestByUid(groupData, user.uid);
              await updateDoc(doc(db, "users", user.uid), {
                approvalStatus: "approved",
                approvalApprovedAt: requestData?.approvedAt || new Date(),
                updatedAt: new Date(),
              });
            } catch (syncError) {
              console.warn("Viewer self-sync approval skipped:", syncError);
            }
          }

          if (!callbackLockRef.current) {
            callbackLockRef.current = true;
            window.setTimeout(() => {
              onApproved();
            }, 900);
          }

          return;
        }

        if (isViewerBlockedStatus(effectiveStatus)) {
          setWaitingMessage(
            effectiveStatus === "logged_out"
              ? "Session kamu dihentikan owner"
              : "Request rejected"
          );

          if (latestUserData?.approvalStatus !== effectiveStatus) {
            try {
              await updateDoc(doc(db, "users", user.uid), {
                approvalStatus: effectiveStatus,
                updatedAt: new Date(),
              });
            } catch (syncError) {
              console.warn("Viewer self-sync blocked status skipped:", syncError);
            }
          }

          if (!callbackLockRef.current) {
            callbackLockRef.current = true;
            window.setTimeout(() => {
              onRejected(effectiveStatus);
            }, 1200);
          }
        }
      },
      (error) => {
        console.error("Error listening to group document:", error);
      }
    );
  }, [latestUserData, onApproved, onRejected, user.groupId, user.uid]);

  return (
    <div className="waiting-approval-page">
      <div className="waiting-container">
        <div className="waiting-animation">
          <div className="waiting-spinner"></div>
          <div className="waiting-pulse"></div>
        </div>

        <div className="waiting-content">
          <h1>Waiting for Approval</h1>
          <p className="waiting-message">{waitingMessage}</p>
          <p className="waiting-subtext">
            Jangan tutup halaman ini. Kamu akan langsung redirect ke Menu saat disetujui.
          </p>
        </div>

        <div className="waiting-status">
          <div className="status-item completed">
            <div className="status-icon">QR</div>
            <p className="status-text">QR Scanned</p>
            <div className="status-check">OK</div>
          </div>

          <div className="status-line"></div>

          <div className="status-item pending">
            <div className="status-icon">APP</div>
            <p className="status-text">Waiting for Approval</p>
            <div className="status-loader"></div>
          </div>

          <div className="status-line"></div>

          <div className="status-item">
            <div className="status-icon">GO</div>
            <p className="status-text">Access Granted</p>
            <div className="status-check">...</div>
          </div>
        </div>

        <div className="device-info-container">
          <button
            className="device-info-toggle"
            onClick={() => setShowDeviceInfo(!showDeviceInfo)}
          >
            Device Info
          </button>

          {showDeviceInfo && deviceInfo && (
            <div className="device-info-display">
              <h3>Your Device Information:</h3>
              <div className="device-specs">
                <div className="spec-item">
                  <span className="spec-label">Device Type:</span>
                  <span className="spec-value">{deviceInfo.deviceType}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Operating System:</span>
                  <span className="spec-value">{deviceInfo.deviceOS}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Browser:</span>
                  <span className="spec-value">{deviceInfo.deviceBrowser}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Device Model:</span>
                  <span className="spec-value">{deviceInfo.deviceModel}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Screen Resolution:</span>
                  <span className="spec-value">{deviceInfo.screenResolution}</span>
                </div>
                <div className="spec-item">
                  <span className="spec-label">Time Scanned:</span>
                  <span className="spec-value">{deviceInfo.timestamp}</span>
                </div>
              </div>
              <p className="device-hint">
                Owner akan lihat info device ini saat memutuskan untuk approve atau menolak request.
              </p>
            </div>
          )}
        </div>

        <div className="waiting-tips">
          <h3>Tips:</h3>
          <ul>
            <li>Pastikan sudah share QR code ke owner</li>
            <li>Owner akan lihat device information dan request mu</li>
            <li>Tunggu sampai disetujui</li>
            <li>Jangan close tab ini sampai approve</li>
          </ul>
        </div>

        <div className="waiting-footer">
          <p className="footer-hint">
            Sudah lama menunggu? Owner mungkin belum lihat request kamu. Coba hubungi langsung.
          </p>
        </div>
      </div>
    </div>
  );
}
