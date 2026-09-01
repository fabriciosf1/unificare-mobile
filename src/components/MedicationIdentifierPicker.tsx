import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { colors, spacing, typography, buttonHeight } from '../theme';
import { IDENTIFIER_COLORS } from '../utils/medicationIdentifiers';

export default function MedicationIdentifierPicker({
  accent,
  color,
  onColorChange,
  number,
  onNumberChange,
}: {
  accent: string;
  color: string | null;
  onColorChange: (value: string | null) => void;
  number: string;
  onNumberChange: (value: string) => void;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.label}>Cor e/ou número de identificação</Text>
      <Text style={styles.hint}>Ajuda o paciente a reconhecer o remédio mesmo com a visão ruim.</Text>
      <View style={styles.swatchRow}>
        <TouchableOpacity
          style={[styles.noneSwatch, !color && { borderColor: accent }]}
          onPress={() => onColorChange(null)}
        >
          <Text style={styles.noneSwatchText}>✕</Text>
        </TouchableOpacity>
        {IDENTIFIER_COLORS.map((c) => (
          <TouchableOpacity
            key={c.value}
            style={[styles.swatch, { backgroundColor: c.hex }, color === c.value && [styles.swatchActive, { borderColor: accent }]]}
            onPress={() => onColorChange(c.value)}
          >
            {color === c.value && <Text style={styles.swatchCheck}>✓</Text>}
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        style={styles.input}
        placeholder="Número (opcional, 1-99)"
        placeholderTextColor={colors.hint}
        value={number}
        onChangeText={(v) => onNumberChange(v.replace(/[^0-9]/g, '').slice(0, 2))}
        keyboardType="number-pad"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: spacing.md },
  label: { fontSize: typography.label, fontWeight: '700', color: colors.text, marginBottom: 4 },
  hint: { fontSize: typography.label - 2, color: colors.muted, marginBottom: spacing.sm },
  swatchRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.sm },
  swatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swatchActive: { borderWidth: 3 },
  swatchCheck: { color: '#fff', fontWeight: '900', fontSize: 16 },
  noneSwatch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  noneSwatchText: { color: colors.muted, fontWeight: '700' },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    height: buttonHeight,
    fontSize: typography.body,
    color: colors.text,
  },
});
