import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { deleteFamilyGuidance, getFamilyGuidances, updateFamilyGuidance } from '../services/family.service';
import type { MedicalGuidance } from '../types';
import { colors, spacing, typography, buttonHeight } from '../theme';

const WEEKDAY_ABBR: Record<number, string> = { 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb', 7: 'Dom' };

function describeSchedule(g: MedicalGuidance): string {
  if (g.interval_minutes) {
    const label = g.interval_minutes % 60 === 0 ? `${g.interval_minutes / 60}h` : `${g.interval_minutes}min`;
    return `A cada ${label} · ${g.window_start}–${g.window_end}`;
  }
  return (g.schedule_times ?? []).join(' · ');
}

export default function FamilyGuidancesScreen({
  onBack,
  onAddGuidance,
  onEditGuidance,
}: {
  onBack: () => void;
  onAddGuidance: () => void;
  onEditGuidance: (guidance: MedicalGuidance) => void;
}) {
  const [guidances, setGuidances] = useState<MedicalGuidance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [toggling, setToggling] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const loadData = useCallback(async () => {
    const data = await getFamilyGuidances();
    setGuidances(data);
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

  async function handleToggle(g: MedicalGuidance) {
    setToggling(g.uuid);
    try {
      await updateFamilyGuidance(g.uuid, { active: !g.active });
      await loadData();
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar a orientação. Tente novamente.');
    } finally {
      setToggling(null);
    }
  }

  function handleDelete(g: MedicalGuidance) {
    Alert.alert('Excluir orientação', `Remover a orientação "${g.content}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          setDeleting(g.uuid);
          try {
            await deleteFamilyGuidance(g.uuid);
            await loadData();
          } catch {
            Alert.alert('Erro', 'Não foi possível excluir a orientação. Tente novamente.');
          } finally {
            setDeleting(null);
          }
        },
      },
    ]);
  }

  const active = guidances.filter((g) => g.active);
  const inactive = guidances.filter((g) => !g.active);

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerLogoWrap}>
            <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
          </View>
          <Text style={styles.headerTitle}>Orientações médicas</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.addButton} onPress={onAddGuidance} activeOpacity={0.75} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.back} onPress={onBack} activeOpacity={0.75} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.backText}>‹ Voltar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xl + insets.bottom }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.blue} />
          </View>
        )}

        {!loading && error && (
          <View style={styles.card}>
            <Text style={styles.muted}>Não foi possível carregar as orientações.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && guidances.length === 0 && (
          <View style={styles.card}>
            <Text style={styles.muted}>Nenhuma orientação cadastrada.</Text>
          </View>
        )}

        {!loading && !error && active.map((g) => (
          <GuidanceCard
            key={g.uuid}
            guidance={g}
            toggling={toggling === g.uuid}
            deleting={deleting === g.uuid}
            onEdit={() => onEditGuidance(g)}
            onToggle={() => handleToggle(g)}
            onDelete={() => handleDelete(g)}
          />
        ))}

        {!loading && !error && inactive.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Inativas</Text>
            {inactive.map((g) => (
              <GuidanceCard
                key={g.uuid}
                guidance={g}
                toggling={toggling === g.uuid}
                deleting={deleting === g.uuid}
                onEdit={() => onEditGuidance(g)}
                onToggle={() => handleToggle(g)}
                onDelete={() => handleDelete(g)}
              />
            ))}
          </>
        )}
      </ScrollView>
    </View>
  );
}

function GuidanceCard({
  guidance,
  toggling,
  deleting,
  onEdit,
  onToggle,
  onDelete,
}: {
  guidance: MedicalGuidance;
  toggling: boolean;
  deleting: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const weekdaysLabel = guidance.weekdays?.length ? guidance.weekdays.map((d) => WEEKDAY_ABBR[d]).join(', ') : null;

  return (
    <View style={[styles.card, !guidance.active && styles.cardInactive]}>
      <View style={styles.cardHeader}>
        <Text style={styles.guidanceContent}>{guidance.content}</Text>
        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.cardActionButton} onPress={onEdit} activeOpacity={0.75} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.cardActionText}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cardActionButton} onPress={onToggle} disabled={toggling} activeOpacity={0.75} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            {toggling ? <ActivityIndicator size="small" color={colors.blue} /> : <Text style={styles.cardActionText}>{guidance.active ? '⊘' : '✓'}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.cardActionButton} onPress={onDelete} disabled={deleting} activeOpacity={0.75} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            {deleting ? <ActivityIndicator size="small" color={colors.red} /> : <Text style={styles.cardActionText}>🗑️</Text>}
          </TouchableOpacity>
        </View>
      </View>
      <Text style={styles.guidanceTimes}>{describeSchedule(guidance)}{weekdaysLabel ? ` · ${weekdaysLabel}` : ''}</Text>
      <Text style={styles.guidanceMeta}>
        {guidance.end_date
          ? `Vigência até ${new Date(guidance.end_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}`
          : 'Vigência contínua'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.blueSurface },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.blueDark,
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 54) + spacing.md,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  addButton: {
    width: buttonHeight - 16,
    height: buttonHeight - 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#fff',
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { fontSize: typography.subtitle, color: '#fff', fontWeight: '700', lineHeight: typography.subtitle },
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
  sectionTitle: { fontSize: typography.label, fontWeight: '700', color: colors.text, marginTop: spacing.sm, marginBottom: spacing.sm },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardInactive: { opacity: 0.6 },
  muted: { fontSize: typography.label, color: colors.muted },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardActions: { flexDirection: 'row', gap: 6 },
  cardActionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardActionText: { fontSize: 15 },
  guidanceContent: { flex: 1, marginRight: spacing.sm, fontSize: typography.body, fontWeight: '700', color: colors.text },
  guidanceTimes: { fontSize: 14, color: colors.muted, marginTop: spacing.sm },
  guidanceMeta: { fontSize: 12, color: colors.hint, marginTop: 2 },
  retryButton: {
    marginTop: spacing.md,
    backgroundColor: colors.blue,
    height: buttonHeight - 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryButtonText: { color: '#fff', fontWeight: '700', fontSize: typography.label },
});
