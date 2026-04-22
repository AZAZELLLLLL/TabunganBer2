import { normalizeRelationshipRole } from "./coupleProfileUtils";

export function toDateObject(value) {
  if (!value) return null;
  if (value?.toDate) return value.toDate();

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toDateKey(value) {
  const date = toDateObject(value);
  if (!date) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function buildSavingsDayMap(savings = []) {
  return savings.reduce((result, saving) => {
    const role = normalizeRelationshipRole(saving.role);
    const dateKey = toDateKey(saving.date);

    if (!role || !dateKey) {
      return result;
    }

    const existing = result[dateKey] || {
      dateKey,
      totalAmount: 0,
      roles: [],
      roleSet: new Set(),
      entries: [],
    };

    if (!existing.roleSet.has(role)) {
      existing.roleSet.add(role);
      existing.roles = Array.from(existing.roleSet);
    }

    existing.totalAmount += Number(saving.amount || 0);
    existing.entries.push(saving);
    result[dateKey] = existing;

    return result;
  }, {});
}

export function getCalendarDayStatus({
  dateKey,
  savingsDayMap,
  holidayKeys,
  todayKey,
}) {
  const dayInfo = savingsDayMap?.[dateKey];
  const isHoliday = holidayKeys?.has(dateKey);
  const isFuture = Boolean(todayKey && dateKey > todayKey);

  if (isHoliday) {
    return "red";
  }

  if (dayInfo?.roles?.length >= 2) {
    return "green";
  }

  if (dayInfo?.roles?.length === 1) {
    return "orange";
  }

  if (isFuture) {
    return "empty";
  }

  return "red";
}

export function countCalendarStatuses({
  year,
  month,
  daysInMonth,
  savingsDayMap,
  holidayKeys,
  todayKey,
}) {
  const result = {
    green: 0,
    orange: 0,
    red: 0,
  };

  for (let day = 1; day <= daysInMonth; day += 1) {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const status = getCalendarDayStatus({
      dateKey,
      savingsDayMap,
      holidayKeys,
      todayKey,
    });

    if (status === "green" || status === "orange" || status === "red") {
      result[status] += 1;
    }
  }

  return result;
}
