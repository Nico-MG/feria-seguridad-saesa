import { cookies } from "next/headers";

import AdminPanel from "@/components/AdminPanel";
import AdminLogin from "@/components/AdminLogin";
import {
  ADMIN_COOKIE_NAME,
  areAdminCredentialsConfigured,
  verifyAdminSessionToken,
} from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const cookieStore = await cookies();
  const authenticated = verifyAdminSessionToken(
    cookieStore.get(ADMIN_COOKIE_NAME)?.value
  );

  if (authenticated) {
    return <AdminPanel />;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-5 py-12">
      <AdminLogin configured={areAdminCredentialsConfigured()} />
    </main>
  );
}
