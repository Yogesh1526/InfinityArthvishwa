/**
 * Resolves which monthly rebate from the repayment schedule applies to a payment.
 *
 * Automatic (no backward anchor):
 * - If the payment date falls in the same calendar month as an installment due: compare payment date
 *   to that month's due date (earliest due in that month). Before due → previous month's installment rebate;
 *   on/after due → this month's installment rebate.
 * - If there is no installment row in the payment month: unpaid rows with due in the payment month,
 *   preferring one whose due date has passed relative to the payment date, else the first in month.
 *
 * Backward: user picks a schedule row by its interestPayDueDate; that row's rebate applies.
 */
export function resolveScheduleRebateSuggestion(
  schedule: any[],
  paymentDate: Date,
  opts?: { backwardMode?: boolean; anchorDueDateIso?: string | null }
): { amount: number; dueDate: string } | null {
  if (!schedule?.length) return null;

  const num = (v: any) => (v != null && v !== '' ? Number(v) : 0);

  const parseDue = (raw: any): Date | null => {
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  };

  const dateOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (opts?.backwardMode && opts.anchorDueDateIso) {
    const anchor = parseDue(opts.anchorDueDateIso);
    if (!anchor) return null;
    const a = dateOnly(anchor).getTime();
    const row = schedule.find((r) => {
      const d = parseDue(r.interestPayDueDate);
      return d && dateOnly(d).getTime() === a;
    });
    if (!row) return null;
    const rebate = num(row.monthlyRebateInterestAmount);
    if (rebate <= 0) return null;
    return { amount: rebate, dueDate: String(row.interestPayDueDate) };
  }

  const P = dateOnly(paymentDate);
  const py = P.getFullYear();
  const pm = P.getMonth();

  const rowsInPayMonth = schedule
    .map((r) => ({ row: r, due: parseDue(r.interestPayDueDate) }))
    .filter((x) => x.due && x.due.getFullYear() === py && x.due.getMonth() === pm)
    .sort((a, b) => a.due!.getTime() - b.due!.getTime());

  if (rowsInPayMonth.length > 0) {
    const firstInMonth = rowsInPayMonth[0];
    const dueThis = dateOnly(firstInMonth.due!);

    if (P.getTime() < dueThis.getTime()) {
      const prev = new Date(py, pm - 1, 1);
      const prevY = prev.getFullYear();
      const prevM = prev.getMonth();
      const prevRows = schedule
        .map((r) => ({ row: r, due: parseDue(r.interestPayDueDate) }))
        .filter((x) => x.due && x.due.getFullYear() === prevY && x.due.getMonth() === prevM)
        .sort((a, b) => a.due!.getTime() - b.due!.getTime());
      if (prevRows.length) {
        const pick = prevRows[prevRows.length - 1];
        const rebate = num(pick.row.monthlyRebateInterestAmount);
        if (rebate > 0) return { amount: rebate, dueDate: String(pick.row.interestPayDueDate) };
      }
      return null;
    }

    const rebate = num(firstInMonth.row.monthlyRebateInterestAmount);
    if (rebate > 0) return { amount: rebate, dueDate: String(firstInMonth.row.interestPayDueDate) };
    return null;
  }

  return fallbackUnpaidPaymentMonth(schedule, paymentDate);
}

function fallbackUnpaidPaymentMonth(
  schedule: any[],
  paymentDate: Date
): { amount: number; dueDate: string } | null {
  const num = (v: any) => (v != null && v !== '' ? Number(v) : 0);
  const isUnpaid = (r: any) =>
    num(r.paymentPaidAmount) === 0 || r.paymentPaidAmount == null || r.paymentPaidAmount === '';

  const unpaidRows = schedule.filter(isUnpaid);
  if (!unpaidRows.length) return null;

  const cy = paymentDate.getFullYear();
  const cm = paymentDate.getMonth();

  const parseDue = (r: any): Date | null => {
    const raw = r.interestPayDueDate;
    if (!raw) return null;
    const d = new Date(raw);
    return isNaN(d.getTime()) ? null : d;
  };

  const dateOnly = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

  const inPaymentMonth = (d: Date) => d.getFullYear() === cy && d.getMonth() === cm;

  type Cand = { row: any; due: Date; dueRaw: string; rebate: number };
  const candidates: Cand[] = [];
  for (const row of unpaidRows) {
    const due = parseDue(row);
    if (!due || !inPaymentMonth(due)) continue;
    const rebate = num(row.monthlyRebateInterestAmount);
    if (rebate <= 0) continue;
    candidates.push({ row, due, dueRaw: String(row.interestPayDueDate), rebate });
  }

  if (!candidates.length) return null;

  candidates.sort((a, b) => a.due.getTime() - b.due.getTime());

  const payDay = dateOnly(paymentDate);
  const late = candidates.find((c) => dateOnly(c.due) < payDay);
  const pick = late ?? candidates[0];

  return { amount: pick.rebate, dueDate: pick.dueRaw };
}
