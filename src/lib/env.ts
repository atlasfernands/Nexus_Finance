/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function getEnvVar(key: string, fallback: string = ""): string {
  const env = (import.meta as any).env as Record<string, string | undefined>;
  return env[key] ?? env[`VITE_${key}`] ?? fallback;
}
