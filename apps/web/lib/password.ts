export const PASSWORD_REQUIREMENTS_HINT =
  "Mínimo de 8 caracteres, com letra maiúscula, minúscula, número e caractere especial.";

/** Mesmas regras aplicadas pelo backend (`IsStrongPassword`). */
export function getPasswordStrengthError(password: string): string | null {
  if (password.length < 8) {
    return "A senha deve ter no mínimo 8 caracteres.";
  }
  if (!/[a-z]/.test(password)) {
    return "A senha deve conter ao menos uma letra minúscula.";
  }
  if (!/[A-Z]/.test(password)) {
    return "A senha deve conter ao menos uma letra maiúscula.";
  }
  if (!/[0-9]/.test(password)) {
    return "A senha deve conter ao menos um número.";
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return "A senha deve conter ao menos um caractere especial.";
  }
  return null;
}
