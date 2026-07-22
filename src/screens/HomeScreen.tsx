import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  AppState,
  DeviceEventEmitter,
  Image,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { logout, me } from '../services/auth.service';
import { getLatestVital, getTodayMedications, logMedication } from '../services/patient.service';
import { MEDICATION_TAKEN_EVENT, snoozeMedicationAlarm, syncMedicationAlarms } from '../services/alarm.service';
import type { Medication, MedicationDose, Patient, VitalSign } from '../types';
import { colors, spacing, typography, buttonHeight } from '../theme';
import SosButton from '../components/SosButton';
import CheckInCard from '../components/CheckInCard';

export default function HomeScreen({
  onLoggedOut,
  onOpenHistory,
  onAddMedication,
  onAddAppointment,
  onAddExam,
  onOpenProfile,
  onOpenFamiliares,
  onOpenSosCamera,
}: {
  onLoggedOut: () => void;
  onOpenHistory: () => void;
  onAddMedication: () => void;
  onAddAppointment: () => void;
  onAddExam: () => void;
  onOpenProfile: () => void;
  onOpenFamiliares: () => void;
  onOpenSosCamera: (patientId: number) => void;
}) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [vital, setVital] = useState<VitalSign | null>(null);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ title: string; message?: string } | null>(null);

  const loadData = useCallback(async () => {
    const [p, v, meds] = await Promise.all([me(), getLatestVital(), getTodayMedications()]);
    setPatient(p);
    setVital(v);
    setMedications(meds);
    syncMedicationAlarms(meds).catch(() => {});
  }, []);

  useEffect(() => {
    loadData()
      .catch(() => setAlertInfo({ title: 'Erro', message: 'Não foi possível carregar seus dados.' }))
      .finally(() => setLoading(false));
  }, [loadData]);

  // Botão "Tomei"/"Adiar" da notificação roda fora do React (handleAlarmAction em
  // alarm.service.ts) e não tem como atualizar esta tela diretamente — recarrega ao
  // voltar do background para refletir ações tomadas pela notificação.
  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (appStateRef.current.match(/inactive|background/) && nextState === 'active') {
        loadData().catch(() => {});
      }
      appStateRef.current = nextState;
    });
    return () => subscription.remove();
  }, [loadData]);

  // Cobre o caso do app já estar aberto: onForegroundEvent chama handleAlarmAction direto,
  // sem passar pelo AppState (não há transição background→active).
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener(MEDICATION_TAKEN_EVENT, () => {
      loadData().catch(() => {});
    });
    return () => subscription.remove();
  }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    try {
      await loadData();
    } catch {
      setAlertInfo({ title: 'Erro', message: 'Não foi possível atualizar seus dados.' });
    } finally {
      setRefreshing(false);
    }
  }

  async function handleTaken(medication: Medication, dose: MedicationDose) {
    try {
      await logMedication(medication.id, dose.scheduled_at);
      await loadData();
    } catch {
      setAlertInfo({ title: 'Erro', message: 'Não foi possível registrar o medicamento como tomado.' });
    }
  }

  async function handleSnooze(medication: Medication, dose: MedicationDose) {
    await snoozeMedicationAlarm(medication, dose.time, dose.scheduled_at);
  }

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // token pode já estar inválido no servidor — segue o logout local mesmo assim
    }
    onLoggedOut();
  }

  const pendingMeds = medications.filter((m) => m.approval_status === 'pending');
  const doses = medications
    .filter((m) => m.approval_status !== 'pending')
    .flatMap((m) => m.today_doses.map((d) => ({ ...d, medication: m })))
    .sort((a, b) => a.time.localeCompare(b.time));
  const nextDose = doses.find((d) => d.status === 'pending');
  // Botões só liberam a partir de 10min antes do horário — antes disso, dose.is_late também é false
  const nextDoseActionable = !!nextDose && Date.now() >= new Date(nextDose.scheduled_at).getTime() - 10 * 60 * 1000;

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.green} />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.headerBar}>
        <TouchableOpacity style={styles.headerProfile} onPress={onOpenProfile} activeOpacity={0.8}>
          {patient?.photo_url ? (
            <Image source={{ uri: patient.photo_url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <Text style={styles.avatarPlaceholderText}>{patient?.name?.[0] ?? '?'}</Text>
            </View>
          )}
          <Text style={styles.greeting}>Olá, {patient?.name?.split(' ')[0]}</Text>
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <View style={styles.headerLogoWrap}>
            <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
          </View>
          <TouchableOpacity onPress={handleLogout} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.logout}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>

    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
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
              {nextDose.is_late ? '⚠️ Atrasado — ' : nextDoseActionable ? '⏰ Agora — ' : '🕐 Próximo — '}
              {nextDose.time}
            </Text>
            <Text style={styles.nextDoseName}>{nextDose.medication.name}</Text>
            <Text style={styles.medDosage}>{nextDose.medication.dosage}</Text>
            {nextDoseActionable ? (
              <View style={styles.nextDoseActions}>
                <TouchableOpacity
                  style={[styles.takeButton, styles.nextDoseActionButton]}
                  onPress={() => handleTaken(nextDose.medication, nextDose)}
                >
                  <Text style={styles.takeButtonText}>Tomei</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.snoozeButton, styles.nextDoseActionButton]}
                  onPress={() => handleSnooze(nextDose.medication, nextDose)}
                >
                  <Text style={styles.snoozeButtonText}>Adiar 10 min</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Text style={styles.muted}>Os botões de confirmação liberam 10 min antes do horário.</Text>
            )}
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
                  {d.status === 'taken' ? '✓ Tomado' : d.is_late ? 'Atrasado' : d === nextDose && nextDoseActionable ? 'Agora' : 'Aguardando'}
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
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Localização</Text>
        <Text style={styles.muted}>Sua localização é compartilhada com sua família para sua segurança.</Text>
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

      <View style={styles.footer}>
        <TouchableOpacity style={styles.footerItem} onPress={onAddMedication} activeOpacity={0.75}>
          <Text style={styles.footerIcon}>💊</Text>
          <Text style={styles.footerLabel}>Remédio</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerItem} onPress={onAddAppointment} activeOpacity={0.75}>
          <Text style={styles.footerIcon}>🗓️</Text>
          <Text style={styles.footerLabel}>Consulta</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerItem} onPress={onAddExam} activeOpacity={0.75}>
          <Text style={styles.footerIcon}>📄</Text>
          <Text style={styles.footerLabel}>Documento</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerItem} onPress={onOpenFamiliares} activeOpacity={0.75}>
          <Text style={styles.footerIcon}>👪</Text>
          <Text style={styles.footerLabel}>Familiares</Text>
        </TouchableOpacity>
      </View>
    </View>
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
  screen: { flex: 1, backgroundColor: colors.greenSurface },
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.greenSurface },
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
  headerProfile: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, marginRight: spacing.sm },
  avatarPlaceholder: { backgroundColor: colors.greenLight, alignItems: 'center', justifyContent: 'center' },
  avatarPlaceholderText: { color: '#fff', fontWeight: '700', fontSize: typography.subtitle },
  greeting: { fontSize: typography.subtitle, fontWeight: '700', color: '#fff', flexShrink: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerLogoWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: { width: 18, height: 18 },
  logout: { fontSize: typography.label, color: '#fff', fontWeight: '700', opacity: 0.9 },
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
  nextDoseActions: { flexDirection: 'row', gap: spacing.sm },
  nextDoseActionButton: { flex: 1 },
  snoozeButton: {
    backgroundColor: colors.surface,
    height: buttonHeight - 12,
    paddingHorizontal: spacing.md,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.green,
  },
  snoozeButtonText: { color: colors.green, fontWeight: '700', fontSize: typography.label },
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
  footer: {
    flexDirection: 'row',
    backgroundColor: colors.greenDark,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingBottom: (Platform.OS === 'ios' ? spacing.lg : spacing.sm),
    gap: spacing.sm,
  },
  footerItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  footerIcon: { fontSize: 22 },
  footerLabel: { fontSize: 13, fontWeight: '700', color: '#fff', marginTop: 2 },
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
