import { useQuery } from '@tanstack/react-query';
import { wtsListTags, type WtsTag } from '@/lib/wts';

export type TagsCatalog = {
  byName: Map<string, WtsTag>;
  byId: Map<string, WtsTag>;
  all: WtsTag[];
  /** Nomes que aparecem mais de uma vez — aplicar por nome marcaria todas. */
  duplicates: string[];
};

export function useTagsCatalog() {
  return useQuery({
    queryKey: ['tags-catalog'],
    queryFn: async (): Promise<TagsCatalog> => {
      const res = await wtsListTags();
      if (!res.ok) throw new Error(res.error);
      const byName = new Map<string, WtsTag>();
      const byId = new Map<string, WtsTag>();
      const seen = new Set<string>();
      const duplicates: string[] = [];
      for (const t of res.data) {
        if (!t?.id || !t?.name) continue;
        const key = t.name.toLowerCase().trim();
        if (seen.has(key)) duplicates.push(t.name);
        seen.add(key);
        byName.set(key, t);
        byId.set(t.id, t);
      }
      return { byName, byId, all: res.data, duplicates };
    },
    staleTime: 10 * 60_000,
  });
}

/** Resolve o UUID da etiqueta: primeiro o id que o scanner gravou, depois o nome. */
export function resolveTagId(
  catalog: TagsCatalog | undefined,
  suggestedId: string | null,
  name: string | null,
): string | null {
  if (suggestedId && catalog?.byId.has(suggestedId)) return suggestedId;
  if (suggestedId && !catalog) return suggestedId;
  if (name && catalog) {
    const hit = catalog.byName.get(name.toLowerCase().trim());
    if (hit) return hit.id;
  }
  return suggestedId ?? null;
}
