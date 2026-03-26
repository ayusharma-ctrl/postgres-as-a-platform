import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  PORT: z.string(),
  DB_HOST: z.string(),
  DB_PORT: z.string(),
  DB_USER: z.string(),
  DB_PASSWORD: z.string(),
  DB_NAME: z.string(),
  DB_POOL_MAX: z.string(),
  GEMINI_API_KEY: z.string(),
});

export const env = schema.parse(process.env);
