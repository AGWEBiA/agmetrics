import { supabase } from "@/integrations/supabase/client";

/**
 * Creates an in-app notification for a user.
 * Call this from realtime hooks when events happen.
 */
export async function createNotification({
  userId,
  projectId,
  type,
  title,
  message,
  metadata,
}: {
  userId: string;
  projectId?: string;
  type: string;
  title: string;
  message?: string;
  metadata?: any;
}) {
  const { error } = await (supabase as any).from("notifications").insert({
    user_id: userId,
    project_id: projectId || null,
    type,
    title,
    message: message || null,
    metadata: metadata || null,
  });
  if (error) console.error("[createNotification] Error:", error.message);
}
