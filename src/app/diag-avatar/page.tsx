"use client";

// Temporary diagnostic harness. Reproduces the editor's load + paint path in the user's own
// browser and reports, on screen, whether the image decodes and whether the canvas ends up blank.
// Not part of the app; delete after diagnosis.
import { useEffect, useState } from "react";

type Line = { k: string; v: string };

export default function Page() {
  const [lines, setLines] = useState<Line[]>([]);
  const add = (k: string, v: string) => setLines((l) => [...l, { k, v }]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/avatar-diego.webp");
        const blob = await r.blob();
        const file = new File([blob], "teste.webp", { type: blob.type || "image/webp" });
        add("arquivo", `${file.name} · ${file.type} · ${(file.size / 1024).toFixed(0)} KB`);

        // 1. O upload-guard aceitaria?
        add("verifyUpload", "ver separadamente");

        // 2. O probe createImageBitmap passa?
        try {
          const bmp = await createImageBitmap(file);
          add("createImageBitmap", `OK ${bmp.width}x${bmp.height}`);
          bmp.close();
        } catch (e) {
          add("createImageBitmap", `FALHOU: ${e}`);
          return;
        }

        // 3. O new Image() carrega? (caminho que o editor usa)
        const url = URL.createObjectURL(file);
        const img = await new Promise<HTMLImageElement>((res, rej) => {
          const im = new Image();
          im.onload = () => res(im);
          im.onerror = () => rej(new Error("img.onerror"));
          im.src = url;
        });
        add("new Image()", `OK ${img.naturalWidth}x${img.naturalHeight} · complete=${img.complete}`);

        const nat = { w: img.naturalWidth, h: img.naturalHeight };
        const ratio = 1;
        const cropH = Math.min(nat.w, nat.h);
        const crop = { x: (nat.w - cropH) / 2, y: (nat.h - cropH) / 2, w: cropH };
        add("crop inicial", `x=${crop.x} y=${crop.y} w=${crop.w} h=${cropH}`);

        // 4. O canvas do palco, com o mesmo tamanho que o editor mediria.
        const stage = document.createElement("div");
        stage.style.cssText = "width:600px;max-height:58vh;position:relative";
        document.body.appendChild(stage);
        const c = document.createElement("canvas");
        stage.appendChild(c);
        const box = c.parentElement!.getBoundingClientRect();
        add("caixa medida", `${box.width.toFixed(1)} x ${box.height.toFixed(1)}`);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        c.width = Math.round(box.width * dpr);
        c.height = Math.round(box.height * dpr);
        add("canvas bitmap", `${c.width} x ${c.height} (dpr=${dpr})`);

        // 5. A mesma pintura do paintAvatar, com a transformacao corrigida.
        const ctx = c.getContext("2d");
        if (!ctx) {
          add("getContext", "FALHOU");
          return;
        }
        const outW = c.width, outH = c.height;
        const sx = outW / crop.w, sy = outH / cropH;
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, outW, outH);
        ctx.clip();
        ctx.scale(sx, sy);
        ctx.translate(-crop.x, -crop.y);
        ctx.translate(nat.w / 2, nat.h / 2);
        ctx.rotate(0);
        ctx.translate(-nat.w / 2, -nat.h / 2);
        ctx.drawImage(img, 0, 0, nat.w, nat.h);
        ctx.restore();

        // 6. Saiu alguma coisa? Amostra o centro do canvas.
        const d = ctx.getImageData(Math.floor(outW / 2), Math.floor(outH / 2), 1, 1).data;
        add("pixel central", `rgba(${d[0]},${d[1]},${d[2]},${d[3]})`);
        const visivel = d[3] > 0;
        add("RESULTADO", visivel ? "A imagem FOI pintada" : "O canvas ficou TRANSPARENTE");

        // 7. E o canvas do editor de verdade, com o componente real.
        const { AvatarEditor } = await import("@/components/avatar-editor");
        add("AvatarEditor", "montando...");
        const host = document.createElement("div");
        document.body.appendChild(host);
        const { createRoot } = await import("react-dom/client");
        createRoot(host).render(
          <AvatarEditor file={file} onCancel={() => {}} onConfirm={async () => {}} />
        );
        setTimeout(() => {
          const ec = document.getElementById("editor-canvas") as HTMLCanvasElement | null;
          if (!ec) return add("canvas do editor", "NAO ENCONTRADO");
          const ectx = ec.getContext("2d");
          const px = ectx?.getImageData(Math.floor(ec.width / 2), Math.floor(ec.height / 2), 1, 1).data;
          add("canvas do editor", `${ec.width}x${ec.height} · centro rgba(${px?.[0]},${px?.[1]},${px?.[2]},${px?.[3]})`);
          add("VEREDITO", px && px[3] > 0 ? "EDITOR PINTA ✅" : "EDITOR EM BRANCO ❌");
        }, 1200);
      } catch (e) {
        add("ERRO", String(e));
      }
    })();
  }, []);

  return (
    <div style={{ color: "#eee", fontFamily: "monospace", padding: 12, fontSize: 13 }}>
      {lines.map((l, i) => (
        <div key={i} style={{ padding: "2px 0", color: l.k === "RESULTADO" || l.k === "VEREDITO" ? "#7cf" : undefined }}>
          <b>{l.k}</b>: {l.v}
        </div>
      ))}
      <hr style={{ margin: "10px 0" }} />
      <div style={{ opacity: 0.6 }}>(o editor real aparece abaixo)</div>
    </div>
  );
}
