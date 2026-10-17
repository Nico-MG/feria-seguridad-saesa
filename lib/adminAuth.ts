import "server-only";

import {
  createHash,
  createHmac,
  timingSafeEqual,
} from "node:crypto";

import { createClient } from "@supabase/supabase-js";

export const ADMIN_COOKIE_NAME = "feria_admin_session";
const SESSION_DURATION_SECONDS = 8 * 60 * 60;

function getAdminSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error(
      "ADMIN_SESSION_SECRET debe tener al menos 32 caracteres."
    );
  }

  return secret;
}

function constantTimeEqual(left: string, right: string) {
  const leftHash = createHash("sha256").update(left).digest();
  const rightHash = createHash("sha256").update(right).digest();

  return timingSafeEqual(leftHash, rightHash);
}

function sign(payload: string) {
  return createHmac("sha256", getAdminSessionSecret())
    .update(payload)
    .digest("base64url");
}

export function areAdminCredentialsConfigured() {
  return Boolean(
    process.env.ADMIN_USERNAME &&
      process.env.ADMIN_PASSWORD &&
      process.env.ADMIN_SESSION_SECRET?.length &&
      process.env.ADMIN_SESSION_SECRET.length >= 32
  );
}

export function verifyAdminCredentials(
  username: string,
  password: string
) {
  const expectedUsername = process.env.ADMIN_USERNAME;
  const expectedPassword = process.env.ADMIN_PASSWORD;

  if (!expectedUsername || !expectedPassword) {
    return false;
  }

  return (
    constantTimeEqual(username, expectedUsername) &&
    constantTimeEqual(password, expectedPassword)
  );
}

export function createAdminSessionToken() {
  const payload = Buffer.from(
    JSON.stringify({
      expiresAt:
        Math.floor(Date.now() / 1000) +
        SESSION_DURATION_SECONDS,
    })
  ).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

export function verifyAdminSessionToken(
  token: string | undefined
) {
  if (!token) {
    return false;
  }

  const [payload, signature, extra] = token.split(".");

  if (!payload || !signature || extra) {
    return false;
  }

  try {
    if (!constantTimeEqual(signature, sign(payload))) {
      return false;
    }

    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    ) as { expiresAt?: unknown };

    return (
      typeof session.expiresAt === "number" &&
      session.expiresAt > Math.floor(Date.now() / 1000)
    );
  } catch {
    return false;
  }
}

export function getAdminSupabase() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Configura NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY para habilitar el panel."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function getSessionDurationSeconds() {
  return SESSION_DURATION_SECONDS;
}
