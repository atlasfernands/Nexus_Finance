/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function loadState<T>(key: string, defaultValue: T): T {
  const loaded = loadOptionalState<T>(key);
  return loaded ?? defaultValue;
}

export function loadOptionalState<T>(key: string): T | null {
  if (typeof window === "undefined") {
    return null;
  }

  const saved = window.localStorage.getItem(key);
  if (!saved) {
    return null;
  }

  try {
    return JSON.parse(saved) as T;
  } catch (error) {
    console.warn("Failed to parse persistent state", error);
    return null;
  }
}

export function saveState<T>(key: string, state: T): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(state));
  } catch (error) {
    console.warn("Failed to save persistent state", error);
  }
}
