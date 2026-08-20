import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const functionUrl = `${supabaseUrl}/functions/v1/access-manager`;

async function callFunction(action: string, body: Record<string, unknown>) {
  const url = `${functionUrl}?action=${encodeURIComponent(action)}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({ error: "Risposta non valida" }));
  if (!response.ok) {
    throw new Error((data as { error?: string }).error ?? `Errore ${response.status}`);
  }
  return data;
}

export interface SiteAccess {
  id: string;
  label: string;
  url: string;
  position: number;
  canAccess: boolean;
}

export interface LoginResult {
  user: { id: string; username: string; isAdmin: boolean };
  sites: SiteAccess[];
}

export async function login(username: string, password: string): Promise<LoginResult> {
  return callFunction("login", { username, password }) as Promise<LoginResult>;
}

export async function checkAccess(username: string, siteId: string): Promise<boolean> {
  const data = await callFunction("check-access", { username, siteId }) as { canAccess: boolean };
  return data.canAccess;
}

export interface AdminUser {
  id: string;
  username: string;
  is_admin: boolean;
}

export interface AdminSite {
  id: string;
  label: string;
  url: string;
  position: number;
}

export interface AdminPermission {
  user_id: string;
  site_id: string;
  can_access: boolean;
}

export interface AdminListResult {
  users: AdminUser[];
  sites: AdminSite[];
  permissions: AdminPermission[];
}

export async function adminList(adminUsername: string, adminPassword: string): Promise<AdminListResult> {
  return callFunction("admin-list", { adminUsername, adminPassword }) as Promise<AdminListResult>;
}

export async function updatePermission(
  adminUsername: string,
  adminPassword: string,
  targetUsername: string,
  siteId: string,
  canAccess: boolean,
): Promise<void> {
  await callFunction("update-permission", { adminUsername, adminPassword, targetUsername, siteId, canAccess });
}

export async function updateSite(
  adminUsername: string,
  adminPassword: string,
  siteId: string,
  label: string,
  url: string,
): Promise<void> {
  await callFunction("update-site", { adminUsername, adminPassword, siteId, label, url });
}

export async function createUser(
  adminUsername: string,
  adminPassword: string,
  username: string,
  password: string,
): Promise<void> {
  await callFunction("create-user", { adminUsername, adminPassword, username, password });
}

export async function deleteUser(
  adminUsername: string,
  adminPassword: string,
  username: string,
): Promise<void> {
  await callFunction("delete-user", { adminUsername, adminPassword, username });
}
