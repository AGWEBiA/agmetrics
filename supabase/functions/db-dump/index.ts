// Edge function: db-dump
// Usage: GET /db-dump?table=sales_events&offset=0&limit=2000
// Returns text/plain: INSERT INTO public.<table> SELECT * FROM jsonb_populate_recordset(NULL::public.<table>, '<json>'::jsonb);
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ADMIN_TOKEN = Deno.env.get("DB_DUMP_TOKEN") ?? "ag-dump-2026";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const url = new URL(req.url);
    if (url.searchParams.get("token") !== ADMIN_TOKEN) {
      return new Response("forbidden", { status: 403, headers: cors });
    }
    const table = url.searchParams.get("table")!;
    const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);
    const limit = parseInt(url.searchParams.get("limit") ?? "2000", 10);
    if (!/^[a-z_]+$/.test(table)) return new Response("bad table", { status: 400, headers: cors });

    const supa = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data, error, count } = await supa
      .from(table)
      .select("*", { count: "exact" })
      .range(offset, offset + limit - 1);
    if (error) return new Response(`ERR: ${error.message}`, { status: 500, headers: cors });

    const rows = data ?? [];
    let sql = `-- ${table} offset=${offset} count=${rows.length} total=${count}\n`;
    if (rows.length > 0) {
      const json = JSON.stringify(rows).replace(/\$dump\$/g, "$ dump $");
      sql += `INSERT INTO public.${table} SELECT * FROM jsonb_populate_recordset(NULL::public.${table}, $dump$${json}$dump$::jsonb);\n`;
    }
    return new Response(sql, {
      headers: { ...cors, "content-type": "text/plain; charset=utf-8", "x-total": String(count ?? 0) },
    });
  } catch (e) {
    return new Response(`EXC: ${(e as Error).message}`, { status: 500, headers: cors });
  }
});
