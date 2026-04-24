/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number, showCents: boolean = true) {
  const safeValue = Number.isFinite(value) ? value : 0;

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(safeValue);
}

export function parseBRL(value: string): number {
  return Number(value.replace(/[^0-9,-]+/g, "").replace(",", "."));
}

export function parseDateString(dateStr: string): Date | null {
  if (!dateStr) {
    return null;
  }

  const [day, month, year] = dateStr.split("/").map(Number);
  if (
    Number.isFinite(day) &&
    Number.isFinite(month) &&
    Number.isFinite(year) &&
    month >= 1 &&
    month <= 12
  ) {
    const parsedDate = new Date(year, month - 1, day);

    if (
      parsedDate.getFullYear() === year &&
      parsedDate.getMonth() === month - 1 &&
      parsedDate.getDate() === day
    ) {
      return parsedDate;
    }
  }

  const fallbackDate = new Date(dateStr);
  return Number.isNaN(fallbackDate.getTime()) ? null : fallbackDate;
}

export function formatDate(dateStr: string): Date {
  return parseDateString(dateStr) ?? new Date(Number.NaN);
}

export function isValidDateValue(date: Date | null | undefined): date is Date {
  return Boolean(date) && !Number.isNaN(date.getTime());
}

export function getMonthYear(date: Date): string {
  return `${date.getMonth() + 1}/${date.getFullYear()}`;
}

export function generateId() {
  return Math.random().toString(36).substring(2, 11);
}
