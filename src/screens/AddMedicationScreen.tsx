import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { requestMedication } from '../services/patient.service';
import { colors, spacing, typography, buttonHeight } from '../theme';

export default function AddMedicationScreen({ onBack, onSaved }: { onBack: () => void; onSaved: () => void }) {
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [frequency, setFrequency] = useState('');
  const [scheduleTimes, setScheduleTimes] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit() {
    const times = scheduleTimes
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (!name || !dosage || !frequency || times.length === 0) {
      Alert.alert('Preencha nome, dosagem, frequência e ao menos um horário (ex: 08:00, 20:00).');
      return;
    }

    setSaving(true);
    try {
      await requestMedication({
        name,
        dosage,
        frequency,
        schedule_times: times,
        start_date: new Date().toISOString().slice(0, 10),
        notes: notes || undefined,
      });
      Alert.alert('Enviado', 'Seu remédio foi cadastrado e aguarda aprovação da sua família.');
      onSaved();
    } catch {
      Alert.alert('Erro', 'Não foi possível cadastrar o remédio. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.back} onPress={onBack} activeOpacity={0.75} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Text style={styles.backText}>‹ Voltar</Text>
      </TouchableOpacity>
      <Text style={styles.title}>Adicionar remédio</Text>
      <Text style={styles.subtitle}>Fica pendente de aprovação da sua família antes de valer.</Text>

      <TextInput style={styles.input} placeholder="Nome do remédio" placeholderTextColor={colors.hint} value={name} onChangeText={setName} />
      <TextInput style={styles.input} placeholder="Dosagem (ex: 500mg)" placeholderTextColor={colors.hint} value={dosage} onChangeText={setDosage} />
      <TextInput style={styles.input} placeholder="Frequência (ex: a cada 8h)" placeholderTextColor={colors.hint} value={frequency} onChangeText={setFrequency} />
      <TextInput
        style={styles.input}
        placeholder="Horários, separados por vírgula (ex: 08:00, 20:00)"
        placeholderTextColor={colors.hint}
        value={scheduleTimes}
        onChangeText={setScheduleTimes}
      />
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.greenSurface },
  content: { padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xl },
  back: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    height: buttonHeight - 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.green,
    backgroundColor: colors.greenDim,
    marginBottom: spacing.md,
  },
  backText: { fontSize: typography.label, color: colors.green, fontWeight: '700' },
  title: { fontSize: typography.title, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  subtitle: { fontSize: typography.label, color: colors.muted, marginBottom: spacing.lg },
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
  },
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
