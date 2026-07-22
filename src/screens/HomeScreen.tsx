import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { logout, me } from '../services/auth.service';
import { getLatestVital, getTodayMedications, logMedication, setMyGeofence } from '../services/patient.service';
import { getCurrentPosition } from '../services/location.service';
import type { Medication, MedicationDose, Patient, VitalSign } from '../types';
import { colors, spacing, typography, buttonHeight } from '../theme';
import SosButton from '../components/SosButton';
import CheckInCard from '../components/CheckInCard';

export default function HomeScreen({
  onLoggedOut,
  onOpenHistory,
  onAddMedication,
  onAddAppointment,
  onOpenSosCamera,
}: {
  onLoggedOut: () => void;
  onOpenHistory: () => void;
  onAddMedication: () => void;
  onAddAppointment: () => void;
  onOpenSosCamera: (patientId: number) => void;
}) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [vital, setVital] = useState<VitalSign | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [settingHome, setSettingHome] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ title: string; message?: string } | null>(null);

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

  async function handleTaken(medication: Medication, dose: MedicationDose) {
    await logMedication(medication.id, dose.scheduled_at);
    await loadData();
  }

  async function handleLogout() {
    await logout();
    onLoggedOut();
  }

  async function handleSetHome() {
    setSettingHome(true);
    try {
      const coords = await getCurrentPosition();
      await setMyGeofence(coords.latitude, coords.longitude);
      setAlertInfo({ title: 'Enviado', message: 'Sua solicitação de nova localização para "minha casa" foi enviada e aguarda aprovação da sua família.' });
    } catch {
      setAlertInfo({ title: 'Erro', message: 'Não foi possível obter sua localização. Verifique a permissão de GPS.' });
    } finally {
      setSettingHome(false);
    }
  }

  const pendingMeds = medications.filter((m) => m.approval_status === 'pending');
  const doses = medications
    .filter((m) => m.approval_status !== 'pending')
    .flatMap((m) => m.today_doses.map((d) => ({ ...d, medication: m })))
    .sort((a, b) => a.time.localeCompare(b.time));
  const nextDose = doses.find((d) => d.status === 'pending');

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.green} />
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

      <SosButton onSosSuccess={() => patient && onOpenSosCamera(patient.id)} />

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

        {nextDose && (
          <View style={styles.nextDoseBox}>
            <Text style={styles.nextDoseAlarm}>
              {nextDose.is_late ? '⚠️ Atrasado — ' : '⏰ Agora — '}
              {nextDose.time}
            </Text>
            <Text style={styles.nextDoseName}>{nextDose.medication.name}</Text>
            <Text style={styles.medDosage}>{nextDose.medication.dosage}</Text>
            <TouchableOpacity
              style={styles.takeButton}
              onPress={() => handleTaken(nextDose.medication, nextDose)}
            >
              <Text style={styles.takeButtonText}>Tomei</Text>
            </TouchableOpacity>
          </View>
        )}

        {doses.length > 0 && !nextDose && (
          <Text style={styles.takenLabel}>Todos os horários de hoje já foram tomados ✓</Text>
        )}

        {doses.length > 0 && (
          <View style={styles.doseList}>
            {doses.map((d) => (
              <View
                key={`${d.medication.uuid}-${d.time}`}
                style={[styles.doseRow, d === nextDose && styles.doseRowActive]}
              >
                <Text style={styles.doseTime}>{d.time}</Text>
                <Text style={styles.doseMedName} numberOfLines={1}>{d.medication.name}</Text>
                <Text
                  style={[
                    styles.doseStatus,
                    d.status === 'taken' && styles.doseStatusTaken,
                    d.status === 'pending' && d.is_late && styles.doseStatusLate,
                  ]}
                >
                  {d.status === 'taken' ? '✓ Tomado' : d.is_late ? 'Atrasado' : d === nextDose ? 'Agora' : 'Aguardando'}
                </Text>
              </View>
            ))}
          </View>
        )}

        {pendingMeds.map((med) => (
          <View key={med.uuid} style={styles.medRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.medName}>{med.name}</Text>
              <Text style={styles.medDosage}>
                {med.dosage} • {med.schedule_times.join(', ')}
              </Text>
            </View>
            <Text style={styles.pendingLabel}>Aguardando aprovação</Text>
          </View>
        ))}

        <TouchableOpacity style={styles.actionButton} onPress={onAddMedication} activeOpacity={0.75}>
          <Text style={styles.actionButtonText}>+ Adicionar remédio</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Consultas</Text>
        <TouchableOpacity style={styles.actionButton} onPress={onAddAppointment} activeOpacity={0.75}>
          <Text style={styles.actionButtonText}>+ Solicitar consulta</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Localização</Text>
        <Text style={styles.muted}>Sua localização é compartilhada com sua família para sua segurança.</Text>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleSetHome}
          activeOpacity={0.75}
          disabled={settingHome}
        >
          {settingHome ? (
            <ActivityIndicator color={colors.green} />
          ) : (
            <Text style={styles.actionButtonText}>📍 Definir minha casa (aqui agora)</Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.historyButton} onPress={onOpenHistory}>
        <Text style={styles.historyButtonText}>Ver histórico de alertas</Text>
      </TouchableOpacity>

      <Modal visible={!!alertInfo} transparent animationType="fade" onRequestClose={() => setAlertInfo(null)}>
        <View style={styles.alertBackdrop}>
          <View style={styles.alertCard}>
            <View style={[styles.alertIconWrap, { backgroundColor: colors.green }]}>
              <Text style={styles.alertIcon}>{alertInfo?.title === 'Erro' ? '!' : '✓'}</Text>
            </View>
            <Text style={styles.alertTitle}>{alertInfo?.title}</Text>
            {!!alertInfo?.message && <Text style={styles.alertMessage}>{alertInfo.message}</Text>}
            <TouchableOpacity
              style={[styles.alertButton, { backgroundColor: colors.green }]}
              onPress={() => setAlertInfo(null)}
              activeOpacity={0.85}
            >
              <Text style={styles.alertButtonText}>Entendi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  container: { flex: 1, backgroundColor: colors.greenSurface },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.greenSurface },
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
  vitalValue: { fontSize: typography.subtitle, fontWeight: '700', color: colors.green },
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
    backgroundColor: colors.green,
    height: buttonHeight - 12,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  takeButtonText: { color: '#fff', fontWeight: '700', fontSize: typography.label },
  takenLabel: { color: colors.green, fontWeight: '700', fontSize: typography.label },
  pendingLabel: { color: colors.yellow, fontWeight: '700', fontSize: 14, textAlign: 'right', maxWidth: 120 },
  nextDoseBox: {
    backgroundColor: colors.greenDim,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: colors.green,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  nextDoseAlarm: { color: colors.green, fontWeight: '700', fontSize: typography.label, marginBottom: 4 },
  nextDoseName: { color: colors.text, fontWeight: '700', fontSize: typography.subtitle },
  doseList: { marginTop: spacing.sm },
  doseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  doseRowActive: { backgroundColor: colors.greenDim, borderRadius: 8, paddingHorizontal: spacing.sm },
  doseTime: { fontSize: typography.label, fontWeight: '700', color: colors.text, width: 56 },
  doseMedName: { flex: 1, fontSize: typography.label, color: colors.text },
  doseStatus: { fontSize: 14, color: colors.muted, fontWeight: '600' },
  doseStatusTaken: { color: colors.green },
  doseStatusLate: { color: colors.red },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: buttonHeight - 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.green,
    backgroundColor: colors.greenDim,
    marginTop: spacing.sm,
  },
  actionButtonText: { color: colors.green, fontWeight: '700', fontSize: typography.label },
  historyButton: { alignItems: 'center', paddingVertical: spacing.md },
  historyButtonText: { color: colors.green, fontWeight: '700', fontSize: typography.label },
  alertBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  alertCard: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: spacing.lg,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  alertIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  alertIcon: {
    color: '#fff',
    fontSize: typography.subtitle,
    fontWeight: '800',
  },
  alertTitle: {
    fontSize: typography.subtitle,
    fontWeight: '800',
    color: colors.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  alertMessage: {
    fontSize: typography.label,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  alertButton: {
    height: buttonHeight - 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  alertButtonText: {
    color: '#fff',
    fontSize: typography.label,
    fontWeight: '700',
  },
});
