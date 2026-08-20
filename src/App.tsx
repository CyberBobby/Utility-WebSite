import { useState } from "react";
import {
  login,
  adminList,
  updatePermission,
  updateSite,
  createUser,
  deleteUser,
  type SiteAccess,
  type AdminUser,
  type AdminSite,
  type AdminPermission,
} from "@/lib/supabase";
import {
  Lock,
  LogOut,
  Settings,
  ExternalLink,
  Shield,
  UserPlus,
  Trash2,
  Check,
  X,
  Link as LinkIcon,
  KeyRound,
} from "lucide-react";

interface Session {
  username: string;
  password: string;
  isAdmin: boolean;
  sites: SiteAccess[];
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await login(username, password);
      setSession({
        username: result.user.username,
        password: password,
        isAdmin: result.user.isAdmin,
        sites: result.sites,
      });
      setUsername("");
      setPassword("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore di login");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    setSession(null);
  }

  if (!session) {
    return <LoginScreen username={username} password={password} setUsername={setUsername} setPassword={setPassword} onSubmit={handleLogin} error={error} loading={loading} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header username={session.username} isAdmin={session.isAdmin} onLogout={handleLogout} />
      <main className="max-w-5xl mx-auto px-4 py-12">
        <SitesGrid sites={session.sites} />
        {session.isAdmin && <AdminPanel adminUsername={session.username} adminPassword={session.password} />}
      </main>
    </div>
  );
}

function LoginScreen({ username, password, setUsername, setPassword, onSubmit, error, loading }: {
  username: string;
  password: string;
  setUsername: (v: string) => void;
  setPassword: (v: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  error: string;
  loading: boolean;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 ring-1 ring-blue-500/30 mb-4">
            <Lock className="w-8 h-8 text-blue-400" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Accesso Riservato</h1>
          <p className="text-slate-400 mt-2 text-sm">Inserisci le tue credenziali per continuare</p>
        </div>

        <form onSubmit={onSubmit} className="bg-slate-800/50 backdrop-blur rounded-2xl p-8 ring-1 ring-white/10 shadow-2xl">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-slate-900/60 text-white ring-1 ring-white/10 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                placeholder="Il tuo username"
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-slate-900/60 text-white ring-1 ring-white/10 focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                placeholder="La tua password"
                autoComplete="current-password"
              />
            </div>
            {error && (
              <div className="text-sm text-red-400 bg-red-500/10 rounded-lg px-4 py-3 ring-1 ring-red-500/20">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium transition flex items-center justify-center gap-2"
            >
              {loading ? "Accesso in corso..." : "Accedi"}
            </button>
          </div>
        </form>
        <p className="text-center text-xs text-slate-500 mt-6">
          Demo test · Accesso gestito dall'amministratore
        </p>
      </div>
    </div>
  );
}

function Header({ username, isAdmin, onLogout }: { username: string; isAdmin: boolean; onLogout: () => void }) {
  return (
    <header className="sticky top-0 z-20 backdrop-blur bg-slate-900/80 border-b border-white/10">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500/10 ring-1 ring-blue-500/30 flex items-center justify-center">
            <Shield className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <span className="text-white font-semibold">{username}</span>
            {isAdmin && <span className="ml-2 text-xs text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded ring-1 ring-blue-500/20">Admin</span>}
          </div>
        </div>
        <button onClick={onLogout} className="flex items-center gap-2 text-slate-300 hover:text-white text-sm transition">
          <LogOut className="w-4 h-4" /> Esci
        </button>
      </div>
    </header>
  );
}

function SitesGrid({ sites }: { sites: SiteAccess[] }) {
  const sorted = [...sites].sort((a, b) => a.position - b.position);
  return (
    <section>
      <h2 className="text-2xl font-bold text-white mb-2">Siti di Test</h2>
      <p className="text-slate-400 text-sm mb-8">I pulsanti sbloccati portano ai siti assegnati a te. Quelli bloccati richiedono autorizzazione.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {sorted.map((site) => (
          <SiteCard key={site.id} site={site} />
        ))}
      </div>
    </section>
  );
}

function SiteCard({ site }: { site: SiteAccess }) {
  const [denied, setDenied] = useState(false);

  if (!site.canAccess) {
    return (
      <button
        onClick={() => {
          setDenied(true);
          setTimeout(() => setDenied(false), 1500);
        }}
        className={`group relative overflow-hidden rounded-xl p-6 text-left transition ring-1 ${
          denied ? "ring-red-500/40 bg-red-500/10" : "ring-white/10 bg-slate-800/40 hover:bg-slate-800/70"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-lg font-semibold text-slate-300">{site.label}</span>
          <div className="w-9 h-9 rounded-lg bg-slate-700/50 flex items-center justify-center">
            <Lock className="w-4 h-4 text-slate-500" />
          </div>
        </div>
        <p className="text-sm text-slate-500">
          {denied ? "Accesso negato — contatta l'amministratore" : "Non autorizzato"}
        </p>
      </button>
    );
  }

  return (
    <a
      href={site.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative overflow-hidden rounded-xl p-6 ring-1 ring-blue-500/20 bg-gradient-to-br from-blue-600/20 to-blue-700/5 hover:from-blue-600/30 hover:to-blue-700/10 transition"
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-lg font-semibold text-white">{site.label}</span>
        <div className="w-9 h-9 rounded-lg bg-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/30 transition">
          <ExternalLink className="w-4 h-4 text-blue-300" />
        </div>
      </div>
      <p className="text-sm text-blue-300/70 truncate flex items-center gap-1.5">
        <LinkIcon className="w-3 h-3 shrink-0" />
        {site.url}
      </p>
    </a>
  );
}

// --- PANNELLO ADMIN ---
function AdminPanel({ adminUsername, adminPassword }: { adminUsername: string; adminPassword: string }) {
  const [open, setOpen] = useState(false);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [sites, setSites] = useState<AdminSite[]>([]);
  const [perms, setPerms] = useState<AdminPermission[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await adminList(adminUsername, adminPassword);
      setUsers(data.users);
      setSites(data.sites);
      setPerms(data.permissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    } finally {
      setLoading(false);
    }
  }

  function canAccess(userId: string, siteId: string): boolean {
    const p = perms.find((x) => x.user_id === userId && x.site_id === siteId);
    return p?.can_access === true;
  }

  async function togglePermission(userId: string, username: string, siteId: string, current: boolean) {
    setError("");
    setSuccess("");
    try {
      await updatePermission(adminUsername, adminPassword, username, siteId, !current);
      setSuccess(`Permesso ${!current ? "concesso" : "revocato"} a ${username}`);
      await load();
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const newUsername = (form.elements.namedItem("newUsername") as HTMLInputElement).value;
    const newPassword = (form.elements.namedItem("newPassword") as HTMLInputElement).value;
    setError("");
    setSuccess("");
    try {
      await createUser(adminUsername, adminPassword, newUsername, newPassword);
      form.reset();
      setSuccess(`Utente "${newUsername}" creato`);
      await load();
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    }
  }

  async function handleDeleteUser(username: string) {
    if (!confirm(`Eliminare l'utente "${username}"?`)) return;
    setError("");
    setSuccess("");
    try {
      await deleteUser(adminUsername, adminPassword, username);
      setSuccess(`Utente "${username}" eliminato`);
      await load();
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    }
  }

  async function handleUpdateSite(e: React.FormEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const siteId = (form.elements.namedItem("siteId") as HTMLSelectElement).value;
    const label = (form.elements.namedItem("siteLabel") as HTMLInputElement).value;
    const url = (form.elements.namedItem("siteUrl") as HTMLInputElement).value;
    setError("");
    setSuccess("");
    try {
      await updateSite(adminUsername, adminPassword, siteId, label, url);
      setSuccess("Sito aggiornato");
      await load();
      setTimeout(() => setSuccess(""), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Errore");
    }
  }

  return (
    <section className="mt-12">
      <button
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next && users.length === 0) load();
        }}
        className="w-full flex items-center justify-between px-5 py-4 rounded-xl bg-slate-800/60 ring-1 ring-white/10 hover:bg-slate-800/80 transition"
      >
        <span className="flex items-center gap-3 text-white font-semibold">
          <Settings className="w-5 h-5 text-blue-400" /> Pannello Amministratore
        </span>
        <span className="text-slate-400 text-sm">{open ? "Nascondi" : "Mostra"}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-6">
          {error && <div className="text-sm text-red-400 bg-red-500/10 rounded-lg px-4 py-3 ring-1 ring-red-500/20">{error}</div>}
          {success && <div className="text-sm text-green-400 bg-green-500/10 rounded-lg px-4 py-3 ring-1 ring-green-500/20">{success}</div>}

          {/* Matrice permessi */}
          <div className="bg-slate-800/40 rounded-xl ring-1 ring-white/10 overflow-hidden">
            <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
              <h3 className="text-white font-semibold flex items-center gap-2"><KeyRound className="w-4 h-4 text-blue-400" /> Permessi per utente</h3>
              <button onClick={load} className="text-sm text-blue-400 hover:text-blue-300" disabled={loading}>
                {loading ? "Aggiornamento..." : "Aggiorna"}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-slate-400 border-b border-white/10">
                    <th className="text-left px-5 py-3 font-medium">Utente</th>
                    {sites.map((s) => (
                      <th key={s.id} className="px-3 py-3 font-medium text-center whitespace-nowrap">{s.label}</th>
                    ))}
                    <th className="px-3 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-white/5 last:border-0">
                      <td className="px-5 py-3 text-white font-medium">
                        {u.username}
                        {u.is_admin && <span className="ml-2 text-xs text-blue-400">Admin</span>}
                      </td>
                      {sites.map((s) => {
                        const allowed = u.is_admin || canAccess(u.id, s.id);
                        return (
                          <td key={s.id} className="px-3 py-3 text-center">
                            {u.is_admin ? (
                              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-blue-500/20 text-blue-300">
                                <Check className="w-4 h-4" />
                              </span>
                            ) : (
                              <button
                                onClick={() => togglePermission(u.id, u.username, s.id, allowed)}
                                className={`inline-flex items-center justify-center w-7 h-7 rounded-full transition ${
                                  allowed
                                    ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                                    : "bg-slate-700/40 text-slate-500 hover:bg-slate-700/70"
                                }`}
                                title={allowed ? "Revoca" : "Concedi"}
                              >
                                {allowed ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                              </button>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-3 text-center">
                        {!u.is_admin && (
                          <button onClick={() => handleDeleteUser(u.username)} className="text-slate-500 hover:text-red-400 transition" title="Elimina utente">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Crea utente */}
            <div className="bg-slate-800/40 rounded-xl ring-1 ring-white/10 p-5">
              <h3 className="text-white font-semibold flex items-center gap-2 mb-4"><UserPlus className="w-4 h-4 text-blue-400" /> Nuovo utente</h3>
              <form onSubmit={handleCreateUser} className="space-y-3">
                <input name="newUsername" placeholder="Username" required className="w-full px-3 py-2 rounded-lg bg-slate-900/60 text-white ring-1 ring-white/10 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
                <input name="newPassword" type="password" placeholder="Password" required className="w-full px-3 py-2 rounded-lg bg-slate-900/60 text-white ring-1 ring-white/10 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
                <button type="submit" className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition">Crea utente</button>
              </form>
            </div>

            {/* Modifica sito */}
            <div className="bg-slate-800/40 rounded-xl ring-1 ring-white/10 p-5">
              <h3 className="text-white font-semibold flex items-center gap-2 mb-4"><LinkIcon className="w-4 h-4 text-blue-400" /> Modifica sito</h3>
              <form onSubmit={handleUpdateSite} className="space-y-3">
                <select name="siteId" required className="w-full px-3 py-2 rounded-lg bg-slate-900/60 text-white ring-1 ring-white/10 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm">
                  <option value="">Seleziona sito...</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>{s.label}</option>
                  ))}
                </select>
                <input name="siteLabel" placeholder="Nuova etichetta" className="w-full px-3 py-2 rounded-lg bg-slate-900/60 text-white ring-1 ring-white/10 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
                <input name="siteUrl" placeholder="Nuovo URL (https://...)" className="w-full px-3 py-2 rounded-lg bg-slate-900/60 text-white ring-1 ring-white/10 focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm" />
                <button type="submit" className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium transition">Salva</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
