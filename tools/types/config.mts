import zod from "zod";

const targetSchema = zod.object({
  repo: zod.string().regex(/^[a-zA-Z0-9-]+$/),
  branch: zod.string().regex(/^[a-zA-Z0-9_\-./]+$/),
});

const configSchema = zod.object({
  targets: zod.array(targetSchema),
  source: zod.string(),
});

export type TargetSchema = zod.infer<typeof targetSchema>;

export function validateConfig() {
  const parsed = configSchema.safeParse(process.env);
  if (!parsed.success) {
    const errors = parsed.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new Error(`Config validation failed: ${errors}`);
  }
  return parsed.data;
}

export const Config = validateConfig();
