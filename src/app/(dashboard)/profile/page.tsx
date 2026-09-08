import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentCtx } from "@/server/auth/session";
import { getMe } from "@/server/services/users";
import { t } from "@/lib/i18n";
import { ProfileEditor } from "@/components/ProfileEditor";

export const dynamic = "force-dynamic";

export default async function ManagerProfilePage() {
  const ctx = await getCurrentCtx();
  if (!ctx) redirect("/");
  const me = await getMe(ctx);
  if (!me) redirect("/");

  return (
    <main className="mx-auto w-full max-w-2xl px-5 py-8">
      <Link href="/" className="link text-sm">
        {t(ctx.locale, "dashboard.back")}
      </Link>
      <h1 className="mt-4 font-display text-2xl font-semibold tracking-tight">
        {t(ctx.locale, "profile.heading")}
      </h1>
      <div className="card animate-rise mt-5 p-6">
        <ProfileEditor
          user={{
            id: me.id,
            name: me.name,
            phone: me.phone,
            role: me.role,
            avatarPathname: me.avatarPathname,
          }}
          locale={ctx.locale}
        />
      </div>
    </main>
  );
}
