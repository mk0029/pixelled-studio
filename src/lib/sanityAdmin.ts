// Server-only Sanity write helpers. Keeps the app dependency-free (no @sanity/client).
const PROJECT_ID = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "3mq2fyfh";
const DATASET = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
const API_VERSION = "2024-01-01";
const TOKEN = process.env.SANITY_WRITE_TOKEN;

const apiUrl = (path: string) =>
  `https://${PROJECT_ID}.api.sanity.io/v${API_VERSION}/${path}/${DATASET}`;
const assetUrl = (filename: string) =>
  `${apiUrl("assets/files")}?filename=${encodeURIComponent(filename)}`;

export function sanityWriteEnabled(): boolean {
  return !!TOKEN;
}

async function adminRequest<T = any>(url: string, init: RequestInit): Promise<T> {
  if (!TOKEN) throw new Error("Missing SANITY_WRITE_TOKEN");
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      ...init.headers,
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Sanity request failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T>;
}

export async function sanityAdminQuery<T = any>(query: string): Promise<T> {
  const json = await adminRequest<{ result: T }>(apiUrl("data/query"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  return json.result;
}

export async function sanityUploadFile(file: Blob, filename: string): Promise<string> {
  const form = new FormData();
  form.append("file", file, filename);
  const json = await adminRequest<{ document?: { _id: string }; doc?: { _id: string } }>(
    assetUrl(filename),
    { method: "POST", body: form },
  );
  const id = json.document?._id ?? json.doc?._id;
  if (!id) throw new Error("Sanity asset upload returned no asset id");
  return id;
}

export async function sanityCreateDocument(doc: Record<string, unknown>): Promise<void> {
  await adminRequest(apiUrl("data/mutate"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mutations: [{ create: doc }] }),
  });
}
