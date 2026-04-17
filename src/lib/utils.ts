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
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  }).format(value);
}

export function parseBRL(value: string): number {
  return Number(value.replace(/[^0-9,-]+/g, "").replace(",", "."));
}

export function formatDate(dateStr: string): Date {
  const [day, month, year] = dateStr.split("/").map(Number);
  return new Date(year, month - 1, day);
}

export function getMonthYear(date: Date): string {
  return `${date.getMonth() + 1}/${date.getFullYear()}`;
}

export function generateId() {
  return Math.random().toString(36).substring(2, 11);
}
