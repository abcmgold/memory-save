// Local mode only (`npm run dev:local`): where PGlite data and photos live.
// MUST be outside the project folder — Turbopack watches every file under the project root, so writing the
// database inside it (old `.data/`) triggered an endless recompile → refresh → query → write loop in dev.
import os from "node:os";
import path from "node:path";

export function localDataDir(): string {
  return process.env.MS_LOCAL_DATA_DIR || path.join(os.homedir(), ".memorysave-local");
}

/** Pre-move location, used once to migrate existing local data. */
export function legacyLocalDataDir(): string {
  return path.resolve(process.cwd(), ".data");
}
