import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-sync-source, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Serve the pixel JS script
  if (req.method === "GET") {
    const url = new URL(req.url);
    const projectId = url.searchParams.get("pid");
    const trackMode = url.searchParams.get("track") || "basic";
    if (!projectId) {
      return new Response("// missing pid", { headers: { ...corsHeaders, "Content-Type": "application/javascript" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const endpointUrl = `${supabaseUrl}/functions/v1/tracking-pixel`;

    const script = `
(function() {
  var pid = "${projectId}";
  var endpoint = "${endpointUrl}";
  var anonKey = "${anonKey}";
  var trackAll = "${trackMode}" === "all";
  var vid = localStorage.getItem("agm_vid");
  if (!vid) { vid = "v_" + Math.random().toString(36).substr(2, 12) + Date.now().toString(36); localStorage.setItem("agm_vid", vid); }

  function getUtm() {
    var p = new URLSearchParams(window.location.search);
    return {
      utm_source: p.get("utm_source") || null,
      utm_medium: p.get("utm_medium") || null,
      utm_campaign: p.get("utm_campaign") || null,
      utm_content: p.get("utm_content") || null,
      utm_term: p.get("utm_term") || null
    };
  }

  function send(eventType, meta) {
    var utms = getUtm();
    var payload = {
      project_id: pid,
      visitor_id: vid,
      event_type: eventType,
      page_url: window.location.href,
      referrer: document.referrer || null,
      utm_source: utms.utm_source,
      utm_medium: utms.utm_medium,
      utm_campaign: utms.utm_campaign,
      utm_content: utms.utm_content,
      utm_term: utms.utm_term,
      metadata: meta || null
    };
    if (navigator.sendBeacon) {
      var blob = new Blob([JSON.stringify(payload)], {type: "application/json"});
      navigator.sendBeacon(endpoint + "?apikey=" + anonKey, blob);
    } else {
      fetch(endpoint, {
        method: "POST",
        headers: {"Content-Type": "application/json", "apikey": anonKey},
        body: JSON.stringify(payload),
        keepalive: true
      });
    }
  }

  // Auto-track page view
  send("page_view");

  // Track navigation (SPA)
  var lastUrl = window.location.href;
  setInterval(function() {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      send("page_view");
    }
  }, 1000);

  // ── Enhanced tracking (track=all) ──
  if (trackAll) {
    // Click tracking
    document.addEventListener("click", function(e) {
      var el = e.target;
      var tag = el.tagName || "";
      var text = (el.innerText || "").substring(0, 80);
      var selector = tag.toLowerCase();
      if (el.id) selector += "#" + el.id;
      if (el.className && typeof el.className === "string") {
        selector += "." + el.className.trim().split(/\\s+/).slice(0, 3).join(".");
      }
      // Only track meaningful clicks (buttons, links, inputs)
      var trackable = ["A", "BUTTON", "INPUT", "SELECT", "TEXTAREA"];
      var isTrackable = trackable.indexOf(tag) >= 0 || el.closest("a, button, [role=button], [onclick]");
      if (!isTrackable) return;
      send("click", {
        selector: selector,
        text: text,
        tag: tag,
        x: Math.round(e.pageX),
        y: Math.round(e.pageY),
        vw: window.innerWidth,
        vh: window.innerHeight,
        page_h: document.documentElement.scrollHeight
      });
    }, true);

    // Scroll depth tracking
    var scrollMilestones = { 25: false, 50: false, 75: false, 100: false };
    function checkScroll() {
      var scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      var pct = Math.round((scrollTop / docHeight) * 100);
      var milestones = [25, 50, 75, 100];
      for (var i = 0; i < milestones.length; i++) {
        var m = milestones[i];
        if (pct >= m && !scrollMilestones[m]) {
          scrollMilestones[m] = true;
          send("scroll_depth", { depth: m, vw: window.innerWidth, vh: window.innerHeight, page_h: document.documentElement.scrollHeight });
        }
      }
    }
    window.addEventListener("scroll", (function() {
      var timer;
      return function() {
        clearTimeout(timer);
        timer = setTimeout(checkScroll, 200);
      };
    })(), { passive: true });

    // Mouse heatmap — sample positions every 2s, batch send every 10s
    var mousePoints = [];
    var lastMx = -1, lastMy = -1;
    document.addEventListener("mousemove", function(e) {
      lastMx = e.pageX;
      lastMy = e.pageY;
    }, { passive: true });

    setInterval(function() {
      if (lastMx >= 0) {
        mousePoints.push({ x: lastMx, y: lastMy, t: Date.now() });
      }
    }, 2000);

    setInterval(function() {
      if (mousePoints.length > 0) {
        send("mouse_move", {
          points: mousePoints.slice(),
          vw: window.innerWidth,
          vh: window.innerHeight,
          page_h: document.documentElement.scrollHeight
        });
        mousePoints = [];
      }
    }, 10000);

    // Send remaining on page unload
    window.addEventListener("beforeunload", function() {
      if (mousePoints.length > 0) {
        send("mouse_move", {
          points: mousePoints.slice(),
          vw: window.innerWidth,
          vh: window.innerHeight,
          page_h: document.documentElement.scrollHeight
        });
      }
    });
  }

  // Expose global tracker
  window.AGMetrics = { track: send };
})();
`;
    return new Response(script, {
      headers: { ...corsHeaders, "Content-Type": "application/javascript", "Cache-Control": "public, max-age=3600" },
    });
  }

  // POST: receive tracking events
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const {
      project_id, visitor_id, event_type, page_url, referrer,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term, metadata,
    } = body;

    if (!project_id || !event_type) {
      return new Response(JSON.stringify({ error: "project_id and event_type required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userAgent = req.headers.get("user-agent") || null;
    const ipAddress = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;

    const { error } = await supabase.from("tracking_events").insert({
      project_id,
      visitor_id: visitor_id || null,
      event_type,
      page_url: page_url || null,
      referrer: referrer || null,
      utm_source: utm_source || null,
      utm_medium: utm_medium || null,
      utm_campaign: utm_campaign || null,
      utm_content: utm_content || null,
      utm_term: utm_term || null,
      user_agent: userAgent,
      ip_address: ipAddress,
      metadata: metadata || null,
    });

    if (error) {
      console.error("[tracking-pixel] Insert error:", error.message);
      return new Response(JSON.stringify({ error: "Failed to record event" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[tracking-pixel] Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
