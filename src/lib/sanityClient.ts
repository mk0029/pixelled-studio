// Minimal Sanity Content Lake client (no extra dependency).
const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "3mq2fyfh";
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

