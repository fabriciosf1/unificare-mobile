export const FREQUENCIES = [
  '1x ao dia',
  '2x ao dia (a cada 12h)',
  '3x ao dia (a cada 8h)',
  '4x ao dia (a cada 6h)',
  'A cada 4h',
  'Se necessário',
];

// Horas entre doses para cada frequência. null = "Se necessário" (sem cálculo automático, horário livre).
const INTERVAL_HOURS: Record<string, number | null> = {
  '1x ao dia': 24,
  '2x ao dia (a cada 12h)': 12,
  '3x ao dia (a cada 8h)': 8,
  '4x ao dia (a cada 6h)': 6,
  'A cada 4h': 4,
  'Se necessário': null,
};

export function isManualFrequency(frequency: string): boolean {
  return INTERVAL_HOURS[frequency] == null;
}

function formatMinutes(totalMinutes: number): string {
  const m = ((totalMinutes % 1440) + 1440) % 1440;
  const hh = Math.floor(m / 60).toString().padStart(2, '0');
  const mm = (m % 60).toString().padStart(2, '0');
  return `${hh}:${mm}`;
}

// A partir de um único horário de referência, distribui as doses ao longo de 24h conforme a frequência.
export function computeScheduleTimes(frequency: string, hours: number, minutes: number): string[] {
  const interval = INTERVAL_HOURS[frequency];
  if (!interval) return [formatMinutes(hours * 60 + minutes)];

  const count = Math.round(24 / interval);
  const base = hours * 60 + minutes;
  const times: string[] = [];
  for (let i = 0; i < count; i++) {
    times.push(formatMinutes(base + i * interval * 60));
  }
  return times.sort();
}
