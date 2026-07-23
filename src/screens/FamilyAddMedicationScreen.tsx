import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
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
import { getFamilyDrugCatalog, createFamilyMedication, updateFamilyMedication } from '../services/family.service';
import type { Drug } from '../services/patient.service';
import type { Medication } from '../types';
import { colors, spacing, typography, buttonHeight } from '../theme';
import { FREQUENCIES, computeScheduleTimes, isManualFrequency } from '../utils/medicationSchedule';

function formatTime(d: Date) {
  return d.toTimeString().slice(0, 5);
}

export default function FamilyAddMedicationScreen({
  onBack,
  onSaved,
  medication,
}: {
  onBack: () => void;
  onSaved: () => void;
  medication?: Medication;
}) {
  const isEdit = !!medication;
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [loadingDrugs, setLoadingDrugs] = useState(!isEdit);

  const [selectedDrug, setSelectedDrug] = useState<Drug | null>(null);
  const [dosage, setDosage] = useState(medication?.dosage ?? '');
  const [frequency, setFrequency] = useState(medication?.frequency ?? '');
  const [scheduleTimes, setScheduleTimes] = useState<string[]>(medication?.schedule_times ?? []);
  const [notes, setNotes] = useState(medication?.notes ?? '');
  const [saving, setSaving] = useState(false);

  const [showNamePicker, setShowNamePicker] = useState(false);
  const [nameFilter, setNameFilter] = useState('');
  const [showTimePicker, setShowTimePicker] = useState(false);

  useEffect(() => {
    if (isEdit) return;
    getFamilyDrugCatalog()
      .then(setDrugs)
      .catch(() => Alert.alert('Erro', 'Não foi possível carregar a lista de remédios.'))
      .finally(() => setLoadingDrugs(false));
  }, [isEdit]);

  function handleSelectDrug(drug: Drug) {
    setSelectedDrug(drug);
    setDosage('');
    setShowNamePicker(false);
    setNameFilter('');
  }

  function handleAddTime(selected: Date) {
    if (!frequency || isManualFrequency(frequency)) {
      const time = formatTime(selected);
      setScheduleTimes((prev) => (prev.includes(time) ? prev : [...prev, time].sort()));
      return;
    }
    setScheduleTimes(computeScheduleTimes(frequency, selected.getHours(), selected.getMinutes()));
  }

  function handleRemoveTime(time: string) {
    setScheduleTimes((prev) => prev.filter((t) => t !== time));
  }

  function handleSelectFrequency(f: string) {
    setFrequency(f);
    if (!isManualFrequency(f) && scheduleTimes.length > 0) {
      const [h, m] = scheduleTimes[0].split(':').map(Number);
      setScheduleTimes(computeScheduleTimes(f, h, m));
    }
  }

  async function handleSubmit() {
    if (!isEdit && !selectedDrug) {
      Alert.alert('Atenção', 'Selecione o remédio.');
      return;
    }
    if (!dosage || !frequency || scheduleTimes.length === 0) {
      Alert.alert('Atenção', 'Preencha a dosagem, a frequência e ao menos um horário.');
      return;
    }

    setSaving(true);
    try {
      if (isEdit && medication) {
        await updateFamilyMedication(medication.uuid, {
          dosage,
          frequency,
          schedule_times: scheduleTimes,
          notes: notes || undefined,
        });
        Alert.alert('Atualizado', 'O remédio foi atualizado.');
      } else if (selectedDrug) {
        await createFamilyMedication({
          name: selectedDrug.name,
          dosage,
          frequency,
          schedule_times: scheduleTimes,
          start_date: new Date().toISOString().slice(0, 10),
          notes: notes || undefined,
        });
        Alert.alert('Cadastrado', 'O remédio foi cadastrado para o paciente.');
      }
      onSaved();
    } catch {
      Alert.alert('Erro', isEdit ? 'Não foi possível atualizar o remédio. Tente novamente.' : 'Não foi possível cadastrar o remédio. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  const filteredDrugs = drugs.filter((d) => d.name.toLowerCase().includes(nameFilter.toLowerCase()));

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerLogoWrap}>
            <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
          </View>
          <Text style={styles.headerTitle}>{isEdit ? 'Editar remédio' : 'Adicionar remédio'}</Text>
        </View>
        <TouchableOpacity style={styles.back} onPress={onBack} activeOpacity={0.75} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.backText}>‹ Voltar</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.scroll} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.subtitle}>
        {isEdit ? 'Altera a dosagem, frequência, horários ou observações.' : 'Cadastra direto para o paciente, sem precisar de aprovação.'}
      </Text>

      {isEdit ? (
        <View style={styles.input}>
          <Text style={styles.pickerValue}>{medication?.name}</Text>
        </View>
      ) : (
        <TouchableOpacity style={styles.input} onPress={() => setShowNamePicker(true)} activeOpacity={0.75} disabled={loadingDrugs}>
          {loadingDrugs ? (
            <ActivityIndicator color={colors.blue} />
          ) : (
            <Text style={selectedDrug ? styles.pickerValue : styles.pickerPlaceholder}>
              {selectedDrug ? selectedDrug.name : '💊 Selecionar remédio'}
            </Text>
          )}
        </TouchableOpacity>
      )}

      {isEdit ? (
        <View style={styles.chipSection}>
          <Text style={styles.sectionLabel}>Dosagem</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: 500mg"
            placeholderTextColor={colors.hint}
            value={dosage}
            onChangeText={setDosage}
          />
        </View>
      ) : (
        selectedDrug && (
          <View style={styles.chipSection}>
            <Text style={styles.sectionLabel}>Dosagem</Text>
            <View style={styles.chipRow}>
              {selectedDrug.dosages.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[styles.chip, dosage === d && styles.chipActive]}
                  onPress={() => setDosage(d)}
                >
                  <Text style={[styles.chipText, dosage === d && styles.chipTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
              {selectedDrug.dosages.length === 0 && (
                <Text style={styles.muted}>Nenhuma dosagem cadastrada para esse remédio.</Text>
              )}
            </View>
          </View>
        )
      )}

      <View style={styles.chipSection}>
        <Text style={styles.sectionLabel}>Frequência</Text>
        <View style={styles.chipRow}>
          {FREQUENCIES.map((f) => (
            <TouchableOpacity
              key={f}
              style={[styles.chip, frequency === f && styles.chipActive]}
              onPress={() => handleSelectFrequency(f)}
            >
              <Text style={[styles.chipText, frequency === f && styles.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={styles.chipSection}>
        <Text style={styles.sectionLabel}>Horários</Text>
        {!!frequency && !isManualFrequency(frequency) && (
          <Text style={styles.muted}>
            Informe o 1º horário — os demais são calculados automaticamente pela frequência.
          </Text>
        )}
        <View style={styles.chipRow}>
          {scheduleTimes.map((t) => (
            <TouchableOpacity key={t} style={[styles.chip, styles.chipActive]} onPress={() => handleRemoveTime(t)}>
              <Text style={styles.chipTextActive}>{t} ✕</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity style={styles.addTimeChip} onPress={() => setShowTimePicker(true)}>
            <Text style={styles.addTimeChipText}>
              {frequency && !isManualFrequency(frequency) && scheduleTimes.length > 0 ? '+ Recalcular horário' : '+ Adicionar horário'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

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

      <TextInput
        style={[styles.input, styles.notesInput]}
        placeholder="Observações (opcional)"
        placeholderTextColor={colors.hint}
        value={notes}
        onChangeText={setNotes}
        multiline
      />

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={saving}>
        {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{isEdit ? 'Salvar' : 'Cadastrar'}</Text>}
      </TouchableOpacity>

      <Modal visible={!isEdit && showNamePicker} animationType="slide" onRequestClose={() => setShowNamePicker(false)}>
        <View style={styles.modalContainer}>
          <Text style={styles.title}>Selecionar remédio</Text>
          <TextInput
            style={styles.input}
            placeholder="Buscar remédio..."
            placeholderTextColor={colors.hint}
            value={nameFilter}
            onChangeText={setNameFilter}
          />
          <FlatList
            data={filteredDrugs}
            keyExtractor={(item) => item.uuid}
            renderItem={({ item }) => (
              <TouchableOpacity style={styles.drugRow} onPress={() => handleSelectDrug(item)}>
                <Text style={styles.drugRowText}>{item.name}</Text>
              </TouchableOpacity>
            )}
            ListEmptyComponent={<Text style={styles.muted}>Nenhum remédio encontrado.</Text>}
          />
          <TouchableOpacity style={styles.modalCancel} onPress={() => setShowNamePicker(false)} activeOpacity={0.75}>
            <Text style={styles.modalCancelText}>Cancelar</Text>
          </TouchableOpacity>
        </View>
      </Modal>
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
  muted: { fontSize: typography.label, color: colors.muted },
  button: {
    backgroundColor: colors.blue,
    height: buttonHeight,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  buttonText: { color: '#fff', fontSize: typography.subtitle, fontWeight: '700' },
  modalContainer: { flex: 1, backgroundColor: colors.blueSurface, padding: spacing.lg, paddingTop: spacing.xl },
  modalCancel: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    height: buttonHeight - 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.blue,
    backgroundColor: colors.blueDim,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  modalCancelText: { fontSize: typography.label, color: colors.blue, fontWeight: '700' },
  drugRow: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  drugRowText: { fontSize: typography.body, color: colors.text, fontWeight: '600' },
});
