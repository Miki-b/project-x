import { redirect } from "next/navigation";
import { getCurrentCtx } from "@/server/auth/session";
import { SignupForm } from "../SignupForm";

// Public self-service organisation signup. If already signed in, go to the dashboard.
export const dynamic = "force-dynamic";

export default async function SignupPage() {
  const ctx = await getCurrentCtx();
  if (ctx) redirect("/");
  return <SignupForm />;
}
