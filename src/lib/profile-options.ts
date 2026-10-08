export const GENDER_OPTIONS = [
  { value: "feminino", label: "Feminino" },
  { value: "masculino", label: "Masculino" },
  { value: "nao_binario", label: "Não binário" },
  { value: "outro", label: "Outro" },
  { value: "prefiro_nao_informar", label: "Prefiro não informar" },
];

// Valores iguais à regra de Profile.relationship (mesmas opções do VK, mais separado/divorciado/viúvo).
export const RELATIONSHIP_OPTIONS = [
  { value: "single", label: "Solteiro(a)" },
  { value: "relationship", label: "Em um relacionamento" },
  { value: "engaged", label: "Noivo(a)" },
  { value: "married", label: "Casado(a)" },
  { value: "civil_union", label: "Em uma união estável" },
  { value: "complicated", label: "Relacionamento enrolado" },
  { value: "searching", label: "Sempre procurando" },
  { value: "in_love", label: "Apaixonado(a)" },
  { value: "separated", label: "Separado(a)" },
  { value: "divorced", label: "Divorciado(a)" },
  { value: "widowed", label: "Viúvo(a)" },
];

/** Status que pedem um parceiro (como no VK, aparece o campo "Parceiro"). */
export const PARTNER_STATUSES = ["relationship", "engaged", "married", "civil_union", "complicated", "in_love"];

/** Casamento e união estável viram "Cônjuge" nos vínculos; os demais, "Companheiro(a)". */
export function partnerRelation(status: string) {
  return status === "married" || status === "civil_union" ? "Cônjuge" : "Companheiro(a)";
}

export function relationshipLabel(value: string | null | undefined) {
  return RELATIONSHIP_OPTIONS.find((o) => o.value === value)?.label ?? null;
}

// ---------------------------------------------------------------- mais informações (Profile.about)
export type ProfileEducation = { school: string; course?: string; level?: string; year?: number };
export type ProfileCareer = {
  company: string;
  /** Comunidade do Órbita X marcada como local de trabalho (id); nome, link e foto vêm na leitura. */
  community?: string;
  communityName?: string;
  communitySlug?: string;
  communityAvatar?: string;
  role?: string;
  city?: string;
  from?: number;
  to?: number;
};
export type ProfileAbout = {
  hometown?: string;
  languages?: string[];
  education?: ProfileEducation[];
  career?: ProfileCareer[];
  motto?: string;
  priority?: string;
  peopleValue?: string;
  inspiredBy?: string;
  smoking?: string;
  alcohol?: string;
  /** Texto longo de apresentação (até 2.000 caracteres). */
  aboutMe?: string;
  favorites?: { music?: string; movies?: string; books?: string; games?: string };
  /** Para perfis de roleplay. */
  character?: { universe?: string; faceclaim?: string; charAge?: string; affiliation?: string };
  /** Só o dono recebe: quem vê cada campo (sem a chave = Público). */
  visibility?: Partial<Record<AboutField, AboutVisibility>>;
};

export type AboutVisibility = "all" | "friends" | "only_me";
export type AboutField =
  | "aboutMe"
  | "hometown"
  | "languages"
  | "education"
  | "career"
  | "life"
  | "music"
  | "movies"
  | "books"
  | "games"
  | "universe"
  | "faceclaim"
  | "charAge"
  | "affiliation";

export const ABOUT_VISIBILITY_OPTIONS: { value: AboutVisibility; label: string }[] = [
  { value: "all", label: "Público" },
  { value: "friends", label: "Amigos" },
  { value: "only_me", label: "Só eu" },
];

export const FAVORITE_FIELDS: { key: "music" | "movies" | "books" | "games"; label: string; placeholder: string }[] = [
  { key: "music", label: "Músicas", placeholder: "Artistas, bandas, músicas que marcam você" },
  { key: "movies", label: "Filmes e séries", placeholder: "O que você assiste e reassiste" },
  { key: "books", label: "Livros", placeholder: "Leituras favoritas" },
  { key: "games", label: "Jogos", placeholder: "Jogos que você joga ou jogou" },
];

export const CHARACTER_FIELDS: { key: "universe" | "faceclaim" | "charAge" | "affiliation"; label: string; placeholder: string; max: number }[] = [
  { key: "universe", label: "Universo / Fandom", placeholder: "Ex.: Marvel, Harry Potter, original", max: 80 },
  { key: "faceclaim", label: "Faceclaim", placeholder: "Quem empresta o rosto ao personagem", max: 80 },
  { key: "charAge", label: "Idade do personagem", placeholder: "Ex.: 24 anos, imortal", max: 40 },
  { key: "affiliation", label: "Afiliação / Grupo", placeholder: "Casa, clã, equipe, facção…", max: 80 },
];

export const LANGUAGE_OPTIONS = [
  "Português", "Inglês", "Espanhol", "Francês", "Italiano", "Alemão", "Japonês", "Coreano", "Chinês",
  "Russo", "Árabe", "Hebraico", "Holandês", "Turco", "Polonês", "Grego", "Hindi", "Libras",
];
export const EDUCATION_LEVELS = ["Ensino fundamental", "Ensino médio", "Técnico", "Graduação", "Pós-graduação", "Mestrado", "Doutorado", "Curso livre"];
export const LIFE_PRIORITIES = ["Família e filhos", "Carreira e dinheiro", "Diversão e lazer", "Ciência e pesquisa", "Melhorar o mundo", "Autodesenvolvimento", "Beleza e arte", "Fama e influência"];
export const PEOPLE_VALUES = ["Inteligência e criatividade", "Bondade e honestidade", "Beleza e saúde", "Poder e riqueza", "Coragem e persistência", "Humor e amor à vida"];
export const HABIT_VIEWS = ["Muito negativa", "Negativa", "Neutra", "Compromisso", "Positiva"];

export function parseAbout(raw: unknown): ProfileAbout {
  return raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as ProfileAbout) : {};
}
