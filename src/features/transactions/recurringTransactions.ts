import { generateId, parseDateString } from "../../lib/utils";
import { Transaction } from "../../types";

export const RECURRING_MONTHS_AHEAD = 12;

function formatRecurringDate(date: Date) {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = String(date.getFullYear());

  return `${day}/${month}/${year}`;
}

function getRecurringOccurrenceDate(baseDate: Date, monthOffset: number) {
  const targetMonthIndex = baseDate.getMonth() + monthOffset;
  const targetYear = baseDate.getFullYear() + Math.floor(targetMonthIndex / 12);
  const normalizedMonthIndex = ((targetMonthIndex % 12) + 12) % 12;
  const lastDayOfMonth = new Date(targetYear, normalizedMonthIndex + 1, 0).getDate();
  const dayOfMonth = Math.min(baseDate.getDate(), lastDayOfMonth);

  return new Date(targetYear, normalizedMonthIndex, dayOfMonth);
}

export function expandRecurringTransactions(
  transaction: Transaction,
  monthsAhead: number = RECURRING_MONTHS_AHEAD
): Transaction[] {
  if (!transaction.recurring) {
    return [transaction];
  }

  const parsedDate = parseDateString(transaction.date);

  if (!parsedDate) {
    return [transaction];
  }

  const occurrences: Transaction[] = [transaction];

  for (let monthOffset = 1; monthOffset <= monthsAhead; monthOffset += 1) {
    occurrences.push({
      ...transaction,
      id: generateId(),
      date: formatRecurringDate(getRecurringOccurrenceDate(parsedDate, monthOffset)),
      runningBalance: undefined,
      sourceOrder: undefined,
    });
  }

  return occurrences;
}
