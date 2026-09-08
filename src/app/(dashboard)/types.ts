// Shared types for the dashboard. Kept out of "use server" action files, which may only
// export async functions.
export type LoginState = { error: string };
export type TaskFormState = { error?: string };
export type ProjectFormState = { error?: string };
export type SettingsState = { error?: string; ok?: boolean };
