import { createClient } from "@supabase/supabase-js";
import config from "../config.js";

/**
 * Service-role Supabase client.
 *
 * IMPORTANT: This client bypasses RLS. Every query must be manually
 * scoped by user_id. Only use this from trusted server code - the
 * background queue worker and file storage helpers.
 *
 * NEVER send this client or its key to the browser.
 */
export const serviceClient = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);
