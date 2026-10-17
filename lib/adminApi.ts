import "server-only";

import {
  ADMIN_COOKIE_NAME,
  verifyAdminSessionToken,
} from "@/lib/adminAuth";

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");

  return origin !== null && origin === new URL(request.url).origin;
}

export function isAdminRequest(request: Request) {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const token = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${ADMIN_COOKIE_NAME}=`))
    ?.slice(ADMIN_COOKIE_NAME.length + 1);

  return verifyAdminSessionToken(token);
}

export function unauthorizedResponse() {
  return Response.json(
    { error: "Debes iniciar sesión para continuar." },
    { status: 401 }
  );
}

export function invalidOriginResponse() {
  return Response.json(
    { error: "Solicitud de origen no permitido." },
    { status: 403 }
  );
}

export function databaseErrorResponse(
  message: string,
  status = 500
) {
  return Response.json({ error: message }, { status });
}
