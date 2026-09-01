import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { COLOR_HEX } from '../utils/medicationIdentifiers';

export default function MedicationIdentifierBadge({
  color,
  number,
}: {
  color?: string | null;
  number?: number | null;
}) {
  if (!color && !number) return null;

  return (
    <View style={styles.row}>
      {color && <View style={[styles.dot, { backgroundColor: COLOR_HEX[color] ?? color }]} />}
      {number != null && (
        <View style={styles.numberBadge}>
          <Text style={styles.numberText}>#{number}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 1, borderColor: colors.border },
  numberBadge: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    borderRadius: 4,
    paddingHorizontal: 4,
  },
  numberText: { fontSize: 11, fontWeight: '700', color: colors.text },
});
