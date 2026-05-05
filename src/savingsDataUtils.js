export function isDeductionSaving(saving = {}) {
  return saving.role === "deduction";
}

export function isLoanAdjustmentSaving(saving = {}) {
  return saving.role === "adjustment";
}

export function isRegularSaving(saving = {}) {
  return Boolean(
    saving.role &&
      saving.role !== "deduction" &&
      saving.role !== "adjustment"
  );
}

export function getTotalSavingsBalance(savings = []) {
  return savings.reduce((sum, saving) => sum + Number(saving.amount || 0), 0);
}
