import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getMyAlerts } from '../services/patient.service';
import type { AlertEvent } from '../types';
import { colors, spacing, typography, buttonHeight } from '../theme';

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
      <View style={styles.headerBar}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerLogoWrap}>
            <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
          </View>
          <Text style={styles.headerTitle}>Meus alertas</Text>
        </View>
        <TouchableOpacity style={styles.back} onPress={onBack} activeOpacity={0.75} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.backText}>‹ Voltar</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.green} style={{ marginTop: spacing.xl }} />
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
  container: { flex: 1, backgroundColor: colors.greenSurface },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.greenDark,
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 54) + spacing.md,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerLogoWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: { width: 22, height: 22 },
  headerTitle: { fontSize: typography.subtitle, fontWeight: '700', color: '#fff' },
  back: {
    paddingHorizontal: spacing.md,
    height: buttonHeight - 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#fff',
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { fontSize: typography.label, color: '#fff', fontWeight: '700' },
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
