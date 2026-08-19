/**
 * TORK Centralized Auth Session Helper (Sprint 13.8)
 * 
 * Provides client-side and isomorphic session freshness verification,
 * automatic token refreshing, and authenticated fetch execution.
 */

import { supabase } from "../supabase";

/**
 * Retrieves a valid, unexpired Supabase authentication session.
 * If the access token is expired or within 60 seconds of expiration,
 * it automatically refreshes the session via refresh_token.
 * 
 * @returns {Promise<{ session: object|null, token: string|null, user: object|null, isValid: boolean }>}
 */
export async function getValidSession() {
  try {
    if (typeof window === "undefined") {
      return { session: null, token: null, user: null, isValid: false };
    }

    const { data: { session }, error } = await supabase.auth.getSession();

    if (session && session.access_token) {
      // Check expiration (expires_at is in seconds)
      const nowSec = Math.floor(Date.now() / 1000);
      const expiresAtSec = session.expires_at || 0;
      const isExpiringSoon = expiresAtSec > 0 && expiresAtSec - nowSec < 60;

      if (isExpiringSoon || (expiresAtSec > 0 && expiresAtSec <= nowSec)) {
        // Attempt token refresh
        const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
        if (!refreshError && refreshData?.session?.access_token) {
          return {
            session: refreshData.session,
            token: refreshData.session.access_token,
            user: refreshData.session.user,
            isValid: true,
          };
        }
      }

      return {
        session,
        token: session.access_token,
        user: session.user,
        isValid: true,
      };
    }

    // Fallback: Check localStorage directly for Supabase auth key
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.includes("supabase.auth.token") || key.includes("-auth-token"))) {
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw);
          const token = parsed?.access_token || parsed?.currentSession?.access_token;
          const user = parsed?.user || parsed?.currentSession?.user;
          if (token) {
            return {
              session: parsed?.currentSession || parsed,
              token,
              user: user || null,
              isValid: true,
            };
          }
        }
      }
    }

    return { session: null, token: null, user: null, isValid: false };
  } catch (err) {
    console.error("getValidSession error:", err);
    return { session: null, token: null, user: null, isValid: false };
  }
}

/**
 * Returns the Authorization header with a fresh Bearer token, or empty object if unauthenticated.
 */
export async function getAuthHeader() {
  const { token, isValid } = await getValidSession();
  if (isValid && token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

/**
 * Authenticated fetch helper that injects a valid Authorization header
 * and handles token refresh on 401.
 */
export async function authenticatedFetch(url, options = {}) {
  const authHeaders = await getAuthHeader();
  
  const mergedHeaders = {
    ...(options.headers || {}),
    ...authHeaders,
  };

  let response = await fetch(url, {
    ...options,
    headers: mergedHeaders,
  });

  // If 401 received, attempt refresh once
  if (response.status === 401) {
    const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
    if (!refreshError && refreshData?.session?.access_token) {
      const refreshedHeaders = {
        ...(options.headers || {}),
        Authorization: `Bearer ${refreshData.session.access_token}`,
      };
      response = await fetch(url, {
        ...options,
        headers: refreshedHeaders,
      });
    }
  }

  return response;
}
