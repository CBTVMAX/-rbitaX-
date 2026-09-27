/**
 * Client-side upload guard (defense in depth on top of the storage bucket's MIME allow-list and the CSP).
 *
 * Reads the first bytes of a file and confirms they match a real, allowed format before upload.
 * The *detected* type — never the type the browser or a tampered request claims — is what gets stored,
 * so a file saved as image/jpeg is really a JPEG. A fake ".jpg" that is actually HTML or a script is refused.
 */

export type MediaKind = "image" | "video" | "audio" | "document";

type Sig = { mime: string; kind: MediaKind; test: (b: Uint8Array, text: string) => boolean };

const ascii = (b: Uint8Array, s: string, at = 0) => s.split("").every((c, i) => b[at + i] === c.charCodeAt(0));
const hex = (b: Uint8Array, bytes: number[], at = 0) => bytes.every((v, i) => b[at + i] === v);

const SIGNATURES: Sig[] = [
  { mime: "image/jpeg", kind: "image", test: (b) => hex(b, [0xff, 0xd8, 0xff]) },
  { mime: "image/png", kind: "image", test: (b) => hex(b, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]) },
  { mime: "image/gif", kind: "image", test: (b) => ascii(b, "GIF87a") || ascii(b, "GIF89a") },
  { mime: "image/webp", kind: "image", test: (b) => ascii(b, "RIFF") && ascii(b, "WEBP", 8) },
  { mime: "image/avif", kind: "image", test: (b) => ascii(b, "ftypavif", 4) || ascii(b, "ftypavis", 4) },
  { mime: "image/heic", kind: "image", test: (b) => ascii(b, "ftypheic", 4) || ascii(b, "ftypheix", 4) || ascii(b, "ftypmif1", 4) || ascii(b, "ftypheim", 4) },
  { mime: "video/mp4", kind: "video", test: (b) => ascii(b, "ftyp", 4) },
  { mime: "video/webm", kind: "video", test: (b) => hex(b, [0x1a, 0x45, 0xdf, 0xa3]) },
  { mime: "video/quicktime", kind: "video", test: (b) => ascii(b, "ftypqt", 4) || ascii(b, "moov", 4) },
  { mime: "audio/mpeg", kind: "audio", test: (b) => hex(b, [0x49, 0x44, 0x33]) || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) },
  { mime: "audio/ogg", kind: "audio", test: (b) => ascii(b, "OggS") },
  { mime: "audio/wav", kind: "audio", test: (b) => ascii(b, "RIFF") && ascii(b, "WAVE", 8) },
  { mime: "audio/flac", kind: "audio", test: (b) => ascii(b, "fLaC") },
  // webm/mp4-wrapped audio share the container signatures above; the recorder always sets a correct blob type.
  { mime: "application/pdf", kind: "document", test: (b) => ascii(b, "%PDF-") },
  { mime: "application/zip", kind: "document", test: (b) => hex(b, [0x50, 0x4b, 0x03, 0x04]) || hex(b, [0x50, 0x4b, 0x05, 0x06]) },
  { mime: "application/x-rar-compressed", kind: "document", test: (b) => ascii(b, "Rar!") },
  { mime: "application/x-7z-compressed", kind: "document", test: (b) => hex(b, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c]) },
  // Office Open XML and ODF are zip containers; the zip signature above already covers them.
];

// Text-like documents have no reliable magic bytes, so they are accepted only with a known extension
// and are stored as text/plain (never as anything the browser would run).
const TEXT_EXT: Record<string, string> = { txt: "text/plain", csv: "text/csv", json: "application/json", rtf: "application/rtf" };

async function head(file: Blob, n = 64): Promise<Uint8Array> {
  return new Uint8Array(await file.slice(0, n).arrayBuffer());
}

/** The real media type of a file, or null when the bytes match no allowed format. */
export async function sniffFile(file: File | Blob, name?: string): Promise<{ mime: string; kind: MediaKind } | null> {
  const bytes = await head(file);
  const text = String.fromCharCode(...bytes.slice(0, 16));
  for (const s of SIGNATURES) if (s.test(bytes, text)) return { mime: s.mime, kind: s.kind };
  const ext = (name ?? (file as File).name ?? "").split(".").pop()?.toLowerCase() ?? "";
  if (TEXT_EXT[ext]) {
    // Reject anything that starts like markup, so a ".txt" that is really HTML never slips through.
    if (/^\s*<(!doctype|html|script|svg|\?xml)/i.test(text)) return null;
    return { mime: TEXT_EXT[ext], kind: "document" };
  }
  return null;
}

const MESSAGES: Record<MediaKind | "any", string> = {
  image: "Envie uma imagem válida (JPG, PNG, WebP, GIF ou HEIC).",
  video: "Envie um vídeo válido (MP4, WebM ou MOV).",
  audio: "Envie um áudio válido.",
  document: "Este arquivo não é permitido ou está corrompido.",
  any: "Este arquivo não é permitido ou está corrompido.",
};

/**
 * Confirms a file is really one of the allowed kinds and returns the verified content-type to store.
 * Throws a friendly, Portuguese message when the bytes do not match.
 */
export async function verifyUpload(file: File | Blob, allow: MediaKind[], name?: string): Promise<string> {
  const found = await sniffFile(file, name);
  if (!found || !allow.includes(found.kind)) {
    throw new Error(MESSAGES[allow.length === 1 ? allow[0] : "any"]);
  }
  return found.mime;
}
