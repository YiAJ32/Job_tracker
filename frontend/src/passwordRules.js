// Las mismas reglas que valida el backend (validate_new_password) para contraseñas nuevas
export const PASSWORD_RULES = [
  { key: "auth.rule.length", test: (p) => p.length >= 12 && p.length <= 72 },
  { key: "auth.rule.number", test: (p) => /[0-9]/.test(p) },
  { key: "auth.rule.upper", test: (p) => /[A-Z]/.test(p) },
  { key: "auth.rule.special", test: (p) => /[!-/:-@[-`{-~]/.test(p) },
  // Solo ASCII visible: sin espacios, tildes, ñ ni emojis
  { key: "auth.rule.ascii", test: (p) => /^[!-~]*$/.test(p) },
];

export const isValidPassword = (password) => PASSWORD_RULES.every((rule) => rule.test(password));
