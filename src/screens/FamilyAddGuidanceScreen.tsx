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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createFamilyGuidance, updateFamilyGuidance } from '../services/family.service';
import type { MedicalGuidance } from '../types';
import { colors, spacing, typography, buttonHeight } from '../theme';
import WeekdaysPicker from '../components/WeekdaysPicker';

function formatTime(d: Date) {
  return d.toTimeString().slice(0, 5);
}

export default function FamilyAddGuidanceScreen({
  onBack,
  onSaved,
  guidance,
}: {
  onBack: () => void;
  onSaved: () => void;
  guidance?: MedicalGuidance;
}) {
  const isEdit = !!guidance;
  const [content, setContent] = useState(guidance?.content ?? '');
  const [mode, setMode] = useState<'times' | 'interval'>(guidance?.interval_minutes ? 'interval' : 'times');
  const [scheduleTimes, setScheduleTimes] = useState<string[]>(guidance?.schedule_times?.length ? guidance.schedule_times : ['08:00']);
  const [intervalAmount, setIntervalAmount] = useState(
    guidance?.interval_minutes ? String(guidance.interval_minutes % 60 === 0 ? guidance.interval_minutes / 60 : guidance.interval_minutes) : '2'
  );
  const [intervalUnit, setIntervalUnit] = useState<'minutes' | 'hours'>(
    guidance?.interval_minutes && guidance.interval_minutes % 60 === 0 ? 'hours' : 'minutes'
  );
  const [windowStart, setWindowStart] = useState(guidance?.window_start ?? '07:00');
  const [windowEnd, setWindowEnd] = useState(guidance?.window_end ?? '19:00');
  const [weekdays, setWeekdays] = useState<number[]>(guidance?.weekdays ?? []);
  const [endDate, setEndDate] = useState<Date | null>(guidance?.end_date ? new Date(guidance.end_date) : null);
  const [saving, setSaving] = useState(false);

  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showWindowStartPicker, setShowWindowStartPicker] = useState(false);
  const [showWindowEndPicker, setShowWindowEndPicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const insets = useSafeAreaInsets();

  function handleAddTime(selected: Date) {
    const time = formatTime(selected);
    setScheduleTimes((prev) => (prev.includes(time) ? prev : [...prev, time].sort()));
  }

  function handleRemoveTime(time: string) {
    setScheduleTimes((prev) => prev.filter((t) => t !== time));
  }

  async function handleSubmit() {
    if (!content.trim()) {
      Alert.alert('Atenção', 'Descreva a orientação.');
      return;
    }
    if (mode === 'times' && scheduleTimes.length === 0) {
      Alert.alert('Atenção', 'Informe ao menos um horário.');
      return;
    }
    if (mode === 'interval' && (!windowStart || !windowEnd || !intervalAmount)) {
      Alert.alert('Atenção', 'Informe o intervalo e a janela de horário.');
      return;
    }

    const intervalMinutes = mode === 'interval' ? Number(intervalAmount) * (intervalUnit === 'hours' ? 60 : 1) : null;

    const payload = mode === 'interval'
      ? {
          content,
          schedule_times: null,
          interval_minutes: intervalMinutes,
          window_start: windowStart,
          window_end: windowEnd,
          weekdays: weekdays.length ? weekdays : null,
          end_date: endDate ? endDate.toISOString().slice(0, 10) : null,
        }
      : {
          content,
          schedule_times: scheduleTimes,
          interval_minutes: null,
          window_start: null,
          window_end: null,
          weekdays: weekdays.length ? weekdays : null,
          end_date: endDate ? endDate.toISOString().slice(0, 10) : null,
        };

    setSaving(true);
    try {
      if (isEdit && guidance) {
        await updateFamilyGuidance(guidance.uuid, payload);
        Alert.alert('Atualizada', 'A orientação foi atualizada.');
      } else {
        await createFamilyGuidance({ ...payload, start_date: new Date().toISOString().slice(0, 10) });
        Alert.alert('Cadastrada', 'A orientação foi cadastrada para o paciente.');
      }
      onSaved();
    } catch (err) {
      const fallback = isEdit ? 'Não foi possível atualizar a orientação. Tente novamente.' : 'Não foi possível cadastrar a orientação. Tente novamente.';
      Alert.alert('Erro', err instanceof Error ? err.message : fallback);
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
          <Text style={styles.headerTitle}>{isEdit ? 'Editar orientação' : 'Nova orientação'}</Text>
        </View>
        <TouchableOpacity style={styles.back} onPress={onBack} activeOpacity={0.75} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.backText}>‹ Voltar</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.scroll} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: spacing.xl + insets.bottom }]} keyboardShouldPersistTaps="handled">
      <Text style={styles.subtitle}>
        {isEdit ? 'Altera o texto, a frequência ou a vigência.' : 'Cadastra direto para o paciente, sem precisar de aprovação.'}
      </Text>

      <TextInput
        style={[styles.input, styles.contentInput]}
        placeholder="Ex: Elevar as pernas por 15 minutos após o almoço"
        placeholderTextColor={colors.hint}
        value={content}
        onChangeText={setContent}
        multiline
        maxLength={1000}
      />

      <View style={styles.chipSection}>
        <Text style={styles.sectionLabel}>Frequência</Text>
        <View style={styles.chipRow}>
          <TouchableOpacity style={[styles.chip, mode === 'times' && styles.chipActive]} onPress={() => setMode('times')}>
            <Text style={[styles.chipText, mode === 'times' && styles.chipTextActive]}>Horários específicos</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.chip, mode === 'interval' && styles.chipActive]} onPress={() => setMode('interval')}>
            <Text style={[styles.chipText, mode === 'interval' && styles.chipTextActive]}>Intervalo recorrente</Text>
          </TouchableOpacity>
        </View>
      </View>

      {mode === 'times' ? (
        <View style={styles.chipSection}>
          <Text style={styles.sectionLabel}>Horários</Text>
          <View style={styles.chipRow}>
            {scheduleTimes.map((t) => (
              <TouchableOpacity key={t} style={[styles.chip, styles.chipActive]} onPress={() => handleRemoveTime(t)}>
                <Text style={styles.chipTextActive}>{t} ✕</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={styles.addTimeChip} onPress={() => setShowTimePicker(true)}>
              <Text style={styles.addTimeChipText}>+ Adicionar horário</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.chipSection}>
          <Text style={styles.sectionLabel}>Repetir a cada</Text>
          <View style={styles.intervalRow}>
            <TextInput
              style={[styles.input, styles.intervalInput]}
              keyboardType="numeric"
              value={intervalAmount}
              onChangeText={setIntervalAmount}
            />
            <View style={styles.chipRow}>
              <TouchableOpacity style={[styles.chip, intervalUnit === 'minutes' && styles.chipActive]} onPress={() => setIntervalUnit('minutes')}>
                <Text style={[styles.chipText, intervalUnit === 'minutes' && styles.chipTextActive]}>Minutos</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.chip, intervalUnit === 'hours' && styles.chipActive]} onPress={() => setIntervalUnit('hours')}>
                <Text style={[styles.chipText, intervalUnit === 'hours' && styles.chipTextActive]}>Horas</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.muted}>Ex: 2 em 2 horas, ou quantas vezes forem necessárias.</Text>

          <View style={styles.windowRow}>
            <TouchableOpacity style={[styles.input, styles.windowInput]} onPress={() => setShowWindowStartPicker(true)}>
              <Text style={styles.pickerValue}>Início: {windowStart}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.input, styles.windowInput]} onPress={() => setShowWindowEndPicker(true)}>
              <Text style={styles.pickerValue}>Fim: {windowEnd}</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.muted}>Ex: 07:00–19:00 durante o dia, 22:00–06:00 durante a noite (cruza a meia-noite).</Text>
        </View>
      )}

      {showTimePicker && (
        <DateTimePicker
          value={new Date()}
          mode="time"
          display="clock"
          is24Hour
          onChange={(event, selected) => {
            setShowTimePicker(false);
            if (event.type === 'set' && selected) handleAddTime(selected);
          }}
        />
      )}
      {showWindowStartPicker && (
        <DateTimePicker
          value={new Date()}
          mode="time"
          display="clock"
          is24Hour
          onChange={(event, selected) => {
            setShowWindowStartPicker(false);
            if (event.type === 'set' && selected) setWindowStart(formatTime(selected));
          }}
        />
      )}
      {showWindowEndPicker && (
        <DateTimePicker
          value={new Date()}
          mode="time"
          display="clock"
          is24Hour
          onChange={(event, selected) => {
            setShowWindowEndPicker(false);
            if (event.type === 'set' && selected) setWindowEnd(formatTime(selected));
          }}
        />
      )}

      <WeekdaysPicker accent={colors.blue} value={weekdays} onChange={setWeekdays} />

      <View style={styles.chipSection}>
        <Text style={styles.sectionLabel}>Vigência</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowEndDatePicker(true)}>
          <Text style={endDate ? styles.pickerValue : styles.pickerPlaceholder}>
            {endDate ? `Até ${endDate.toLocaleDateString('pt-BR')}` : '📅 Sem data final (contínua)'}
          </Text>
        </TouchableOpacity>
        {endDate && (
          <TouchableOpacity onPress={() => setEndDate(null)}>
            <Text style={styles.clearDate}>Remover data final</Text>
          </TouchableOpacity>
        )}
      </View>

      {showEndDatePicker && (
        <DateTimePicker
          value={endDate ?? new Date()}
          mode="date"
          display="calendar"
          minimumDate={new Date()}
          onChange={(event, selected) => {
            setShowEndDatePicker(false);
            if (event.type === 'set' && selected) setEndDate(selected);
          }}
        />
      )}

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{isEdit ? 'Salvar' : 'Cadastrar'}</Text>}
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
  subtitle: { fontSize: typography.label, color: colors.muted, marginTop: spacing.md, marginBottom: spacing.lg },
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
  contentInput: { height: buttonHeight * 1.6, paddingTop: spacing.md, textAlignVertical: 'top' },
  pickerValue: { fontSize: typography.body, color: colors.text, fontWeight: '600' },
  pickerPlaceholder: { fontSize: typography.body, color: colors.hint },
  sectionLabel: { fontSize: typography.label, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  chipSection: { marginBottom: spacing.md },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
  },
  chipActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  chipText: { color: colors.text, fontWeight: '600' },
  chipTextActive: { color: '#fff', fontWeight: '600' },
  addTimeChip: {
    borderWidth: 1.5,
    borderColor: colors.blue,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.blueDim,
  },
  addTimeChipText: { color: colors.blue, fontWeight: '700' },
  muted: { fontSize: typography.label, color: colors.muted, marginBottom: spacing.sm },
  intervalRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  intervalInput: { width: 80, marginBottom: 0, textAlign: 'center' },
  windowRow: { flexDirection: 'row', gap: spacing.sm },
  windowInput: { flex: 1 },
  clearDate: { color: colors.blue, fontWeight: '600', fontSize: typography.label, marginTop: -spacing.sm, marginBottom: spacing.md },
  button: {
    backgroundColor: colors.blue,
    height: buttonHeight,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  buttonText: { color: '#fff', fontSize: typography.subtitle, fontWeight: '700' },
});
