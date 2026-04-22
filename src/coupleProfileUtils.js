import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "./firebase";
import { subscribeToGroupByGroupId } from "./approvalUtils";

const DEFAULT_ROLE_PROFILES = {
  cowo: {
    uid: null,
    role: "cowo",
    name: "Cowo",
    photo: "",
    email: "",
    gender: "cowo",
  },
  cewe: {
    uid: null,
    role: "cewe",
    name: "Cewe",
    photo: "",
    email: "",
    gender: "cewe",
  },
};

export function normalizeRelationshipRole(value) {
  const normalized = String(value || "").trim().toLowerCase();

  if (["cowo", "cowo ", "cowok", "pria", "laki-laki", "lakilaki"].includes(normalized)) {
    return "cowo";
  }

  if (["cewe", "cewek", "wanita", "perempuan"].includes(normalized)) {
    return "cewe";
  }

  return null;
}

export function buildCoupleProfileState(groupData, users = []) {
  const activeMemberUids = Array.isArray(groupData?.members)
    ? new Set(groupData.members)
    : null;
  const activeUsers = activeMemberUids
    ? users.filter((user) => activeMemberUids.has(user.uid))
    : users;

  const byRole = {
    cowo: { ...DEFAULT_ROLE_PROFILES.cowo },
    cewe: { ...DEFAULT_ROLE_PROFILES.cewe },
  };
  const byUid = {};

  activeUsers.forEach((user) => {
    const role = normalizeRelationshipRole(user.gender || user.role);
    const profile = {
      uid: user.uid || null,
      role,
      name: user.name || (role === "cewe" ? "Cewe" : "Cowo"),
      photo: user.photo || user.googlePhoto || "",
      email: user.email || "",
      gender: role,
    };

    if (user.uid) {
      byUid[user.uid] = profile;
    }

    if (role) {
      byRole[role] = profile;
    }
  });

  return {
    groupData: groupData || null,
    activeUsers,
    byRole,
    byUid,
    isReady: Boolean(groupData),
  };
}

export function useCoupleProfiles(groupId) {
  const [groupData, setGroupData] = useState(null);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!groupId) {
      setGroupData(null);
      return () => {};
    }

    return subscribeToGroupByGroupId(
      groupId,
      (nextGroupData) => {
        setGroupData(nextGroupData);
      },
      (error) => {
        console.error("Couple group listener error:", error);
      }
    );
  }, [groupId]);

  useEffect(() => {
    if (!groupId) {
      setUsers([]);
      return () => {};
    }

    return onSnapshot(
      query(collection(db, "users"), where("groupId", "==", groupId)),
      (snapshot) => {
        const nextUsers = snapshot.docs.map((entry) => ({
          uid: entry.id,
          ...entry.data(),
        }));
        setUsers(nextUsers);
      },
      (error) => {
        console.error("Couple users listener error:", error);
      }
    );
  }, [groupId]);

  return useMemo(() => buildCoupleProfileState(groupData, users), [groupData, users]);
}

export function getProfileForRole(coupleProfiles, role) {
  const normalizedRole = normalizeRelationshipRole(role);

  if (!normalizedRole) {
    return {
      uid: null,
      role: null,
      name: "Pengguna",
      photo: "",
      email: "",
      gender: null,
    };
  }

  return (
    coupleProfiles?.byRole?.[normalizedRole] || {
      ...DEFAULT_ROLE_PROFILES[normalizedRole],
    }
  );
}

export function getDisplayNameForRole(coupleProfiles, role) {
  return getProfileForRole(coupleProfiles, role).name;
}

export function getDisplayProfileForRecord(coupleProfiles, record = {}) {
  const normalizedRole = normalizeRelationshipRole(
    record.role || record.userRole || record.gender
  );

  if (normalizedRole) {
    return getProfileForRole(coupleProfiles, normalizedRole);
  }

  if (record.userId && coupleProfiles?.byUid?.[record.userId]) {
    return coupleProfiles.byUid[record.userId];
  }

  return {
    uid: record.userId || null,
    role: normalizedRole,
    name: record.userName || record.name || "Pengguna",
    photo: record.userPhoto || record.photo || "",
    email: record.email || "",
    gender: normalizedRole,
  };
}
