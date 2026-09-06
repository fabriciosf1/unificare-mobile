import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing, typography } from '../theme';

const DAYS: { value: number; label: string }[] = [
  { value: 1, label: 'Se' },
  { value: 2, label: 'Te' },
  { value: 3, label: 'Qa' },
  { value: 4, label: 'Qi' },
  { value: 5, label: 'Se' },
  { value: 6, label: 'Sa' },
  { value: 7, label: 'Do' },
];

export default function WeekdaysPicker({
  accent,
  value,
  onChange,
}: {
  accent: string;
  value: number[];
  onChange: (value: number[]) => void;
}) {
  function toggle(day: number) {
    onChange(value.includes(day) ? value.filter((d) => d !== day) : [...value, day].sort((a, b) => a - b));
  }

  return (
    <View style={styles.section}>
      <Text style={styles.label}>Dias da semana</Text>
      <Text style={styles.hint}>{value.length === 0 ? 'Nenhum selecionado = todos os dias' : 'Só nos dias marcados'}</Text>
      <View style={styles.chipRow}>
        {DAYS.map((d, i) => {
          const active = value.includes(d.value);
          return (
            <TouchableOpacity
              key={`${d.value}-${i}`}
              style={[styles.chip, active && { backgroundColor: accent, borderColor: accent }]}
              onPress={() => toggle(d.value)}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>{d.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.md },
  label: { fontSize: typography.label, fontWeight: '700', color: colors.text, marginBottom: 4 },
  hint: { fontSize: typography.label - 2, color: colors.muted, marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: { color: colors.muted, fontWeight: '700', fontSize: typography.label - 2 },
  chipTextActive: { color: '#fff' },
});
