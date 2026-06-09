-- Ejecutar esto UNA VEZ en la consola SQL de Neon antes de usar la app

CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,
  username     TEXT UNIQUE NOT NULL,
  password     TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('superadmin', 'admin', 'participant')),
  empresa_slug TEXT NOT NULL DEFAULT '',
  active       BOOLEAN NOT NULL DEFAULT true,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sessions (
  token        TEXT PRIMARY KEY,
  user_id      TEXT NOT NULL,
  username     TEXT NOT NULL,
  role         TEXT NOT NULL,
  empresa_slug TEXT NOT NULL DEFAULT '',
  display_name TEXT NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS empresas (
  id         TEXT PRIMARY KEY,
  slug       TEXT UNIQUE NOT NULL,
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS predictions (
  empresa_slug TEXT    NOT NULL,
  username     TEXT    NOT NULL,
  match_id     INTEGER NOT NULL,
  home         INTEGER NOT NULL,
  away         INTEGER NOT NULL,
  winner       TEXT,
  PRIMARY KEY (empresa_slug, username, match_id)
);

CREATE TABLE IF NOT EXISTS group_predictions (
  empresa_slug TEXT NOT NULL,
  username     TEXT NOT NULL,
  group_name   TEXT NOT NULL,
  first        TEXT NOT NULL,
  second       TEXT NOT NULL,
  third        TEXT,
  PRIMARY KEY (empresa_slug, username, group_name)
);

CREATE TABLE IF NOT EXISTS results (
  match_id INTEGER PRIMARY KEY,
  home     INTEGER NOT NULL,
  away     INTEGER NOT NULL,
  played   BOOLEAN NOT NULL DEFAULT true,
  locked   BOOLEAN NOT NULL DEFAULT true,
  winner   TEXT
);

CREATE TABLE IF NOT EXISTS standings (
  group_name        TEXT PRIMARY KEY,
  first             TEXT NOT NULL,
  second            TEXT NOT NULL,
  third             TEXT,
  third_classified  BOOLEAN NOT NULL DEFAULT false
);

-- Migration: run these if the tables already exist
-- ALTER TABLE group_predictions ADD COLUMN IF NOT EXISTS third TEXT;
-- ALTER TABLE standings ADD COLUMN IF NOT EXISTS third TEXT;
-- ALTER TABLE standings ADD COLUMN IF NOT EXISTS third_classified BOOLEAN NOT NULL DEFAULT false;

-- ── Superadmin ──────────────────────────────────────────────────────────────
-- Cambia 'TU_CLAVE_AQUI' por la contraseña que quieras antes de ejecutar.
-- Solo se ejecuta si no existe el usuario (ON CONFLICT DO NOTHING).

INSERT INTO users (id, username, password, display_name, role, empresa_slug, active)
VALUES (
  gen_random_uuid()::text,
  'superadmin',
  'TU_CLAVE_AQUI',
  'Super Admin',
  'superadmin',
  '',
  true
)
ON CONFLICT (username) DO NOTHING;
