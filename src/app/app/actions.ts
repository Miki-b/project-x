"use server";

import { redirect } from "next/navigation";
import { signOut } from "@/server/auth/session";

/** Sign the employee out of the browser app and return to the login page. */
export async function employeeSignOutAction(): Promise<void> {
  await signOut();
  redirect("/app/login");
}
