import { supabase } from "@/integrations/supabase/client";

let currentViewToken: string | null = null;

/**
 * Sets the x-view-token header on all Supabase REST requests.
 * Used by the public dashboard to pass view_token for RLS validation.
 */
export function setPublicViewToken(token: string | null) {
  currentViewToken = token;
  if (token) {
    // @ts-ignore — internal Supabase client property for setting global headers
    supabase.rest.headers["x-view-token"] = token;
  } else {
    // @ts-ignore
    delete supabase.rest.headers["x-view-token"];
  }
}

export function getPublicViewToken() {
  return currentViewToken;
}
