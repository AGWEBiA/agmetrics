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

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await anonClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { project_id, credential_id } = await req.json();
    if (!project_id) {
      return new Response(JSON.stringify({ error: "project_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify ownership OR admin role
    const { data: project } = await supabase
      .from("projects")
      .select("id, owner_id")
      .eq("id", project_id)
      .single();

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    const isAdmin = roleData?.role === "admin";
    if (!project || (!isAdmin && project.owner_id !== user.id)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get specific credential or fail
    if (!credential_id) {
      return new Response(JSON.stringify({ error: "credential_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: creds } = await supabase
      .from("meta_credentials")
      .select("*")
      .eq("id", credential_id)
      .eq("project_id", project_id)
      .single();

    if (!creds) {
      return new Response(JSON.stringify({ error: "Meta credentials not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure ad_account_id has act_ prefix
    const adAccountId = creds.ad_account_id.startsWith("act_") ? creds.ad_account_id : `act_${creds.ad_account_id}`;

    // Fetch campaigns from Meta API
    const url = `https://graph.facebook.com/v21.0/${adAccountId}/campaigns?fields=id,name,status,objective&limit=500&access_token=${creds.access_token}`;

    const metaRes = await fetch(url);
    if (!metaRes.ok) {
      const errBody = await metaRes.text();
      console.error("Meta API error:", errBody);
      return new Response(JSON.stringify({ error: "Meta API error", details: errBody }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const metaData = await metaRes.json();
    const campaigns = metaData.data || [];

    // Get existing selections from DB for this credential
    const { data: existingSelections } = await supabase
      .from("meta_campaigns")
      .select("campaign_id, is_selected")
      .eq("project_id", project_id)
      .eq("credential_id", credential_id);

    const selectionMap = new Map(
      (existingSelections || []).map((s: any) => [s.campaign_id, s.is_selected])
    );

    // Upsert campaigns
    for (const campaign of campaigns) {
      const isSelected = selectionMap.get(campaign.id) ?? false;
      await supabase
        .from("meta_campaigns")
        .upsert(
          {
            project_id,
            credential_id,
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            status: campaign.status,
            is_selected: isSelected,
          },
          { onConflict: "project_id,campaign_id" }
        );
    }

    // Return campaigns
    const { data: allCampaigns } = await supabase
      .from("meta_campaigns")
      .select("*")
      .eq("project_id", project_id)
      .eq("credential_id", credential_id)
      .order("campaign_name");

    return new Response(
      JSON.stringify({ success: true, campaigns: allCampaigns || [] }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("List campaigns error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
