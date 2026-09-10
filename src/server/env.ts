import { z } from "zod";

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  AUTH_SECRET: z.string().min(32),
  APP_BASE_URL: z.string().url(),
  AUTH_URL: z.string().url(),
  OPENAI_API_KEY: z.string().min(20),
  OPENAI_TEXT_MODEL: z.string().min(1).default("gpt-5.6-terra"),
  VOICE_PROVIDER: z.literal("sarvam"),
  SARVAM_API_KEY: z.string().min(20),
  SARVAM_ORG_ID: z.string().uuid(),
  SARVAM_WORKSPACE_ID: z.string().uuid(),
  SARVAM_AGENT_ID: z.string().min(1),
  SARVAM_AGENT_VERSION: z.coerce.number().int().positive().default(2),
  SEED_ADMIN_EMAIL: z.string().email().optional(),
  SEED_ADMIN_PASSWORD: z.string().min(12).optional(),
});

export function getServerEnv() {
  return serverEnvSchema.parse(process.env);
}
