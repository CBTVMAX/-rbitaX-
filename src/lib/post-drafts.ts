import type { PostVisibility } from "@/lib/publish-post";

/**
 * Rascunhos de publicação guardados neste aparelho (IndexedDB, para caber as fotos/vídeos).
 * Cada pessoa vê só os próprios rascunhos; nada sai do aparelho até publicar.
 */
export type PostDraft = {
  id: string;
  userId: string;
  content: string;
  location: string;
  visibility: PostVisibility;
  files: { name: string; type: string; blob: Blob }[];
  updatedAt: number;
};

const DB = "orbitax";
const STORE = "post-drafts";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: "id" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const req = run(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  }).finally(() => db.close());
}

export async function listDrafts(userId: string): Promise<PostDraft[]> {
  try {
    const all = await tx<PostDraft[]>("readonly", (s) => s.getAll() as IDBRequest<PostDraft[]>);
    return all.filter((d) => d.userId === userId).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return []; // navegador sem IndexedDB (ex.: janela privada): sem rascunhos
  }
}

export async function saveDraft(draft: PostDraft) {
  await tx("readwrite", (s) => s.put(draft));
}

export async function deleteDraft(id: string) {
  try {
    await tx("readwrite", (s) => s.delete(id));
  } catch {
    // ignore
  }
}
