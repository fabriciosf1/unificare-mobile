import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { logout, me } from '../services/auth.service';
import { getLatestVital, getTodayMedications, logMedication } from '../services/patient.service';
import type { Medication, Patient, VitalSign } from '../types';
import { colors, spacing, typography, buttonHeight } from '../theme';
import SosButton from '../components/SosButton';
import CheckInCard from '../components/CheckInCard';

export default function HomeScreen({
  onLoggedOut,
  onOpenHistory,
}: {
  onLoggedOut: () => void;
  onOpenHistory: () => void;
}) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [vital, setVital] = useState<VitalSign | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    const [p, v, meds] = await Promise.all([me(), getLatestVital(), getTodayMedications()]);
    setPatient(p);
    setVital(v);
    setMedications(meds);
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleTaken(medication: Medication) {
    const scheduledAt = medication.schedule_times[0]
      ? new Date().toISOString().slice(0, 10) + 'T' + medication.schedule_times[0] + ':00'
      : new Date().toISOString();
    await logMedication(medication.id, scheduledAt);
    await loadData();
  }

  async function handleLogout() {
    await logout();
    onLoggedOut();
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Olá, {patient?.name?.split(' ')[0]}</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>Sair</Text>
        </TouchableOpacity>
      </View>

      <SosButton />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Seus últimos sinais</Text>
        {vital ? (
          <View style={styles.vitalsRow}>
            <VitalItem label="Freq. cardíaca" value={vital.heart_rate ? `${vital.heart_rate} bpm` : '—'} />
            <VitalItem label="Oxigenação" value={vital.spo2 ? `${vital.spo2}%` : '—'} />
            <VitalItem label="Temperatura" value={vital.temperature ? `${vital.temperature}°C` : '—'} />
          </View>
        ) : (
          <Text style={styles.muted}>Nenhuma leitura registrada ainda.</Text>
        )}
      </View>

      <CheckInCard />

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Remédios de hoje</Text>
        {medications.length === 0 && <Text style={styles.muted}>Nenhum remédio cadastrado.</Text>}
        {medications.map((med) => (
          <View key={med.uuid} style={styles.medRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.medName}>{med.name}</Text>
              <Text style={styles.medDosage}>
                {med.dosage} • {med.schedule_times.join(', ')}
              </Text>
            </View>
            {med.today_adherence === 'taken' ? (
              <Text style={styles.takenLabel}>Tomado ✓</Text>
            ) : (
              <TouchableOpacity style={styles.takeButton} onPress={() => handleTaken(med)}>
                <Text style={styles.takeButtonText}>Tomei</Text>
              </TouchableOpacity>
            )}
          </View>
        ))}
      </View>

      <TouchableOpacity style={styles.historyButton} onPress={onOpenHistory}>
        <Text style={styles.historyButtonText}>Ver histórico de alertas</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function VitalItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.vitalItem}>
      <Text style={styles.vitalValue}>{value}</Text>
      <Text style={styles.vitalLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  greeting: { fontSize: typography.title, fontWeight: '700', color: colors.text },
  logout: { fontSize: typography.label, color: colors.muted, fontWeight: '600' },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: { fontSize: typography.subtitle, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  muted: { fontSize: typography.label, color: colors.muted },
  vitalsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  vitalItem: { alignItems: 'center', flex: 1 },
  vitalValue: { fontSize: typography.subtitle, fontWeight: '700', color: colors.teal },
  vitalLabel: { fontSize: 14, color: colors.muted, marginTop: 4, textAlign: 'center' },
  medRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  medName: { fontSize: typography.label, fontWeight: '700', color: colors.text },
  medDosage: { fontSize: 14, color: colors.muted, marginTop: 2 },
  takeButton: {
    backgroundColor: colors.teal,
    height: buttonHeight - 12,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  takeButtonText: { color: '#fff', fontWeight: '700', fontSize: typography.label },
  takenLabel: { color: colors.green, fontWeight: '700', fontSize: typography.label },
  historyButton: { alignItems: 'center', paddingVertical: spacing.md },
  historyButtonText: { color: colors.teal, fontWeight: '700', fontSize: typography.label },
});
