import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

interface LoginBody {
  username: string;
  password: string;
}

interface CheckAccessBody {
  username: string;
  siteId: string;
}

interface UpdatePermissionBody {
  adminUsername: string;
  adminPassword: string;
  targetUsername: string;
  siteId: string;
  canAccess: boolean;
}

interface UpdateSiteBody {
  adminUsername: string;
  adminPassword: string;
  siteId: string;
  label?: string;
  url?: string;
}

interface CreateUserBody {
  adminUsername: string;
  adminPassword: string;
  username: string;
  password: string;
}

interface DeleteUserBody {
  adminUsername: string;
  adminPassword: string;
  username: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get("action") ?? "";
    const body = await req.json().catch(() => ({}));

    // --- LOGIN ---
    if (action === "login") {
      const { username, password } = body as LoginBody;
      if (!username || !password) {
        return json({ error: "Username e password richiesti" }, 400);
      }
      const { data: user } = await supabase
        .from("app_users")
        .select("id, username, is_admin")
        .eq("username", username)
        .eq("password", password)
        .maybeSingle();

      if (!user) {
        return json({ error: "Credenziali non valide" }, 401);
      }

      // Carica siti + permessi
      const { data: sites } = await supabase
        .from("sites")
        .select("id, label, url, position")
        .order("position");

      const { data: perms } = await supabase
        .from("user_permissions")
        .select("site_id, can_access")
        .eq("user_id", user.id);

      const accessMap: Record<string, boolean> = {};
      for (const p of perms ?? []) {
        accessMap[p.site_id] = p.can_access;
      }

      return json({
        user: { id: user.id, username: user.username, isAdmin: user.is_admin },
        sites: (sites ?? []).map((s) => ({
          id: s.id,
          label: s.label,
          url: s.url,
          position: s.position,
          canAccess: user.is_admin ? true : accessMap[s.id] === true,
        })),
      });
    }

    // --- CHECK ACCESS (singolo sito) ---
    if (action === "check-access") {
      const { username, siteId } = body as CheckAccessBody;
      if (!username || !siteId) {
        return json({ error: "Parametri mancanti" }, 400);
      }
      const { data: user } = await supabase
        .from("app_users")
        .select("id, is_admin")
        .eq("username", username)
        .maybeSingle();
      if (!user) return json({ canAccess: false }, 200);

      if (user.is_admin) return json({ canAccess: true }, 200);

      const { data: perm } = await supabase
        .from("user_permissions")
        .select("can_access")
        .eq("user_id", user.id)
        .eq("site_id", siteId)
        .maybeSingle();

      return json({ canAccess: perm?.can_access === true }, 200);
    }

    // --- HELPERS: verifica admin ---
    async function verifyAdmin(adminUsername: string, adminPassword: string) {
      const { data: admin } = await supabase
        .from("app_users")
        .select("id, is_admin")
        .eq("username", adminUsername)
        .eq("password", adminPassword)
        .maybeSingle();
      return admin?.is_admin === true ? admin : null;
    }

    // --- ADMIN: lista utenti + permessi ---
    if (action === "admin-list") {
      const { adminUsername, adminPassword } = body;
      if (!await verifyAdmin(adminUsername, adminPassword)) {
        return json({ error: "Accesso admin negato" }, 403);
      }
      const { data: users } = await supabase
        .from("app_users")
        .select("id, username, is_admin")
        .order("username");
      const { data: sites } = await supabase
        .from("sites")
        .select("id, label, url, position")
        .order("position");
      const { data: perms } = await supabase
        .from("user_permissions")
        .select("user_id, site_id, can_access");

      return json({ users: users ?? [], sites: sites ?? [], permissions: perms ?? [] });
    }

    // --- ADMIN: aggiorna permesso ---
    if (action === "update-permission") {
      const { adminUsername, adminPassword, targetUsername, siteId, canAccess } = body as UpdatePermissionBody;
      if (!await verifyAdmin(adminUsername, adminPassword)) {
        return json({ error: "Accesso admin negato" }, 403);
      }
      const { data: target } = await supabase
        .from("app_users")
        .select("id")
        .eq("username", targetUsername)
        .maybeSingle();
      if (!target) return json({ error: "Utente non trovato" }, 404);

      const { error } = await supabase
        .from("user_permissions")
        .upsert(
          { user_id: target.id, site_id: siteId, can_access: canAccess },
          { onConflict: "user_id,site_id" },
        );
      if (error) return json({ error: error.message }, 500);

      return json({ success: true });
    }

    // --- ADMIN: aggiorna sito (label/url) ---
    if (action === "update-site") {
      const { adminUsername, adminPassword, siteId, label, url } = body as UpdateSiteBody;
      if (!await verifyAdmin(adminUsername, adminPassword)) {
        return json({ error: "Accesso admin negato" }, 403);
      }
      const updates: Record<string, string> = {};
      if (label) updates.label = label;
      if (url) updates.url = url;
      const { error } = await supabase
        .from("sites")
        .update(updates)
        .eq("id", siteId);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    // --- ADMIN: crea utente ---
    if (action === "create-user") {
      const { adminUsername, adminPassword, username, password } = body as CreateUserBody;
      if (!await verifyAdmin(adminUsername, adminPassword)) {
        return json({ error: "Accesso admin negato" }, 403);
      }
      if (!username || !password) {
        return json({ error: "Username e password richiesti" }, 400);
      }
      const { error } = await supabase
        .from("app_users")
        .insert({ username, password, is_admin: false });
      if (error) {
        if (error.code === "23505") return json({ error: "Username già esistente" }, 409);
        return json({ error: error.message }, 500);
      }
      return json({ success: true });
    }

    // --- ADMIN: elimina utente ---
    if (action === "delete-user") {
      const { adminUsername, adminPassword, username } = body as DeleteUserBody;
      if (!await verifyAdmin(adminUsername, adminPassword)) {
        return json({ error: "Accesso admin negato" }, 403);
      }
      if (username === "admin") {
        return json({ error: "Impossibile eliminare l'admin principale" }, 400);
      }
      const { data: target } = await supabase
        .from("app_users")
        .select("id")
        .eq("username", username)
        .maybeSingle();
      if (!target) return json({ error: "Utente non trovato" }, 404);

      const { error } = await supabase
        .from("app_users")
        .delete()
        .eq("id", target.id);
      if (error) return json({ error: error.message }, 500);
      return json({ success: true });
    }

    return json({ error: "Azione non riconosciuta" }, 400);
  } catch (err) {
    return json({ error: err.message }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
