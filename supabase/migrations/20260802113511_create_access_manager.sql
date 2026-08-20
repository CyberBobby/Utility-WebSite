/*
# Access Manager - Tabelle per gestione accessi a 5 siti di test

1. Nuove Tabelle
- `sites`: 5 siti di test con label e URL. Ogni sito corrisponde a un pulsante.
- `app_users`: utenti con username, password (in chiaro, come richiesto), flag is_admin.
- `user_permissions`: permessi per utente/sito (can_access boolean).

2. Seed
- Admin: username 'admin', password '1234', is_admin = true.
- 5 utenti test: user1..user5 con password pass1..pass5.
- 5 siti con URL placeholder (modificabili via admin).
- Permessi di default: ogni utente ha accesso a un solo sito (user1→site1, user2→site2, ecc.).
  L'admin ha accesso a tutti i 5 siti.

3. Sicurezza
- RLS abilitata su tutte le tabelle.
- NESSUNA policy per anon/authenticated: le tabelle sono completamente bloccate dal client.
  Tutto l'accesso avviene tramite edge function (service role key).
  Questo impedisce a chiunque apra il browser di leggere le password o modificare i permessi direttamente.
*/

-- Tabella siti
CREATE TABLE IF NOT EXISTS sites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL,
  url text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sites ENABLE ROW LEVEL SECURITY;

-- Tabella utenti (autenticazione custom semplice)
CREATE TABLE IF NOT EXISTS app_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username text UNIQUE NOT NULL,
  password text NOT NULL,
  is_admin boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

-- Tabella permessi
CREATE TABLE IF NOT EXISTS user_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app_users(id) ON DELETE CASCADE,
  site_id uuid NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
  can_access boolean NOT NULL DEFAULT false,
  UNIQUE(user_id, site_id)
);

ALTER TABLE user_permissions ENABLE ROW LEVEL SECURITY;

-- Seed: 5 siti (URL placeholder - modificabili dall'admin)
INSERT INTO sites (label, url, position)
VALUES
  ('Sito 1', 'https://example.com/site1', 1),
  ('Sito 2', 'https://example.com/site2', 2),
  ('Sito 3', 'https://example.com/site3', 3),
  ('Sito 4', 'https://example.com/site4', 4),
  ('Sito 5', 'https://example.com/site5', 5)
ON CONFLICT DO NOTHING;

-- Seed: admin
INSERT INTO app_users (username, password, is_admin)
VALUES ('admin', '1234', true)
ON CONFLICT (username) DO NOTHING;

-- Seed: 5 utenti test
INSERT INTO app_users (username, password, is_admin)
VALUES
  ('user1', 'pass1', false),
  ('user2', 'pass2', false),
  ('user3', 'pass3', false),
  ('user4', 'pass4', false),
  ('user5', 'pass5', false)
ON CONFLICT (username) DO NOTHING;

-- Seed: permessi - admin ha accesso a tutto
INSERT INTO user_permissions (user_id, site_id, can_access)
SELECT au.id, s.id, true
FROM app_users au, sites s
WHERE au.username = 'admin'
ON CONFLICT (user_id, site_id) DO NOTHING;

-- Seed: permessi - ogni utente ha accesso al proprio sito (user1→site1, ecc.)
INSERT INTO user_permissions (user_id, site_id, can_access)
SELECT au.id, s.id, true
FROM app_users au, sites s
WHERE au.username = 'user' || s.position::text
ON CONFLICT (user_id, site_id) DO NOTHING;

-- Seed: permessi negati - ogni utente NON ha accesso agli altri siti
INSERT INTO user_permissions (user_id, site_id, can_access)
SELECT au.id, s.id, false
FROM app_users au, sites s
WHERE au.username LIKE 'user%'
  AND au.username <> 'user' || s.position::text
ON CONFLICT (user_id, site_id) DO NOTHING;
