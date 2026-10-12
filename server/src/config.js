import { z } from "zod";

/**
 * Environment variable schema.
 * If anything is missing or invalid, the server crashes with a clear message
 * instead of starting in a half-broken state.
 */
const schema = z.object({
  // Server
  PORT: z.coerce.number().int().positive().default(8080),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  APP_ORIGIN: z.string().url().default("http://localhost:5173"),
  APP_TIMEZONE: z.string().default("Asia/Kuala_Lumpur"),

  // Supabase (added in Phase 0.4 — optional for now)
  SUPABASE_URL: z.string().url().optional().or(z.literal("")),
  SUPABASE_ANON_KEY: z.string().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  SUPABASE_RECEIPTS_BUCKET: z.string().default("receipts"),

  // Extraction (added in Phase 2)
  GROQ_API_KEY: z.string().optional(),
  GROQ_VISION_MODEL: z.string().default("qwen/qwen3.8-27b"),
  EXTRACTION_ENGINES: z.string().default("groq"),
  EXTRACTION_MIN_GAP_MS: z.coerce.number().int().positive().default(2500),
  EXTRACTION_MAX_ATTEMPTS: z.coerce.number().int().positive().default(4),

  // Uploads
  MAX_UPLOAD_MB: z.coerce.number().int().positive().default(10),
});

let config;
try {
  config = schema.parse(process.env);
} catch (err) {
  console.error("\n❌ Environment variable validation failed:");
  console.error(err.errors ?? err.message);
  console.error("\nCheck your .env file against .env.example.\n");
  process.exit(1);
}

export default config;
