import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebase";

function buildGroupId(name = "OWNER") {
  const initials = String(name)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word[0])
    .join("")
    .toUpperCase() || "YB";

  const date = new Date().toISOString().split("T")[0].replace(/-/g, "");
  const random = Math.random().toString(36).slice(2, 8).toUpperCase();

  return `GROUP-${initials}-${date}-${random}`;
}

async function findGroupForOwner(ownerUid, currentGroupId) {
  if (currentGroupId) {
    const groupById = await getDocs(
      query(collection(db, "groups"), where("groupId", "==", currentGroupId))
    );

    if (!groupById.empty) {
      return groupById.docs[0];
    }
  }

  const groupByOwner = await getDocs(
    query(collection(db, "groups"), where("ownerId", "==", ownerUid))
  );

  if (!groupByOwner.empty) {
    return groupByOwner.docs[0];
  }

  return null;
}

export async function ensureOwnerGroup(user) {
  if (!user?.uid) {
    throw new Error("User owner tidak valid.");
  }

  const userRef = doc(db, "users", user.uid);
  const existingGroupDoc = await findGroupForOwner(user.uid, user.groupId);

  if (existingGroupDoc) {
    const groupData = existingGroupDoc.data();
    const groupRef = doc(db, "groups", existingGroupDoc.id);
    const resolvedGroupId = groupData.groupId || buildGroupId(user.name);
    const nextMembers = Array.isArray(groupData.members)
      ? Array.from(new Set([...groupData.members, user.uid]))
      : [user.uid];

    const groupUpdates = {};

    if (!groupData.groupId) groupUpdates.groupId = resolvedGroupId;
    if (!groupData.name) groupUpdates.name = `${user.name || "Owner"} Group`;
    if (groupData.ownerName !== user.name) groupUpdates.ownerName = user.name;
    if (groupData.ownerPhoto !== user.photo) groupUpdates.ownerPhoto = user.photo;
    if (groupData.ownerId !== user.uid) groupUpdates.ownerId = user.uid;
    if (groupData.memberCount !== nextMembers.length) {
      groupUpdates.memberCount = nextMembers.length;
    }
    if (
      !Array.isArray(groupData.members) ||
      nextMembers.length !== groupData.members.length
    ) {
      groupUpdates.members = nextMembers;
    }
    if (!Array.isArray(groupData.pendingApprovals)) {
      groupUpdates.pendingApprovals = [];
    }
    if (!Array.isArray(groupData.holidays)) {
      groupUpdates.holidays = [];
    }
    if (typeof groupData.isActive !== "boolean") {
      groupUpdates.isActive = true;
    }
    if (typeof groupData.isPaired !== "boolean") {
      groupUpdates.isPaired = nextMembers.length > 1;
    }
    if (!groupData.qrCodeData) {
      groupUpdates.qrCodeData = `yubul://group/${resolvedGroupId}`;
    }

    if (Object.keys(groupUpdates).length > 0) {
      groupUpdates.updatedAt = new Date();
      await updateDoc(groupRef, groupUpdates);
    }

    if (user.groupId !== resolvedGroupId) {
      await updateDoc(userRef, {
        groupId: resolvedGroupId,
        role: "owner",
        isOwner: true,
        updatedAt: new Date(),
      });
    }

    return {
      groupId: resolvedGroupId,
      groupDocId: existingGroupDoc.id,
    };
  }

  const newGroupId = buildGroupId(user.name);
  const groupRef = await addDoc(collection(db, "groups"), {
    groupId: newGroupId,
    name: `${user.name || "Owner"} Group`,
    ownerId: user.uid,
    ownerName: user.name || "Owner",
    ownerPhoto: user.photo || "",
    members: [user.uid],
    memberCount: 1,
    pendingApprovals: [],
    holidays: [],
    qrCodeData: `yubul://group/${newGroupId}`,
    isActive: true,
    isPaired: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  await updateDoc(userRef, {
    groupId: newGroupId,
    role: "owner",
    isOwner: true,
    updatedAt: new Date(),
  });

  return {
    groupId: newGroupId,
    groupDocId: groupRef.id,
  };
}
