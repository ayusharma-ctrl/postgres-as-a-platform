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
  JWT_SECRET: z.string().default("dev-secret"),
  API_KEY: z.string().default("dev-key"),
  PAGE_SIZE_DEFAULT: z.string().default("20"),
  PAGE_SIZE_MAX: z.string().default("100")
});

export const env = schema.parse(process.env);
