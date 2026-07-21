import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getMyAlerts } from '../services/patient.service';
import type { AlertEvent } from '../types';
import { colors, spacing, typography } from '../theme';

export default function AlertsHistoryScreen({ onBack }: { onBack: () => void }) {
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMyAlerts()
      .then((res) => setAlerts(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack}>
          <Text style={styles.back}>‹ Voltar</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Meus alertas</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.teal} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={alerts}
          keyExtractor={(item) => item.uuid}
          contentContainerStyle={{ padding: spacing.lg }}
          ListEmptyComponent={<Text style={styles.muted}>Nenhum alerta registrado.</Text>}
          renderItem={({ item }) => (
            <View
              style={[
                styles.alertCard,
                { borderLeftColor: item.severity === 'critical' ? colors.red : colors.yellow },
              ]}
            >
              <Text style={styles.alertDescription}>{item.description ?? item.type}</Text>
              <Text style={styles.alertMeta}>
                {new Date(item.created_at).toLocaleString('pt-BR')} • {item.status}
              </Text>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingTop: spacing.xl,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  back: { fontSize: typography.label, color: colors.teal, fontWeight: '600', marginBottom: spacing.sm },
  title: { fontSize: typography.title, fontWeight: '700', color: colors.text },
  muted: { fontSize: typography.label, color: colors.muted, textAlign: 'center', marginTop: spacing.xl },
  alertCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderLeftWidth: 6,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  alertDescription: { fontSize: typography.label, fontWeight: '700', color: colors.text },
  alertMeta: { fontSize: 14, color: colors.muted, marginTop: 4 },
});
