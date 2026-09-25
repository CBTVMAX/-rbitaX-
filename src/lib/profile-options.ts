export const GENDER_OPTIONS = [
  { value: "feminino", label: "Feminino" },
  { value: "masculino", label: "Masculino" },
  { value: "nao_binario", label: "Não binário" },
  { value: "outro", label: "Outro" },
  { value: "prefiro_nao_informar", label: "Prefiro não informar" },
];

// Values must match the CHECK constraint on Profile."relationshipStatus".
export const RELATIONSHIP_OPTIONS = [
  { value: "single", label: "Solteiro(a)" },
  { value: "relationship", label: "Em um relacionamento" },
  { value: "engaged", label: "Noivo(a)" },
  { value: "married", label: "Casado(a)" },
  { value: "separated", label: "Separado(a)" },
  { value: "divorced", label: "Divorciado(a)" },
  { value: "widowed", label: "Viúvo(a)" },
];

export function relationshipLabel(value: string | null | undefined) {
  return RELATIONSHIP_OPTIONS.find((o) => o.value === value)?.label ?? null;
}
