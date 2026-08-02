import { useAsync } from "./useAsync";
import { fetchBadgeMeta } from "../lib/queries/badges";
import type { BadgeDoc } from "../types/schema";

export function useBadgeMeta() {
  const { data, loading, error } = useAsync<Record<string, BadgeDoc>>(
    () => fetchBadgeMeta(),
    [],
  );
  return { meta: data ?? {}, loading, error };
}
