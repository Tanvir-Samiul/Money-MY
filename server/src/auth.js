import { createClient } from "@supabase/supabase-js";
import config from "./config.js";

/**
 * Verifies the Supabase JWT on incoming requests.
 * Attaches `req.user` and `req.supabase` for downstream handlers.
 */
export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: "Missing auth token" });
    }

    const supabase = createClient(
      config.SUPABASE_URL,
      config.SUPABASE_ANON_KEY,
      {
        global: { headers: { Authorization: `Bearer ${token}` } },
        auth: { persistSession: false },
      },
    );

    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) {
      return res
        .status(401)
        .json({ error: error?.message || "Invalid or expired token" });
    }

    req.user = data.user;
    req.supabase = supabase;
    next();
  } catch (err) {
    console.error("[auth] real error:", err);
    res.status(401).json({ error: err.message || "Auth failed" });
  }
}
