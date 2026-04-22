import {
  buildCoupleProfileState,
  getDisplayProfileForRecord,
} from "./coupleProfileUtils";

describe("coupleProfileUtils", () => {
  test("maps active group members to cowo and cewe profiles", () => {
    const result = buildCoupleProfileState(
      { members: ["owner-1", "viewer-1"] },
      [
        {
          uid: "owner-1",
          name: "Yuda",
          gender: "cowo",
          photo: "owner-photo",
        },
        {
          uid: "viewer-1",
          name: "Fibula",
          gender: "cewe",
          photo: "viewer-photo",
        },
      ]
    );

    expect(result.byRole.cowo.name).toBe("Yuda");
    expect(result.byRole.cewe.name).toBe("Fibula");
  });

  test("prefers relationship role over stored user id for savings records", () => {
    const coupleProfiles = buildCoupleProfileState(
      { members: ["owner-1", "viewer-1"] },
      [
        {
          uid: "owner-1",
          name: "Yuda",
          gender: "cowo",
        },
        {
          uid: "viewer-1",
          name: "Fibula",
          gender: "cewe",
        },
      ]
    );

    const displayProfile = getDisplayProfileForRecord(coupleProfiles, {
      userId: "owner-1",
      role: "cewe",
      userName: "Nama Lama",
    });

    expect(displayProfile.name).toBe("Fibula");
  });
});
