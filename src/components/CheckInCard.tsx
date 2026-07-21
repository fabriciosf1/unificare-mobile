import { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { sendCheckIn } from '../services/patient.service';
import { colors, spacing, typography, buttonHeight } from '../theme';

const OPTIONS: { status: 'ok' | 'attention'; label: string; emoji: string }[] = [
  { status: 'ok', label: 'Estou bem', emoji: '🙂' },
  { status: 'attention', label: 'Não estou bem', emoji: '😟' },
];

export default function CheckInCard() {
  const [sentStatus, setSentStatus] = useState<string | null>(null);

  async function handlePress(status: 'ok' | 'attention') {
    try {
      await sendCheckIn(status);
      setSentStatus(status);
    } catch {
      Alert.alert('Não foi possível enviar o check-in agora.');
    }
  }

  return (
    <View style={styles.card}>
      <Text style={styles.title}>Como você está hoje?</Text>
      {sentStatus ? (
        <Text style={styles.done}>Obrigado! Registramos sua resposta.</Text>
      ) : (
        <View style={styles.row}>
          {OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.status}
              style={styles.optionButton}
              onPress={() => handlePress(opt.status)}
            >
              <Text style={styles.emoji}>{opt.emoji}</Text>
              <Text style={styles.optionLabel}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  title: {
    fontSize: typography.subtitle,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  optionButton: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 12,
    height: buttonHeight + 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 28,
    marginBottom: 4,
  },
  optionLabel: {
    fontSize: typography.label,
    color: colors.text,
    fontWeight: '600',
  },
  done: {
    fontSize: typography.label,
    color: colors.green,
    fontWeight: '600',
  },
});
