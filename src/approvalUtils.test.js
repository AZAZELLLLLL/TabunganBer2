jest.mock("./firebase", () => ({
  db: {},
}));

import {
  getApprovalRequestByUid,
  isViewerBlockedStatus,
  isViewerApproved,
  resolveViewerApprovalStatus,
} from "./approvalUtils";

describe("approvalUtils", () => {
  test("resolves approved status from group request even when user doc is still pending", () => {
    const status = resolveViewerApprovalStatus({
      userData: {
        approvalStatus: "pending",
        groupId: "GROUP-1",
      },
      groupData: {
        pendingApprovals: [
          {
            uid: "viewer-1",
            status: "approved",
          },
        ],
      },
      viewerUid: "viewer-1",
    });

    expect(status).toBe("approved");
    expect(
      isViewerApproved({
        userData: { approvalStatus: "pending" },
        groupData: {
          pendingApprovals: [{ uid: "viewer-1", status: "approved" }],
        },
        viewerUid: "viewer-1",
      })
    ).toBe(true);
  });

  test("resolves logged out status from group request so viewer can be removed by owner", () => {
    const status = resolveViewerApprovalStatus({
      userData: {
        approvalStatus: "approved",
        groupId: "GROUP-1",
      },
      groupData: {
        pendingApprovals: [
          {
            uid: "viewer-2",
            status: "logged_out",
          },
        ],
      },
      viewerUid: "viewer-2",
    });

    expect(status).toBe("logged_out");
    expect(isViewerBlockedStatus(status)).toBe(true);
  });

  test("returns approval request by viewer uid", () => {
    const request = getApprovalRequestByUid(
      {
        pendingApprovals: [
          { uid: "viewer-a", status: "pending" },
          { uid: "viewer-b", status: "approved" },
        ],
      },
      "viewer-b"
    );

    expect(request).toEqual({ uid: "viewer-b", status: "approved" });
  });
});
