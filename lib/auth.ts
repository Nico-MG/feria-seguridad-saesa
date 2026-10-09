import { supabase } from "@/lib/supabase";

export async function ensureAnonymousSession() {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (session) {
    return session;
  }

  const { data, error } =
    await supabase.auth.signInAnonymously();

  if (error) {
    throw new Error(
      `No fue posible iniciar la sesión: ${error.message}`
    );
  }

  if (!data.session) {
    throw new Error(
      "Supabase no creó una sesión."
    );
  }

  return data.session;
}