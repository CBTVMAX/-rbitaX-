// Testes de segurança da sanitização de URL/classe do RPG (espelham src/lib/rpg.ts).
// Execute: node scripts/security-checks.mjs
const CONTROL_CHARS = new RegExp("[\\u0000-\\u001F\\u007F-\\u009F\\u2028\\u2029]", "g");

function safeUrl(value) {
  const stripped = value.replace(CONTROL_CHARS, "").replace(/[\t\n\r]/g, "").trim();
  if (!stripped) return null;
  const scheme = stripped.match(/^([a-zA-Z][a-zA-Z0-9+.-]*):/);
  if (scheme) {
    const proto = scheme[1].toLowerCase();
    if (proto !== "http" && proto !== "https") return null;
    try {
      const u = new URL(stripped);
      if (u.protocol !== "http:" && u.protocol !== "https:") return null;
      return u.href;
    } catch {
      return null;
    }
  }
  return value.replace(CONTROL_CHARS, "").trim() || null;
}

function safeClass(value) {
  const tokens = value.split(/\s+/).filter((t) => /^rpg-[a-zA-Z0-9_-]+$/.test(t));
  return tokens.length ? tokens.join(" ") : null;
}

let pass = 0, fail = 0;
const eq = (name, got, want) => {
  const ok = got === want;
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}  => ${JSON.stringify(got)}`);
  ok ? pass++ : fail++;
};

// Bloqueados (devem virar null)
eq("javascript:", safeUrl("javascript:alert(1)"), null);
eq("JavaScript maiúsculo", safeUrl("JaVaScRiPt:alert(1)"), null);
eq("java\\tscript:", safeUrl("java\tscript:alert(1)"), null);
eq("java\\nscript:", safeUrl("java\nscript:alert(1)"), null);
eq("espaços/controle no início", safeUrl("  \u0001javascript:alert(1)"), null);
eq("data:text/html", safeUrl("data:text/html,<script>alert(1)</script>"), null);
eq("data:image (bloqueado agora)", safeUrl("data:image/png;base64,AAAA"), null);
eq("vbscript:", safeUrl("vbscript:msgbox(1)"), null);
eq("file:", safeUrl("file:///etc/passwd"), null);
eq("blob:", safeUrl("blob:https://x/abc"), null);

// Permitidos
eq("https normal", safeUrl("https://orbitax.social.br/x?a=1"), "https://orbitax.social.br/x?a=1");
eq("http normal", safeUrl("http://exemplo.com/"), "http://exemplo.com/");
eq("relativo âncora", safeUrl("#secao"), "#secao");
eq("relativo caminho", safeUrl("/perfil/nic"), "/perfil/nic");

// Classes
eq("classe Tailwind bloqueada", safeClass("fixed inset-0 z-50 opacity-0"), null);
eq("classe rpg- permitida", safeClass("rpg-card rpg-title fixed z-50"), "rpg-card rpg-title");
eq("classe vazia", safeClass("   "), null);

console.log(`\n${pass} passaram, ${fail} falharam.`);
process.exit(fail ? 1 : 0);
