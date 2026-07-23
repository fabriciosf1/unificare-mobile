import { useState } from 'react';
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
import { requestAppointment } from '../services/patient.service';
import { colors, spacing, typography, buttonHeight } from '../theme';

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

export default function AddAppointmentScreen({ onBack, onSaved }: { onBack: () => void; onSaved: () => void }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [type, setType] = useState<'consulta' | 'exame' | 'retorno' | 'outro'>('consulta');
  const [professional, setProfessional] = useState('');
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);

  async function handleSubmit() {
    if (!date || !time) {
      Alert.alert('Atenção', 'Selecione a data e o horário da consulta.');
      return;
    }

    setSaving(true);
    try {
      await requestAppointment({
        appointment_date: date,
        appointment_time: time,
        type,
        professional: professional || undefined,
        location: location || undefined,
        notes: notes || undefined,
      });
      Alert.alert('Enviado', 'Sua solicitação de consulta foi enviada e aguarda aprovação da sua família.');
      onSaved();
    } catch {
      Alert.alert('Erro', 'Não foi possível solicitar a consulta. Tente novamente.');
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
          <Text style={styles.headerTitle}>Solicitar consulta</Text>
        </View>
        <TouchableOpacity style={styles.back} onPress={onBack} activeOpacity={0.75} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.backText}>‹ Voltar</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.scroll} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.subtitle}>Fica pendente de aprovação da sua família antes de valer.</Text>

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

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Enviar para aprovação</Text>}
      </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.greenSurface },
  scroll: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
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
  typeChipActive: { backgroundColor: colors.green, borderColor: colors.green },
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
    backgroundColor: colors.green,
    height: buttonHeight,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  buttonText: { color: '#fff', fontSize: typography.subtitle, fontWeight: '700' },
});
