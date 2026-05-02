import path from "node:path";

export const ToolsDir = path.resolve(import.meta.url);
export const RootDir = path.join(ToolsDir, "..");
