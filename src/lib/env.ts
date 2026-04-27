/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export function getEnvVar(key: string, fallback: string = ""): string {
  const publicEnv = {
    SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
    SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    VITE_SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_ANON_KEY,
    API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
    VITE_API_BASE_URL: import.meta.env.VITE_API_BASE_URL,
  };

  return publicEnv[key as keyof typeof publicEnv] ?? fallback;
}
