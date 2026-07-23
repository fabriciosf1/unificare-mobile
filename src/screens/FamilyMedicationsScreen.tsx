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
import { deleteFamilyMedication, getFamilyMedicationsToday, logFamilyMedication } from '../services/family.service';
import type { Medication } from '../types';
import { colors, spacing, typography, buttonHeight } from '../theme';

export default function FamilyMedicationsScreen({
  onBack,
  onAddMedication,
  onEditMedication,
}: {
  onBack: () => void;
  onAddMedication: () => void;
  onEditMedication: (medication: Medication) => void;
}) {
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const data = await getFamilyMedicationsToday();
    setMedications(data);
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

  async function handleConfirmDose(med: Medication, dose: Medication['today_doses'][number]) {
    const key = `${med.uuid}-${dose.time}`;
    setConfirming(key);
    try {
      await logFamilyMedication(med.uuid, dose.scheduled_at);
      await loadData();
    } catch {
      Alert.alert('Erro', 'Não foi possível confirmar a dose. Tente novamente.');
    } finally {
      setConfirming(null);
    }
  }

  function handleDelete(med: Medication) {
    Alert.alert('Excluir remédio', `Deseja excluir "${med.name}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: async () => {
          setDeleting(med.uuid);
          try {
            await deleteFamilyMedication(med.uuid);
            await loadData();
          } catch {
            Alert.alert('Erro', 'Não foi possível excluir o remédio. Tente novamente.');
          } finally {
            setDeleting(null);
          }
        },
      },
    ]);
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerLogoWrap}>
            <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
          </View>
          <Text style={styles.headerTitle}>Remédios de hoje</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.addButton} onPress={onAddMedication} activeOpacity={0.75} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.back} onPress={onBack} activeOpacity={0.75} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.backText}>‹ Voltar</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
      >
        {loading && (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={colors.blue} />
          </View>
        )}

        {!loading && error && (
          <View style={styles.card}>
            <Text style={styles.muted}>Não foi possível carregar os remédios.</Text>
            <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
              <Text style={styles.retryButtonText}>Tentar novamente</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && medications.length === 0 && (
          <View style={styles.card}>
            <Text style={styles.muted}>Nenhum remédio cadastrado.</Text>
          </View>
        )}

        {!loading && !error && medications.map((med) => (
          <View key={med.uuid} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.cardHeaderText}>
                <Text style={styles.medName}>{med.name}</Text>
                <Text style={styles.medDosage}>{med.dosage} • {med.frequency}</Text>
              </View>
              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={styles.cardActionButton}
                  onPress={() => onEditMedication(med)}
                  activeOpacity={0.75}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.cardActionText}>✏️</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.cardActionButton}
                  onPress={() => handleDelete(med)}
                  disabled={deleting === med.uuid}
                  activeOpacity={0.75}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  {deleting === med.uuid ? (
                    <ActivityIndicator size="small" color={colors.red} />
                  ) : (
                    <Text style={styles.cardActionText}>🗑️</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {med.approval_status === 'pending' && (
              <Text style={styles.pendingLabel}>Aguardando aprovação</Text>
            )}

            {med.approval_status === 'approved' && med.today_doses.length === 0 && (
              <Text style={styles.muted}>Nenhum horário para hoje.</Text>
            )}

            {med.today_doses.map((dose) => {
              const key = `${med.uuid}-${dose.time}`;
              const isConfirming = confirming === key;
              return (
                <View key={dose.time} style={styles.doseRow}>
                  <Text style={styles.doseTime}>{dose.time}</Text>
                  {dose.status !== 'taken' ? (
                    <View style={styles.doseActions}>
                      <Text style={[styles.doseStatus, dose.is_late && styles.doseStatusLate]}>
                        {dose.is_late ? 'Atrasado' : 'Aguardando'}
                      </Text>
                      <TouchableOpacity
                        style={styles.confirmButton}
                        onPress={() => handleConfirmDose(med, dose)}
                        disabled={isConfirming}
                        activeOpacity={0.75}
                      >
                        {isConfirming ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Text style={styles.confirmButtonText}>Tomei</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={[styles.doseStatus, styles.doseStatusTaken]}>✓ Tomado</Text>
                  )}
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
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
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  muted: { fontSize: typography.label, color: colors.muted },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardHeaderText: { flex: 1, marginRight: spacing.sm },
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
  medName: { fontSize: typography.subtitle, fontWeight: '700', color: colors.text },
  medDosage: { fontSize: 14, color: colors.muted, marginTop: 2, marginBottom: spacing.sm },
  pendingLabel: { color: colors.yellow, fontWeight: '700', fontSize: 14 },
  doseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  doseTime: { fontSize: typography.label, fontWeight: '700', color: colors.text },
  doseActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  doseStatus: { fontSize: 14, color: colors.muted, fontWeight: '600' },
  doseStatusTaken: { color: colors.green },
  doseStatusLate: { color: colors.red },
  confirmButton: {
    backgroundColor: colors.blue,
    paddingHorizontal: spacing.md,
    height: 32,
    minWidth: 64,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButtonText: { color: '#fff', fontWeight: '700', fontSize: 13 },
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
