// Same boundaries as the compute_zodiac() function in the database.
export function zodiacFor(month: number, day: number): string {
  const md = month * 100 + day;
  if (md >= 321 && md <= 419) return "Áries";
  if (md >= 420 && md <= 520) return "Touro";
  if (md >= 521 && md <= 620) return "Gêmeos";
  if (md >= 621 && md <= 722) return "Câncer";
  if (md >= 723 && md <= 822) return "Leão";
  if (md >= 823 && md <= 922) return "Virgem";
  if (md >= 923 && md <= 1022) return "Libra";
  if (md >= 1023 && md <= 1121) return "Escorpião";
  if (md >= 1122 && md <= 1221) return "Sagitário";
  if (md >= 1222 || md <= 119) return "Capricórnio";
  if (md >= 120 && md <= 218) return "Aquário";
  return "Peixes";
}
