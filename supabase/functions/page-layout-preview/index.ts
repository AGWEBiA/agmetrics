import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TRACKING_QUERY_PARAMS = [
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "utm_content",
  "utm_term",
  "utm_id",
  "fbclid",
];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function normalizeUrl(rawUrl: string) {
  const parsed = new URL(rawUrl);
  TRACKING_QUERY_PARAMS.forEach((param) => parsed.searchParams.delete(param));
  parsed.hash = "";
  return parsed.toString();
}

function buildPreviewHtml(rawHtml: string, baseUrl: string) {
  const injectedHead = `
    <base href="${baseUrl}">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
      html, body {
        margin: 0 !important;
        min-height: 100% !important;
        background: white !important;
      }

      *, *::before, *::after {
        caret-color: transparent !important;
      }

      a, button, input, textarea, select, summary {
        pointer-events: none !important;
      }
    </style>
  `;

  let html = rawHtml
    .replace(/<meta[^>]+http-equiv=["']Content-Security-Policy["'][^>]*>/gi, "")
    .replace(/<meta[^>]+name=["']viewport["'][^>]*>/gi, "")
    .replace(/<base[^>]*>/gi, "");

  if (/<head[^>]*>/i.test(html)) {
    html = html.replace(/<head[^>]*>/i, (match) => `${match}${injectedHead}`);
  } else if (/<html[^>]*>/i.test(html)) {
    html = html.replace(/<html[^>]*>/i, (match) => `${match}<head>${injectedHead}</head>`);
  } else {
    html = `<!DOCTYPE html><html><head>${injectedHead}</head><body>${html}</body></html>`;
  }

  return html;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Unauthorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    const body = await req.json();
    const rawUrl = body?.url;

    if (!rawUrl || typeof rawUrl !== "string") {
      return json({ error: "url is required" }, 400);
    }

    const normalizedUrl = normalizeUrl(rawUrl);
    const parsedUrl = new URL(normalizedUrl);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return json({ error: "Invalid URL protocol" }, 400);
    }

    const response = await fetch(normalizedUrl, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; AGMetrics Preview/1.0)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
      },
    });

    if (!response.ok) {
      return json({ error: "Failed to fetch tracked page", status: response.status }, 400);
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html")) {
      return json({ error: "Tracked URL did not return HTML" }, 400);
    }

    const rawHtml = await response.text();
    const finalUrl = response.url || normalizedUrl;
    const titleMatch = rawHtml.match(/<title[^>]*>(.*?)<\/title>/i);

    return json({
      html: buildPreviewHtml(rawHtml, finalUrl),
      finalUrl,
      title: titleMatch?.[1]?.trim() || null,
    });
  } catch (error) {
    console.error("[page-layout-preview]", error);
    return json({ error: "Unable to generate page preview" }, 500);
  }
});