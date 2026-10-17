import {
  ADMIN_COOKIE_NAME,
  areAdminCredentialsConfigured,
  createAdminSessionToken,
  getSessionDurationSeconds,
  verifyAdminCredentials,
} from "@/lib/adminAuth";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json(
      { error: "Solicitud de origen no permitido." },
      { status: 403 }
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "La solicitud no contiene JSON válido." },
      { status: 400 }
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("username" in body) ||
    !("password" in body) ||
    typeof body.username !== "string" ||
    typeof body.password !== "string"
  ) {
    return Response.json(
      { error: "Ingresa usuario y contraseña." },
      { status: 400 }
    );
  }

  if (!areAdminCredentialsConfigured()) {
    return Response.json(
      {
        error:
          "El acceso de administración no está configurado en el servidor.",
      },
      { status: 503 }
    );
  }

  if (!verifyAdminCredentials(body.username, body.password)) {
    return Response.json(
      { error: "Usuario o contraseña incorrectos." },
      { status: 401 }
    );
  }

  const response = Response.json({ authenticated: true });
  response.headers.append(
    "Set-Cookie",
    `${ADMIN_COOKIE_NAME}=${createAdminSessionToken()}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${getSessionDurationSeconds()}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
  );

  return response;
}

export async function DELETE(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json(
      { error: "Solicitud de origen no permitido." },
      { status: 403 }
    );
  }

  const response = Response.json({ authenticated: false });
  response.headers.append(
    "Set-Cookie",
    `${ADMIN_COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`
  );

  return response;
}

function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");

  return origin !== null && origin === new URL(request.url).origin;
}
