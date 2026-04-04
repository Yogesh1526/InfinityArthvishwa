/**
 * Per-row and portfolio interest remaining from repayment schedule rows.
 * When totalInterestDueAmount is 0 (common for future months in API), falls back to monthlyInterestAmount.
 */
export function remainingInterestForScheduleRow(row: any): number {
  const num = (v: any) => (v != null && v !== '' ? Number(v) : 0);
  const totalDue = num(row.totalInterestDueAmount);
  const monthly = num(row.monthlyInterestAmount);
  const interestPaid = num(row.interestPaidAmount);
  const paymentPaid = num(row.paymentPaidAmount);
  const principalPaid = num(row.principlePaidAmount);

  let paidTowardInterest = interestPaid;
  if (paidTowardInterest === 0 && paymentPaid > 0 && principalPaid === 0) {
    paidTowardInterest = paymentPaid;
  }

  const gross = totalDue > 0 ? totalDue : monthly;
  return Math.max(0, gross - paidTowardInterest);
}

export function totalRemainingInterestFromSchedule(schedule: any[]): number {
  if (!schedule?.length) return 0;
  return schedule.reduce((sum, row) => sum + remainingInterestForScheduleRow(row), 0);
}

export type InterestInstallmentOption = {
  /** Raw interestPayDueDate string from API (form value) */
  value: string;
  remaining: number;
};

/** Due ascending; only rows with remaining interest > 0 */
export function buildInterestInstallmentOptions(schedule: any[]): InterestInstallmentOption[] {
  if (!schedule?.length) return [];

  const parseDue = (raw: any): Date | null => {
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  };

  const rows = schedule
    .map((row) => ({
      row,
      due: parseDue(row.interestPayDueDate),
      remaining: remainingInterestForScheduleRow(row)
    }))
    .filter((x) => x.remaining > 0 && x.due)
    .sort((a, b) => a.due!.getTime() - b.due!.getTime());

  return rows.map((x) => ({
    value: String(x.row.interestPayDueDate),
    remaining: x.remaining
  }));
}
