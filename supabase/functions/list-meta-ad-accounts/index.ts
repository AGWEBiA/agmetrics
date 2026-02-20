import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    // Use getClaims for Lovable Cloud (verify_jwt = false pattern)
    const claimsResult = await anonClient.auth.getClaims(token);
    if (!claimsResult.data?.claims) {
      const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
      if (authError || !user) {
        return new Response(JSON.stringify({ error: "Unauthorized" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const { access_token } = await req.json();
    if (!access_token) {
      return new Response(JSON.stringify({ error: "access_token is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch ad accounts from Meta API
    const url = `https://graph.facebook.com/v21.0/me/adaccounts?fields=id,name,account_status,currency,business_name&limit=100&access_token=${access_token}`;

    const metaRes = await fetch(url);
    if (!metaRes.ok) {
      const errBody = await metaRes.text();
      console.error("Meta API error:", errBody);
      return new Response(JSON.stringify({ error: "Erro ao buscar contas na Meta API", details: errBody }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metaData = await metaRes.json();
    const accounts = (metaData.data || []).map((acc: any) => ({
      id: acc.id,
      name: acc.name || acc.id,
      account_status: acc.account_status,
      currency: acc.currency,
      business_name: acc.business_name || null,
    }));

    return new Response(
      JSON.stringify({ success: true, accounts }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("List ad accounts error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
