import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-dump-token",
};

const TOKEN = "ag-dump-2026";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.headers.get("x-dump-token") !== TOKEN) {
    return new Response("forbidden", { status: 403, headers: cors });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Use postgres-meta-style queries via PostgREST RPC? We need raw SQL.
  // Approach: call PostgREST's /rest/v1/rpc with a SECURITY DEFINER function we create on-the-fly is too much.
  // Better: use pg via the Deno postgres client.

  const { Client } = await import("https://deno.land/x/postgres@v0.17.0/mod.ts");
  const dbUrl = Deno.env.get("SUPABASE_DB_URL")!;
  const client = new Client(dbUrl);
  await client.connect();

  const parts: string[] = [];
  parts.push(`-- ============================================`);
  parts.push(`-- SCHEMA ESPELHO - Lovable Cloud`);
  parts.push(`-- Gerado em ${new Date().toISOString()}`);
  parts.push(`-- ============================================\n`);
  parts.push(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);
  parts.push(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";\n`);

  // 1. ENUMS
  parts.push(`-- ============ ENUMS ============`);
  const enums = await client.queryObject<{ ddl: string }>(`
    SELECT 'CREATE TYPE public.' || t.typname || ' AS ENUM (' ||
      string_agg(quote_literal(e.enumlabel), ', ' ORDER BY e.enumsortorder) || ');' AS ddl
    FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public' GROUP BY t.typname ORDER BY t.typname;
  `);
  enums.rows.forEach(r => parts.push(r.ddl));
  parts.push("");

  // 2. FUNCTIONS (need before tables due to defaults/triggers)
  parts.push(`-- ============ FUNCTIONS ============`);
  const funcs = await client.queryObject<{ ddl: string }>(`
    SELECT pg_get_functiondef(p.oid) || ';' AS ddl
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prokind = 'f'
    ORDER BY p.proname;
  `);
  funcs.rows.forEach(r => parts.push(r.ddl + "\n"));

  // 3. TABLES
  parts.push(`-- ============ TABLES ============`);
  const tables = await client.queryObject<{ table_name: string }>(`
    SELECT tablename AS table_name FROM pg_tables WHERE schemaname='public' ORDER BY tablename;
  `);
  for (const { table_name } of tables.rows) {
    const cols = await client.queryObject<{ col: string }>(`
      SELECT '  ' || quote_ident(column_name) || ' ' ||
        CASE 
          WHEN data_type='USER-DEFINED' THEN udt_name
          WHEN data_type='ARRAY' THEN (
            SELECT format_type(a.atttypid, a.atttypmod)
            FROM pg_attribute a JOIN pg_class cl ON cl.oid=a.attrelid
            JOIN pg_namespace n ON n.oid=cl.relnamespace
            WHERE n.nspname='public' AND cl.relname=$1 AND a.attname=column_name
          )
          WHEN data_type='character varying' THEN 'varchar' || COALESCE('('||character_maximum_length||')','')
          WHEN data_type='timestamp with time zone' THEN 'timestamptz'
          WHEN data_type='timestamp without time zone' THEN 'timestamp'
          ELSE data_type
        END ||
        COALESCE(' DEFAULT ' || column_default, '') ||
        CASE WHEN is_nullable='NO' THEN ' NOT NULL' ELSE '' END AS col
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name=$1
      ORDER BY ordinal_position;
    `, [table_name]);
    parts.push(`CREATE TABLE public.${table_name} (`);
    parts.push(cols.rows.map(r => r.col).join(",\n"));
    parts.push(`);\n`);
  }

  // 4. CONSTRAINTS (PK, UNIQUE, FK, CHECK)
  parts.push(`-- ============ CONSTRAINTS ============`);
  const cons = await client.queryObject<{ ddl: string }>(`
    SELECT 'ALTER TABLE public.' || quote_ident(c.relname) ||
      ' ADD CONSTRAINT ' || quote_ident(con.conname) || ' ' ||
      pg_get_constraintdef(con.oid) || ';' AS ddl
    FROM pg_constraint con
    JOIN pg_class c ON c.oid = con.conrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname='public'
    ORDER BY c.relname, con.contype DESC, con.conname;
  `);
  cons.rows.forEach(r => parts.push(r.ddl));
  parts.push("");

  // 5. INDEXES (skip ones backing constraints)
  parts.push(`-- ============ INDEXES ============`);
  const idx = await client.queryObject<{ ddl: string }>(`
    SELECT indexdef || ';' AS ddl FROM pg_indexes
    WHERE schemaname='public'
      AND indexname NOT IN (
        SELECT conname FROM pg_constraint con
        JOIN pg_class c ON c.oid=con.conrelid
        JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND con.contype IN ('p','u')
      )
    ORDER BY tablename, indexname;
  `);
  idx.rows.forEach(r => parts.push(r.ddl));
  parts.push("");

  // 6. TRIGGERS
  parts.push(`-- ============ TRIGGERS ============`);
  const trg = await client.queryObject<{ ddl: string }>(`
    SELECT pg_get_triggerdef(t.oid) || ';' AS ddl
    FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND NOT t.tgisinternal
    ORDER BY c.relname, t.tgname;
  `);
  trg.rows.forEach(r => parts.push(r.ddl));
  parts.push("");

  // 7. RLS ENABLE + POLICIES
  parts.push(`-- ============ RLS ============`);
  const rls = await client.queryObject<{ tname: string }>(`
    SELECT tablename AS tname FROM pg_tables
    WHERE schemaname='public'
      AND tablename IN (
        SELECT c.relname FROM pg_class c
        JOIN pg_namespace n ON n.oid=c.relnamespace
        WHERE n.nspname='public' AND c.relrowsecurity=true
      )
    ORDER BY tablename;
  `);
  rls.rows.forEach(r => parts.push(`ALTER TABLE public.${r.tname} ENABLE ROW LEVEL SECURITY;`));
  parts.push("");

  parts.push(`-- ============ POLICIES ============`);
  const pol = await client.queryObject<{ ddl: string }>(`
    SELECT 'CREATE POLICY ' || quote_ident(policyname) ||
      ' ON public.' || quote_ident(tablename) ||
      ' AS ' || permissive ||
      ' FOR ' || cmd ||
      ' TO ' || array_to_string(roles, ', ') ||
      COALESCE(' USING (' || qual || ')', '') ||
      COALESCE(' WITH CHECK (' || with_check || ')', '') || ';' AS ddl
    FROM pg_policies WHERE schemaname='public'
    ORDER BY tablename, policyname;
  `);
  pol.rows.forEach(r => parts.push(r.ddl));

  await client.end();

  const sql = parts.join("\n");
  return new Response(sql, {
    headers: { ...cors, "Content-Type": "text/plain; charset=utf-8" },
  });
});
