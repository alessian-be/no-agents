import path from "node:path";
import zod from "zod";
import fs from "node:fs/promises";
import { RootDir } from "../index.mjs";

const targetSchema = zod.object({
  repo: zod.string().regex(/^[a-zA-Z0-9-]+$/),
  branch: zod.string().regex(/^[a-zA-Z0-9_\-./]+$/),
});

const configSchema = zod.object({
  targets: zod.array(targetSchema),
  source: zod.string(),
});

export type TargetSchema = zod.infer<typeof targetSchema>;

export function validateConfig(configFile: string) {
  const parsed = configSchema.safeParse(path);
  if (!parsed.success) {
    const errors = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Config validation failed: ${errors}`);
  }
  return parsed.data;
}

const configPath = path.join(RootDir, "config.json");
const configFile = await fs.readFile(configPath, "utf-8");
export const Config = validateConfig(JSON.parse(configFile));
