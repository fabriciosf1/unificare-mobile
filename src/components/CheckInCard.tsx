import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { sendCheckIn } from '../services/patient.service';
import { colors, spacing, typography, buttonHeight } from '../theme';

const OPTIONS: { status: 'ok' | 'attention'; label: string; emoji: string }[] = [
  { status: 'ok', label: 'Estou bem', emoji: '🙂' },
  { status: 'attention', label: 'Não estou bem', emoji: '😟' },
];

export default function CheckInCard() {
  const [sentStatus, setSentStatus] = useState<string | null>(null);
  const [askingWhat, setAskingWhat] = useState(false);
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);

  async function handlePress(status: 'ok' | 'attention') {
    if (status === 'attention') {
      setAskingWhat(true);
      return;
    }
    try {
      await sendCheckIn(status);
      setSentStatus(status);
    } catch {
      Alert.alert('Não foi possível enviar o check-in agora.');
    }
  }

  async function handleSendAttention() {
    setSending(true);
    try {
      await sendCheckIn('attention', notes.trim() || undefined);
      setSentStatus('attention');
      setAskingWhat(false);
    } catch {
      Alert.alert('Não foi possível enviar o check-in agora.');
    } finally {
      setSending(false);
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

      <Modal visible={askingWhat} transparent animationType="fade" onRequestClose={() => setAskingWhat(false)}>
        <View style={styles.backdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalIcon}>😟</Text>
            <Text style={styles.modalTitle}>O que você está sentindo?</Text>
            <Text style={styles.modalSubtitle}>Conte com suas palavras — isso ajuda sua família e a equipe.</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: dor de cabeça, tontura, cansaço..."
              placeholderTextColor={colors.hint}
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              autoFocus
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendAttention}
              disabled={sending}
              activeOpacity={0.85}
            >
              {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendButtonText}>Enviar</Text>}
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setAskingWhat(false);
                setNotes('');
              }}
              disabled={sending}
            >
              <Text style={styles.cancelButtonText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: spacing.lg,
    width: '100%',
    alignItems: 'center',
  },
  modalIcon: { fontSize: 40, marginBottom: spacing.sm },
  modalTitle: {
    fontSize: typography.subtitle,
    fontWeight: '700',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  modalSubtitle: {
    fontSize: typography.label,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  input: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    fontSize: typography.label,
    color: colors.text,
    minHeight: 100,
    textAlignVertical: 'top',
    marginBottom: spacing.md,
  },
  sendButton: {
    width: '100%',
    height: buttonHeight,
    borderRadius: 12,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  sendButtonText: { color: '#fff', fontWeight: '700', fontSize: typography.label },
  cancelButton: { paddingVertical: spacing.sm },
  cancelButtonText: { color: colors.muted, fontWeight: '600', fontSize: typography.label },
});
