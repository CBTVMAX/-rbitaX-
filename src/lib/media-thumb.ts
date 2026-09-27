/** Captures a frame of a local video (at ~0.6 s) as a JPEG file, to be uploaded as its thumbnail. */
export async function videoPoster(file: File, at = 0.6): Promise<File | null> {
  if (typeof document === "undefined") return null;
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    await new Promise<void>((ok, fail) => {
      video.onloadeddata = () => ok();
      video.onerror = () => fail(new Error("video"));
    });
    video.currentTime = Math.min(at, Math.max(0, (video.duration || 1) / 2));
    await new Promise<void>((ok) => {
      video.onseeked = () => ok();
      setTimeout(ok, 1500);
    });
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return null;
    const scale = Math.min(1, 1080 / Math.max(w, h));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((ok) => canvas.toBlob(ok, "image/jpeg", 0.82));
    return blob ? new File([blob], `${file.name.replace(/\.[^.]+$/, "")}-capa.jpg`, { type: "image/jpeg" }) : null;
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}
