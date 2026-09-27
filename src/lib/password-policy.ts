const COMMON = new Set([
  "12345678", "123456789", "1234567890", "password", "password1", "senha123", "senha1234", "qwerty123", "abc12345",
  "11111111", "00000000", "iloveyou", "orbitax123", "admin123", "brasil123", "mudar123",
]);

/** Rules for a new password (the server hashes it with bcrypt and may also reject known leaked passwords). */
export function passwordProblem(password: string, confirm?: string): string | null {
  if (password.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
  if (password.length > 72) return "Use no máximo 72 caracteres.";
  if (!/[A-Za-zÀ-ÿ]/.test(password) || !/\d/.test(password)) return "Misture letras e números na senha.";
  if (COMMON.has(password.toLowerCase())) return "Essa senha é muito comum. Escolha outra.";
  if (confirm !== undefined && password !== confirm) return "As senhas não são iguais.";
  return null;
}
