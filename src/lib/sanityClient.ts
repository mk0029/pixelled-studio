// Minimal Sanity Content Lake client (no extra dependency).
const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "";
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const API_VERSION = "2024-01-01";

export function sanityEnabled(): boolean {
  return !!PROJECT_ID;
}

export async function sanityFetch<T = any>(query: string): Promise<T> {
  if (!PROJECT_ID) throw new Error("Sanity not configured (NEXT_PUBLIC_SANITY_PROJECT_ID)");
  const url = `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/data/query/${DATASET}?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { next: { revalidate: 300 } } as any);
  if (!res.ok) throw new Error(`Sanity query failed: ${res.status}`);
  const json = await res.json();
  return json.result as T;
}

export function sanityFileUrl(ref: string): string {
  // file asset ref format: file-<id>-<ext>
  const parts = ref.replace("file-", "").split("-");
  const id = parts.slice(0, -1).join("-");
  const ext = parts[parts.length - 1];
  return `https://cdn.sanity.io/files/${PROJECT_ID}/${DATASET}/${id}.${ext}`;
}

export function sanityImageUrl(ref: string): string {
  const parts = ref.replace("image-", "").split("-");
  const id = parts.slice(0, -1).join("-");
  const dims = parts[parts.length - 1];
  return `https://cdn.sanity.io/images/${PROJECT_ID}/${DATASET}/${id}-${dims}`;
}