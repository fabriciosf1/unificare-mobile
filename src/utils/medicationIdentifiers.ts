export const IDENTIFIER_COLORS: { value: string; hex: string }[] = [
  { value: 'vermelho', hex: '#e53935' },
  { value: 'azul', hex: '#1e88e5' },
  { value: 'verde', hex: '#43a047' },
  { value: 'amarelo', hex: '#fdd835' },
  { value: 'laranja', hex: '#fb8c00' },
  { value: 'roxo', hex: '#8e24aa' },
  { value: 'rosa', hex: '#d81b60' },
  { value: 'marrom', hex: '#6d4c41' },
  { value: 'preto', hex: '#212121' },
  { value: 'branco', hex: '#f5f5f5' },
];

export const COLOR_HEX: Record<string, string> = Object.fromEntries(
  IDENTIFIER_COLORS.map((c) => [c.value, c.hex])
);
