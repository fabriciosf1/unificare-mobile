import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { getMyContacts } from '../services/patient.service';
import type { PatientContact } from '../types';
import { colors, spacing, typography, buttonHeight } from '../theme';

export default function FamiliaresScreen({ onBack }: { onBack: () => void }) {
  const [contacts, setContacts] = useState<PatientContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const loadData = useCallback(async () => {
    const data = await getMyContacts();
    setContacts(data);
  }, []);

  useEffect(() => {
    loadData()
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await loadData();
      setError(false);
    } catch {
      setError(true);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Familiares</Text>
        <TouchableOpacity style={styles.back} onPress={onBack} activeOpacity={0.75} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.backText}>‹ Voltar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.green} />
          </View>
        )}

        {!loading && error && (
          <View style={styles.card}>
            <Text style={styles.muted}>Não foi possível carregar seus familiares.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && contacts.length === 0 && (
          <View style={styles.card}>
            <Text style={styles.muted}>Nenhum familiar cadastrado ainda.</Text>
          </View>
        )}

        {!loading && !error && contacts.map((contact) => (
          <View key={contact.uuid} style={styles.card}>
            <View style={styles.titleRow}>
              <Text style={styles.name}>{contact.name}</Text>
              {contact.is_primary && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>Principal</Text>
                </View>
              )}
            </View>
            {!!contact.relationship && <Text style={styles.relationship}>{contact.relationship}</Text>}

            {!!contact.phone && (
              <TouchableOpacity
                style={styles.contactRow}
                onPress={() => Linking.openURL('tel:' + contact.phone!.replace(/\D/g, ''))}
                activeOpacity={0.7}
              >
                <Text style={styles.contactIcon}>📞</Text>
                <Text style={styles.contactText}>{contact.phone}</Text>
              </TouchableOpacity>
            )}

            {!!contact.email && (
              <TouchableOpacity
                style={styles.contactRow}
                onPress={() => Linking.openURL('mailto:' + contact.email)}
                activeOpacity={0.7}
              >
                <Text style={styles.contactIcon}>✉️</Text>
                <Text style={styles.contactText}>{contact.email}</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.greenSurface },
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl },
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
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  muted: { fontSize: typography.label, color: colors.muted },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  name: { fontSize: typography.subtitle, fontWeight: '700', color: colors.text, flexShrink: 1 },
  badge: { backgroundColor: colors.greenDim, borderRadius: 10, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  badgeText: { fontSize: 13, fontWeight: '700', color: colors.green },
  relationship: { fontSize: typography.label, color: colors.muted, marginTop: 2 },
  contactRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  contactIcon: { fontSize: 18, marginRight: spacing.sm },
  contactText: { fontSize: typography.label, color: colors.text },
  retryButton: {
    marginTop: spacing.md,
    backgroundColor: colors.green,
    height: buttonHeight - 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: { color: '#fff', fontWeight: '700', fontSize: typography.label },
});
