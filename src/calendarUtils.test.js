import {
  buildSavingsDayMap,
  countCalendarStatuses,
  getCalendarDayStatus,
} from "./calendarUtils";

describe("calendarUtils", () => {
  test("marks day green when cowo and cewe both save on the same date", () => {
    const savingsDayMap = buildSavingsDayMap([
      { role: "cowo", amount: 10000, date: new Date("2026-04-10T00:00:00") },
      { role: "cewe", amount: 5000, date: new Date("2026-04-10T00:00:00") },
    ]);

    const status = getCalendarDayStatus({
      dateKey: "2026-04-10",
      savingsDayMap,
      holidayKeys: new Set(),
      todayKey: "2026-04-21",
    });

    expect(status).toBe("green");
  });

  test("marks day orange when only one side saves", () => {
    const savingsDayMap = buildSavingsDayMap([
      { role: "cowo", amount: 10000, date: new Date("2026-04-11T00:00:00") },
    ]);

    const status = getCalendarDayStatus({
      dateKey: "2026-04-11",
      savingsDayMap,
      holidayKeys: new Set(),
      todayKey: "2026-04-21",
    });

    expect(status).toBe("orange");
  });

  test("counts red days only for non-future dates without savings", () => {
    const counts = countCalendarStatuses({
      year: 2026,
      month: 3,
      daysInMonth: 3,
      savingsDayMap: buildSavingsDayMap([
        { role: "cowo", amount: 10000, date: new Date("2026-04-01T00:00:00") },
        { role: "cewe", amount: 10000, date: new Date("2026-04-01T00:00:00") },
      ]),
      holidayKeys: new Set(["2026-04-02"]),
      todayKey: "2026-04-02",
    });

    expect(counts.green).toBe(1);
    expect(counts.red).toBe(1);
  });
});
