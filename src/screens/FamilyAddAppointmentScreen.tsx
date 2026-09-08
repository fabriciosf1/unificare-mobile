import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createFamilyAppointment, getFamilyContacts, getUpcomingAppointments, setAppointmentAttendance } from '../services/family.service';
import type { Appointment, PatientContact } from '../types';
import { colors, spacing, typography, buttonHeight } from '../theme';

const PREPARATION_MAX = 300;
const TYPE_LABEL: Record<string, string> = { consulta: 'Consulta', exame: 'Exame', retorno: 'Retorno', outro: 'Compromisso' };

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatTime(d: Date) {
  return d.toTimeString().slice(0, 5);
}

function formatDateLabel(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const TYPES: { value: 'consulta' | 'exame' | 'retorno' | 'outro'; label: string }[] = [
  { value: 'consulta', label: 'Consulta' },
  { value: 'exame', label: 'Exame' },
  { value: 'retorno', label: 'Retorno' },
  { value: 'outro', label: 'Outro' },
];

export default function FamilyAddAppointmentScreen({ onBack, onSaved }: { onBack: () => void; onSaved: () => void }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState<'consulta' | 'exame' | 'retorno' | 'outro'>('consulta');
  const [professional, setProfessional] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [preparation, setPreparation] = useState('');
  const [companionId, setCompanionId] = useState<number | null>(null);
  const [contacts, setContacts] = useState<PatientContact[]>([]);
  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [attendanceBusy, setAttendanceBusy] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const insets = useSafeAreaInsets();

  const loadUpcoming = useCallback(() => {
    getUpcomingAppointments().then(setUpcoming).catch(() => setUpcoming([]));
  }, []);

  useEffect(() => {
    getFamilyContacts().then(setContacts).catch(() => setContacts([]));
    loadUpcoming();
  }, [loadUpcoming]);

  function handleAttendance(appt: Appointment, status: 'confirmed' | 'not_going') {
    const run = async () => {
      setAttendanceBusy(appt.uuid);
      try {
        await setAppointmentAttendance(appt.uuid, status);
        loadUpcoming();
      } catch {
        Alert.alert('Erro', 'Não foi possível registrar a presença. Tente novamente.');
      } finally {
        setAttendanceBusy(null);
      }
    };
    if (status === 'not_going') {
      Alert.alert('Não vai à consulta', 'A equipe será avisada para remarcar. Confirmar?', [
        { text: 'Voltar', style: 'cancel' },
        { text: 'Não vai', style: 'destructive', onPress: run },
      ]);
    } else {
      run();
    }
  }

  async function handleSubmit() {
    if (!date || !time) {
      Alert.alert('Atenção', 'Selecione a data e o horário da consulta.');
      return;
    }

    setSaving(true);
    try {
      await createFamilyAppointment({
        appointment_date: date,
        appointment_time: time,
        type,
        professional: professional || undefined,
        location: location || undefined,
        notes: notes || undefined,
        preparation_instructions: preparation.trim() || undefined,
        companion_contact_id: companionId,
      });
      Alert.alert('Agendado', 'A consulta foi cadastrada para o paciente.');
      onSaved();
    } catch {
      Alert.alert('Erro', 'Não foi possível agendar a consulta. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerLogoWrap}>
            <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
          </View>
          <Text style={styles.headerTitle}>Agendar consulta</Text>
        </View>
        <TouchableOpacity style={styles.back} onPress={onBack} activeOpacity={0.75} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.backText}>‹ Voltar</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.scroll} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: spacing.xl + insets.bottom }]} keyboardShouldPersistTaps="handled">
      {upcoming.length > 0 && (
        <View style={styles.upcomingBlock}>
          <Text style={styles.sectionTitle}>Próximas consultas</Text>
          {upcoming.map((appt) => {
            const attendance = appt.attendance_status ?? 'pending';
            return (
              <View key={appt.uuid} style={styles.upcomingCard}>
                <Text style={styles.upcomingTitle}>
                  🗓️ {formatDateLabel(appt.appointment_date)} às {appt.appointment_time.slice(0, 5)} · {TYPE_LABEL[appt.type] ?? appt.type}
                </Text>
                {(appt.professional || appt.location) && (
                  <Text style={styles.upcomingDetail}>{[appt.professional, appt.location].filter(Boolean).join(' • ')}</Text>
                )}
                {appt.preparation_instructions ? <Text style={styles.upcomingDetail}>📋 {appt.preparation_instructions}</Text> : null}
                {appt.companion ? <Text style={styles.upcomingDetail}>👥 Acompanhante: {appt.companion.name}</Text> : null}
                {attendance === 'confirmed' ? (
                  <Text style={styles.attendanceOk}>✅ Presença confirmada</Text>
                ) : attendance === 'not_going' ? (
                  <Text style={styles.attendanceNo}>⚠️ Não vai — equipe avisada para remarcar</Text>
                ) : (
                  <View style={styles.attendanceRow}>
                    <TouchableOpacity style={styles.attendanceNoButton} disabled={attendanceBusy === appt.uuid} onPress={() => handleAttendance(appt, 'not_going')}>
                      <Text style={styles.attendanceNoButtonText}>Não vai</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.attendanceYesButton} disabled={attendanceBusy === appt.uuid} onPress={() => handleAttendance(appt, 'confirmed')}>
                      {attendanceBusy === appt.uuid ? <ActivityIndicator color="#fff" /> : <Text style={styles.attendanceYesButtonText}>Vai</Text>}
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}

      <Text style={styles.sectionTitle}>Agendar nova consulta</Text>
      <Text style={styles.subtitle}>Agendada direto para o paciente, sem precisar de aprovação.</Text>

      <View style={styles.typeRow}>
        {TYPES.map((t) => (
          <TouchableOpacity
            key={t.value}
            style={[styles.typeChip, type === t.value && styles.typeChipActive]}
            onPress={() => setType(t.value)}
          >
            <Text style={[styles.typeChipText, type === t.value && styles.typeChipTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)} activeOpacity={0.75}>
        <Text style={date ? styles.pickerValue : styles.pickerPlaceholder}>
          {date ? `📅 ${formatDateLabel(date)}` : '📅 Selecionar data'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.input} onPress={() => setShowTimePicker(true)} activeOpacity={0.75}>
        <Text style={time ? styles.pickerValue : styles.pickerPlaceholder}>
          {time ? `🕐 ${time}` : '🕐 Selecionar horário'}
        </Text>
      </TouchableOpacity>
      {showDatePicker && (
        <DateTimePicker
          value={date ? new Date(date + 'T00:00:00') : new Date()}
          mode="date"
          display="calendar"
          minimumDate={new Date()}
          onChange={(event, selected) => {
            setShowDatePicker(false);
            if (event.type === 'set' && selected) setDate(formatDate(selected));
          }}
        />
      )}
      {showTimePicker && (
        <DateTimePicker
          value={(() => {
            const d = new Date();
            if (time) {
              const [h, m] = time.split(':').map(Number);
              d.setHours(h, m, 0, 0);
            }
            return d;
          })()}
          mode="time"
          display="clock"
          is24Hour
          onChange={(event, selected) => {
            setShowTimePicker(false);
            if (event.type === 'set' && selected) setTime(formatTime(selected));
          }}
        />
      )}
      <TextInput style={styles.input} placeholder="Profissional (opcional)" placeholderTextColor={colors.hint} value={professional} onChangeText={setProfessional} />
      <TextInput style={styles.input} placeholder="Local (opcional)" placeholderTextColor={colors.hint} value={location} onChangeText={setLocation} />
      <TextInput
        style={[styles.input, styles.notesInput]}
        placeholder="Observações (opcional)"
        placeholderTextColor={colors.hint}
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      <Text style={styles.fieldLabel}>Preparo — a Alexa lê isso na véspera e no dia ({preparation.length}/{PREPARATION_MAX})</Text>
      <TextInput
        style={[styles.input, styles.notesInput]}
        placeholder="Ex.: ficar em jejum de 8 horas, levar os exames"
        placeholderTextColor={colors.hint}
        value={preparation}
        onChangeText={setPreparation}
        maxLength={PREPARATION_MAX}
        multiline
      />

      {contacts.length > 0 && (
        <>
          <Text style={styles.fieldLabel}>Quem vai junto? (a Alexa avisa o paciente)</Text>
          <View style={styles.typeRow}>
            <TouchableOpacity style={[styles.typeChip, companionId === null && styles.typeChipActive]} onPress={() => setCompanionId(null)}>
              <Text style={[styles.typeChipText, companionId === null && styles.typeChipTextActive]}>Ninguém</Text>
            </TouchableOpacity>
            {contacts.map((c) => (
              <TouchableOpacity key={c.id} style={[styles.typeChip, companionId === c.id && styles.typeChipActive]} onPress={() => setCompanionId(c.id)}>
                <Text style={[styles.typeChipText, companionId === c.id && styles.typeChipTextActive]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Agendar</Text>}
      </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.blueSurface },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
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
  title: { fontSize: typography.title, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  subtitle: { fontSize: typography.label, color: colors.muted, marginTop: spacing.md, marginBottom: spacing.lg },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
  typeChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
  },
  typeChipActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  typeChipText: { color: colors.text, fontWeight: '600' },
  typeChipTextActive: { color: '#fff' },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    height: buttonHeight,
    fontSize: typography.body,
    color: colors.text,
    marginBottom: spacing.md,
    justifyContent: 'center',
  },
  pickerValue: { fontSize: typography.body, color: colors.text, fontWeight: '600' },
  pickerPlaceholder: { fontSize: typography.body, color: colors.hint },
  notesInput: { height: buttonHeight * 1.5, paddingTop: spacing.md, textAlignVertical: 'top' },
  button: {
    backgroundColor: colors.blue,
    height: buttonHeight,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  buttonText: { color: '#fff', fontSize: typography.subtitle, fontWeight: '700' },
  // Iteração 4 F1
  sectionTitle: { fontSize: typography.subtitle, fontWeight: '700', color: colors.text, marginTop: spacing.md },
  fieldLabel: { fontSize: typography.label, color: colors.muted, marginBottom: 4 },
  upcomingBlock: { marginBottom: spacing.md },
  upcomingCard: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: spacing.md,
    marginTop: spacing.sm,
    gap: 4,
  },
  upcomingTitle: { fontSize: typography.label, fontWeight: '700', color: colors.text },
  upcomingDetail: { fontSize: 14, color: colors.muted },
  attendanceOk: { fontSize: 14, color: colors.green, fontWeight: '700', marginTop: 4 },
  attendanceNo: { fontSize: 14, color: colors.red, fontWeight: '700', marginTop: 4 },
  attendanceRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  attendanceYesButton: { flex: 1, backgroundColor: colors.blue, paddingVertical: spacing.sm, borderRadius: 10, alignItems: 'center' },
  attendanceYesButtonText: { color: '#fff', fontWeight: '700' },
  attendanceNoButton: { flex: 1, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.red, paddingVertical: spacing.sm, borderRadius: 10, alignItems: 'center' },
  attendanceNoButtonText: { color: colors.red, fontWeight: '700' },
});
