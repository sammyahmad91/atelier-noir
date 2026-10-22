import { mockModel } from "./mock";
import type { NoirModel } from "./types";

/** Register a real provider here (e.g. one wrapping an LLM SDK) and select it with NOIR_PROVIDER. */
const PROVIDERS: Record<string, NoirModel> = {
  mock: mockModel,
};

export function getNoirModel(provider = process.env.NOIR_PROVIDER ?? "mock"): NoirModel {
  return PROVIDERS[provider] ?? mockModel;
}

export { compose } from "./compose";
export type * from "./types";
