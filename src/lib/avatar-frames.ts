// Avatar frames (Personalizar perfil → Molduras). Artwork lives in /public/frames/{id}.webp
// (512px, transparent) and /public/frames/thumbs/{id}.webp. Every image is a square canvas
// FRAME_SCALE times the avatar diameter, with the avatar hole exactly in the middle.
import type { CSSProperties } from "react";

export const FRAME_SCALE = 1.6;

export const FRAME_TIERS = {
  gratuita: { label: "Gratuitas", badge: "Grátis", free: true, className: "text-emerald-400 border-emerald-400/40 bg-emerald-400/10" },
  rara: { label: "Raras", badge: "Rara", free: false, className: "text-sky-300 border-sky-400/40 bg-sky-400/10" },
  epica: { label: "Épicas", badge: "Épica", free: false, className: "text-fuchsia-300 border-fuchsia-400/40 bg-fuchsia-400/10" },
  mistica: { label: "Místicas", badge: "Mística", free: false, className: "text-violet-300 border-violet-400/40 bg-violet-400/10" },
  lendaria: { label: "Lendárias", badge: "Lendária", free: false, className: "text-amber-300 border-amber-400/40 bg-amber-400/10" },
  fantasia: { label: "Fantasias", badge: "Fantasia", free: false, className: "text-pink-300 border-pink-400/40 bg-pink-400/10" },
  heroica: { label: "Heroica", badge: "Heroica", free: false, className: "text-red-300 border-red-400/40 bg-red-400/10" },
  magica: { label: "Mágica", badge: "Mágica", free: false, className: "text-yellow-200 border-yellow-300/40 bg-yellow-300/10" },
} as const;

export type FrameTier = keyof typeof FRAME_TIERS;

export type AvatarFrame = { id: string; tier: FrameTier; name: string; tagline: string; ext: number; price?: number };

export const AVATAR_FRAMES: AvatarFrame[] = [
  { id: "gratuita-01", tier: "gratuita", name: "Órbita Básica", tagline: "Simples. Sempre com você.", ext: 1.13 },
  { id: "gratuita-02", tier: "gratuita", name: "Estrelas", tagline: "Pequenos detalhes, grandes conexões.", ext: 1.23 },
  { id: "gratuita-03", tier: "gratuita", name: "Lua", tagline: "A luz que te acompanha.", ext: 1.2 },
  { id: "gratuita-04", tier: "gratuita", name: "Planeta", tagline: "Cada pessoa é um mundo.", ext: 1.32 },
  { id: "gratuita-05", tier: "gratuita", name: "Astronauta", tagline: "Sempre explorando novos horizontes.", ext: 1.3 },
  { id: "gratuita-06", tier: "gratuita", name: "Nebulosa", tagline: "Cores que contam histórias.", ext: 1.26 },
  { id: "gratuita-07", tier: "gratuita", name: "Cometa", tagline: "Deixe sua marca por onde passar.", ext: 1.28 },
  { id: "gratuita-08", tier: "gratuita", name: "Galáxia", tagline: "Um universo de possibilidades.", ext: 1.32 },
  { id: "gratuita-09", tier: "gratuita", name: "Aurora", tagline: "Luzes que inspiram.", ext: 1.26 },
  { id: "gratuita-10", tier: "gratuita", name: "Solar", tagline: "Brilhe do seu jeito.", ext: 1.24 },
  { id: "gratuita-11", tier: "gratuita", name: "Cristal", tagline: "Transparência é força.", ext: 1.24 },
  { id: "gratuita-12", tier: "gratuita", name: "Nuvem Estelar", tagline: "Sonhe. Conecte. Realize.", ext: 1.29 },
  { id: "gratuita-13", tier: "gratuita", name: "Minimalista", tagline: "Menos é mais.", ext: 1.14 },
  { id: "gratuita-14", tier: "gratuita", name: "Pulse", tagline: "Sua energia em movimento.", ext: 1.24 },
  { id: "gratuita-15", tier: "gratuita", name: "Natureza Cósmica", tagline: "Beleza em equilíbrio.", ext: 1.24 },
  { id: "rara-01", tier: "rara", name: "Aurora", tagline: "Luzes que contam histórias.", ext: 1.31 },
  { id: "rara-02", tier: "rara", name: "Cristal Lunar", tagline: "Beleza em cada detalhe.", ext: 1.34 },
  { id: "rara-03", tier: "rara", name: "Nebulosa Real", tagline: "Sua essência em expansão.", ext: 1.29 },
  { id: "rara-04", tier: "rara", name: "Cometa", tagline: "Sempre em movimento.", ext: 1.31 },
  { id: "rara-05", tier: "rara", name: "Satélite", tagline: "Conectado a novas órbitas.", ext: 1.34 },
  { id: "rara-06", tier: "rara", name: "Cyber Blue", tagline: "Tecnologia e estilo.", ext: 1.31 },
  { id: "rara-07", tier: "rara", name: "Violet Space", tagline: "Mistério em cada conexão.", ext: 1.32 },
  { id: "rara-08", tier: "rara", name: "Estrela Cadente", tagline: "Grandes desejos, novas rotas.", ext: 1.33 },
  { id: "rara-09", tier: "rara", name: "Planetas", tagline: "Todo mundo é único.", ext: 1.33 },
  { id: "rara-10", tier: "rara", name: "Lua Crescente", tagline: "Novos ciclos, novas histórias.", ext: 1.35 },
  { id: "rara-11", tier: "rara", name: "Chamas Azuis", tagline: "Energia que impulsiona.", ext: 1.34 },
  { id: "rara-12", tier: "rara", name: "Chamas Roxas", tagline: "Intensidade em cada passo.", ext: 1.35 },
  { id: "rara-13", tier: "rara", name: "Geométrica", tagline: "Equilíbrio e conexão.", ext: 1.29 },
  { id: "rara-14", tier: "rara", name: "Galáxia", tagline: "Um universo dentro de você.", ext: 1.37 },
  { id: "rara-15", tier: "rara", name: "Infinity", tagline: "Sem limites para ser você.", ext: 1.37 },
  { id: "epica-01", tier: "epica", name: "Fênix", tagline: "Renascimento é parte da sua história.", ext: 1.42 },
  { id: "epica-02", tier: "epica", name: "Spirit Wolf", tagline: "Lealdade em outra forma.", ext: 1.5 },
  { id: "epica-03", tier: "epica", name: "Anjo Sombrio", tagline: "Luz e escuridão em equilíbrio.", ext: 1.5 },
  { id: "epica-04", tier: "epica", name: "Demonic Soul", tagline: "Para quem abraça seu lado intenso.", ext: 1.49 },
  { id: "epica-05", tier: "epica", name: "Cyberpunk", tagline: "Tecnologia que te define.", ext: 1.47 },
  { id: "epica-06", tier: "epica", name: "Anjo Celestial", tagline: "Bondade também é força.", ext: 1.47 },
  { id: "epica-07", tier: "epica", name: "Dragão Astral", tagline: "Força que atravessa dimensões.", ext: 1.46 },
  { id: "epica-08", tier: "epica", name: "Universo Paralelo", tagline: "Outras versões de você.", ext: 1.41 },
  { id: "epica-09", tier: "epica", name: "Fragmentos", tagline: "Beleza nas imperfeições.", ext: 1.39 },
  { id: "epica-10", tier: "epica", name: "Dragão de Água", tagline: "Calma que domina.", ext: 1.42 },
  { id: "epica-11", tier: "epica", name: "Natureza Viva", tagline: "Raízes que te conectam.", ext: 1.34 },
  { id: "epica-12", tier: "epica", name: "Magma", tagline: "Paixão em combustão.", ext: 1.35 },
  { id: "epica-13", tier: "epica", name: "Temporal", tagline: "Além do tempo.", ext: 1.41 },
  { id: "epica-14", tier: "epica", name: "Thunder", tagline: "Energia que impressiona.", ext: 1.34 },
  { id: "epica-15", tier: "epica", name: "Sakura", tagline: "Força na delicadeza.", ext: 1.33 },
  { id: "mistica-01", tier: "mistica", name: "Wolf of the Void", tagline: "O vazio também te escolhe.", ext: 1.5 },
  { id: "mistica-02", tier: "mistica", name: "Órbita Suprema", tagline: "Tudo se conecta.", ext: 1.5 },
  { id: "mistica-03", tier: "mistica", name: "Eclipse Absoluto", tagline: "Onde a luz se rende.", ext: 1.49 },
  { id: "mistica-04", tier: "mistica", name: "Galactic Emperor", tagline: "Lidere o seu universo.", ext: 1.5 },
  { id: "mistica-05", tier: "mistica", name: "Frozen Galaxy", tagline: "Beleza que transcende o tempo.", ext: 1.48 },
  { id: "mistica-06", tier: "mistica", name: "Phoenix Eternal", tagline: "Renasça quantas vezes for preciso.", ext: 1.5 },
  { id: "mistica-07", tier: "mistica", name: "Cosmic Rift", tagline: "Outras realidades em você.", ext: 1.5 },
  { id: "mistica-08", tier: "mistica", name: "Angel of Shadows", tagline: "Luz e trevas em equilíbrio.", ext: 1.5 },
  { id: "mistica-09", tier: "mistica", name: "Chronos", tagline: "O tempo obedece.", ext: 1.5 },
  { id: "mistica-10", tier: "mistica", name: "Astral Dragon", tagline: "Força além dos mundos.", ext: 1.5 },
  { id: "mistica-11", tier: "mistica", name: "Soul Reaper", tagline: "Além da vida, ainda presente.", ext: 1.5 },
  { id: "mistica-12", tier: "mistica", name: "Cyber Nexus", tagline: "Humano. Digital. Infinito.", ext: 1.47 },
  { id: "mistica-13", tier: "mistica", name: "Stellar Whale", tagline: "Grandes almas navegam longe.", ext: 1.47 },
  { id: "mistica-14", tier: "mistica", name: "Solar & Lunar", tagline: "Dois mundos. Uma essência.", ext: 1.46 },
  { id: "mistica-15", tier: "mistica", name: "Infinity Core", tagline: "Sem começo. Sem fim.", ext: 1.5 },
  { id: "lendaria-01", tier: "lendaria", name: "Dark Wolf", tagline: "A força da escuridão guia os que não se perdem.", ext: 1.5 },
  { id: "lendaria-02", tier: "lendaria", name: "Cosmic Astronaut", tagline: "Explore além. Seu universo, suas regras.", ext: 1.49 },
  { id: "lendaria-03", tier: "lendaria", name: "Eternal Dragon", tagline: "Poder que atravessa dimensões.", ext: 1.5 },
  { id: "lendaria-04", tier: "lendaria", name: "Royal Eclipse", tagline: "Realeza para quem brilha diferente.", ext: 1.5 },
  { id: "lendaria-05", tier: "lendaria", name: "Black Eclipse", tagline: "Onde a luz se curva à sua presença.", ext: 1.46 },
  { id: "lendaria-06", tier: "lendaria", name: "Fallen Angel", tagline: "Beleza. Caos. Liberdade.", ext: 1.5 },
  { id: "lendaria-07", tier: "lendaria", name: "Galaxy Sovereign", tagline: "Mais que um perfil. Um universo próprio.", ext: 1.5 },
  { id: "lendaria-08", tier: "lendaria", name: "Dark Reaper", tagline: "O fim também faz parte da jornada.", ext: 1.5 },
  { id: "lendaria-09", tier: "lendaria", name: "Cyber Phantom", tagline: "O futuro já encontrou seu portador.", ext: 1.48 },
  { id: "lendaria-10", tier: "lendaria", name: "Órbita Infinity", tagline: "Tudo se conecta. Sempre.", ext: 1.5 },
  { id: "fantasia-01", tier: "fantasia", name: "Neko", tagline: "Fofo, mas perigoso.", ext: 1.4 },
  { id: "fantasia-02", tier: "fantasia", name: "Coelhinho", tagline: "Doce de dia, ousado à noite.", ext: 1.46 },
  { id: "fantasia-03", tier: "fantasia", name: "Demônio", tagline: "Tentação em forma de estilo.", ext: 1.46 },
  { id: "fantasia-04", tier: "fantasia", name: "Anjo", tagline: "Luz também tem atitude.", ext: 1.44 },
  { id: "fantasia-05", tier: "fantasia", name: "Diabinho", tagline: "Um pouco de caos faz bem.", ext: 1.34 },
  { id: "fantasia-06", tier: "fantasia", name: "Astronauta", tagline: "Explorando novas versões.", ext: 1.44 },
  { id: "fantasia-07", tier: "fantasia", name: "Cowboy", tagline: "Livre em qualquer universo.", ext: 1.46 },
  { id: "fantasia-08", tier: "fantasia", name: "Samurai", tagline: "Disciplina é poder.", ext: 1.45 },
  { id: "fantasia-09", tier: "fantasia", name: "Pirata", tagline: "Em busca de novas histórias.", ext: 1.48 },
  { id: "fantasia-10", tier: "fantasia", name: "Vampiro", tagline: "Elegância nunca morre.", ext: 1.5 },
  { id: "fantasia-11", tier: "fantasia", name: "Bruxo", tagline: "Magia faz parte de mim.", ext: 1.49 },
  { id: "fantasia-12", tier: "fantasia", name: "Lobo", tagline: "Instinto. Força. Liberdade.", ext: 1.47 },
  { id: "fantasia-13", tier: "fantasia", name: "Dragão", tagline: "Carregue o fogo em você.", ext: 1.42 },
  { id: "fantasia-14", tier: "fantasia", name: "Rei", tagline: "Porque você nasceu pra mais.", ext: 1.42 },
  { id: "fantasia-15", tier: "fantasia", name: "Gamer", tagline: "Jogue do seu jeito.", ext: 1.39 },
  { id: "heroica-01", tier: "heroica", name: "Armadura Estelar", tagline: "Tecnologia que impulsiona.", ext: 1.44, price: 8000 },
  { id: "heroica-02", tier: "heroica", name: "Guardião Cósmico", tagline: "Além dos limites.", ext: 1.42, price: 7000 },
  { id: "heroica-03", tier: "heroica", name: "Senhor do Trovão", tagline: "Força que ecoa.", ext: 1.46, price: 6500 },
  { id: "heroica-04", tier: "heroica", name: "Defensor Supremo", tagline: "Coragem em qualquer mundo.", ext: 1.42, price: 6000 },
  { id: "heroica-05", tier: "heroica", name: "Força Esmeralda", tagline: "Poder sem limites.", ext: 1.44, price: 6000 },
  { id: "heroica-06", tier: "heroica", name: "Sombra Real", tagline: "Estratégia. Precisão. Controle.", ext: 1.49, price: 5500 },
  { id: "heroica-07", tier: "heroica", name: "Arte Mística", tagline: "Realidades ao seu alcance.", ext: 1.42, price: 6500 },
  { id: "heroica-08", tier: "heroica", name: "Teia Dimensional", tagline: "Conexões em todo lugar.", ext: 1.46, price: 5000 },
  { id: "heroica-09", tier: "heroica", name: "Comandante Galáctico", tagline: "Liderança além das estrelas.", ext: 1.48, price: 6500 },
  { id: "heroica-10", tier: "heroica", name: "Poder Bruto", tagline: "Quando a raiva vira força.", ext: 1.44, price: 5500 },
  { id: "heroica-11", tier: "heroica", name: "Fênix Eterna", tagline: "Renascimento é poder.", ext: 1.49, price: 7000 },
  { id: "heroica-12", tier: "heroica", name: "Assassino das Sombras", tagline: "Silêncio também é poder.", ext: 1.48, price: 5000 },
  { id: "heroica-13", tier: "heroica", name: "Guardião Celestial", tagline: "Luz que protege.", ext: 1.46, price: 6000 },
  { id: "heroica-14", tier: "heroica", name: "Velocidade Suprema", tagline: "Sempre um passo à frente.", ext: 1.44, price: 5500 },
  { id: "heroica-15", tier: "heroica", name: "Protetor Multiversal", tagline: "Infinitas possibilidades.", ext: 1.41, price: 8000 },
  { id: "magica-01", tier: "magica", name: "Hogwarts Legacy", tagline: "Onde grandes histórias começam.", ext: 1.47, price: 5000 },
  { id: "magica-02", tier: "magica", name: "Relíquias da Morte", tagline: "Poder. Lealdade. Escolha.", ext: 1.41, price: 4500 },
  { id: "magica-03", tier: "magica", name: "O Pomo de Ouro", tagline: "Mais que um jogo, é uma paixão.", ext: 1.46, price: 4000 },
  { id: "magica-04", tier: "magica", name: "Varinha Ancestral", tagline: "O verdadeiro poder está em quem a usa.", ext: 1.46, price: 4500 },
  { id: "magica-05", tier: "magica", name: "Plataforma 9¾", tagline: "Novos mundos te esperam.", ext: 1.46, price: 4000 },
  { id: "magica-06", tier: "magica", name: "Grifinória", tagline: "Coragem. Determinação.", ext: 1.41, price: 3500 },
  { id: "magica-07", tier: "magica", name: "Sonserina", tagline: "Ambição. Inteligência.", ext: 1.41, price: 3500 },
  { id: "magica-08", tier: "magica", name: "Corvinal", tagline: "Sabedoria. Criatividade.", ext: 1.44, price: 3500 },
  { id: "magica-09", tier: "magica", name: "Lufa-Lufa", tagline: "Lealdade. Paciência.", ext: 1.41, price: 3500 },
  { id: "magica-10", tier: "magica", name: "Mapa do Maroto", tagline: "Sempre um passo à frente.", ext: 1.46, price: 4000 },
  { id: "magica-11", tier: "magica", name: "Edwiges", tagline: "Mensagens que aproximam.", ext: 1.44, price: 4000 },
  { id: "magica-12", tier: "magica", name: "Expecto Patronum", tagline: "A luz que afasta as trevas.", ext: 1.36, price: 4500 },
  { id: "magica-13", tier: "magica", name: "Tom Riddle", tagline: "Ambição além dos limites.", ext: 1.39, price: 5000 },
  { id: "magica-14", tier: "magica", name: "Magia das Estrelas", tagline: "O universo também é mágico.", ext: 1.37, price: 4000 },
  { id: "magica-15", tier: "magica", name: "Sala Precisa", tagline: "Tudo o que você imaginar.", ext: 1.44, price: 5000 },
];

const BY_ID = new Map(AVATAR_FRAMES.map((f) => [f.id, f]));

export function getFrame(id: string | null | undefined) {
  return id ? BY_ID.get(id) ?? null : null;
}

/** Until Órbita Coins exists only free frames can be equipped (also enforced in the database). */
export function canEquipFrame(id: string) {
  const f = getFrame(id);
  return !!f && FRAME_TIERS[f.tier].free;
}

export function frameSrc(id: string, thumb = false) {
  return thumb ? `/frames/thumbs/${id}.webp` : `/frames/${id}.webp`;
}

/**
 * Dark disc drawn behind the frame, so the artwork reads the same over any cover
 * and in the light theme (the designs were made on a dark background).
 */
export function frameBackdropStyle(frame: AvatarFrame): CSSProperties {
  const solid = ((frame.ext - 0.1) / FRAME_SCALE) * 100;
  const end = ((frame.ext + 0.08) / FRAME_SCALE) * 100;
  return {
    background: `radial-gradient(circle closest-side, rgba(11,14,28,0.96) ${solid.toFixed(1)}%, rgba(11,14,28,0) ${end.toFixed(1)}%)`,
  };
}
