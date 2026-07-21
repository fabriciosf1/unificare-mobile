import { useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { triggerSos } from '../services/patient.service';
import { colors, spacing, typography, buttonHeight } from '../theme';

export default function SosButton() {
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleConfirm() {
    setSending(true);
    try {
      await triggerSos();
      setSent(true);
    } finally {
      setSending(false);
    }
  }

  function closeAll() {
    setConfirming(false);
    setSent(false);
  }

  return (
    <>
      <TouchableOpacity style={styles.sosButton} onPress={() => setConfirming(true)}>
        <Text style={styles.sosText}>SOS</Text>
      </TouchableOpacity>

      <Modal visible={confirming} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.card}>
            {sent ? (
              <>
                <Text style={styles.title}>SOS enviado</Text>
                <Text style={styles.message}>
                  Sua equipe de cuidado foi notificada e já está a caminho.
                </Text>
                <TouchableOpacity style={styles.confirmButton} onPress={closeAll}>
                  <Text style={styles.confirmText}>Fechar</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.title}>Confirmar emergência?</Text>
                <Text style={styles.message}>
                  Isso vai avisar imediatamente a equipe de cuidado. Toque em confirmar apenas se
                  precisar de ajuda agora.
                </Text>
                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={handleConfirm}
                  disabled={sending}
                >
                  {sending ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.confirmText}>Sim, preciso de ajuda</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity style={styles.cancelButton} onPress={closeAll} disabled={sending}>
                  <Text style={styles.cancelText}>Cancelar</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sosButton: {
    backgroundColor: colors.red,
    height: buttonHeight + 24,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.md,
  },
  sosText: {
    color: '#fff',
    fontSize: typography.title,
    fontWeight: '800',
    letterSpacing: 2,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.lg,
  },
  title: {
    fontSize: typography.subtitle,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  message: {
    fontSize: typography.label,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  confirmButton: {
    backgroundColor: colors.red,
    height: buttonHeight,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  confirmText: {
    color: '#fff',
    fontSize: typography.label,
    fontWeight: '700',
  },
  cancelButton: {
    height: buttonHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: colors.muted,
    fontSize: typography.label,
    fontWeight: '600',
  },
});
