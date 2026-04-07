import { collection, getDocs, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";

function normalizeStatus(value) {
  if (!value) return null;
  return String(value).trim().toLowerCase();
}

export function getApprovalRequestByUid(groupData, viewerUid) {
  if (!viewerUid || !Array.isArray(groupData?.pendingApprovals)) {
    return null;
  }

  return (
    groupData.pendingApprovals.find((request) => request?.uid === viewerUid) || null
  );
}

export function resolveViewerApprovalStatus({ userData, groupData, viewerUid }) {
  const request = getApprovalRequestByUid(groupData, viewerUid);
  const requestStatus = normalizeStatus(request?.status);
  const userStatus = normalizeStatus(userData?.approvalStatus);
  const isMember = Array.isArray(groupData?.members)
    ? groupData.members.includes(viewerUid)
    : false;

  if (requestStatus) {
    return requestStatus;
  }

  if (isMember) {
    return "approved";
  }

  if (userStatus) {
    return userStatus;
  }

  if (userData?.groupId) {
    return "pending";
  }

  return null;
}

export function isViewerApproved(params) {
  return resolveViewerApprovalStatus(params) === "approved";
}

export function isViewerBlockedStatus(status) {
  return ["rejected", "logged_out", "removed"].includes(normalizeStatus(status));
}

export async function getGroupDataByGroupId(groupId) {
  if (!groupId) return null;

  const snapshot = await getDocs(
    query(collection(db, "groups"), where("groupId", "==", groupId))
  );

  if (snapshot.empty) {
    return null;
  }

  const groupDoc = snapshot.docs[0];
  return {
    id: groupDoc.id,
    ...groupDoc.data(),
  };
}

export function subscribeToGroupByGroupId(groupId, onData, onError) {
  if (!groupId) {
    onData(null);
    return () => {};
  }

  return onSnapshot(
    query(collection(db, "groups"), where("groupId", "==", groupId)),
    (snapshot) => {
      if (snapshot.empty) {
        onData(null);
        return;
      }

      const groupDoc = snapshot.docs[0];
      onData({
        id: groupDoc.id,
        ...groupDoc.data(),
      });
    },
    onError
  );
}
