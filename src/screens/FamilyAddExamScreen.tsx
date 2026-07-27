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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { analyzeFamilyExam, uploadFamilyExam } from '../services/family.service';
import { colors, spacing, typography, buttonHeight } from '../theme';

interface PickedFile {
  uri: string;
  name: string;
  mimeType: string;
}

function formatDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

const TYPES = ['Exame', 'Receita', 'Atestado', 'Outro documento'];

export default function FamilyAddExamScreen({ onBack, onSaved }: { onBack: () => void; onSaved: () => void }) {
  const insets = useSafeAreaInsets();
  const [examType, setExamType] = useState('');
  const [date, setDate] = useState(formatDate(new Date()));
  const [observations, setObservations] = useState('');
  const [file, setFile] = useState<PickedFile | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [sentCount, setSentCount] = useState(0);

  async function analyze(picked: PickedFile) {
    setAnalyzing(true);
    try {
      const result = await analyzeFamilyExam(picked);
      if (result.exam_type) setExamType(result.exam_type);
      if (result.exam_date) setDate(result.exam_date);
      if (result.observations) setObservations(result.observations);
    } catch {
      Alert.alert('IA indisponível', 'Não foi possível analisar o documento automaticamente. Preencha os dados manualmente.');
    } finally {
      setAnalyzing(false);
    }
  }

  async function handlePickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso às suas fotos para anexar o documento.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const picked = { uri: asset.uri, name: asset.fileName ?? `foto_${Date.now()}.jpg`, mimeType: asset.mimeType ?? 'image/jpeg' };
      setFile(picked);
      analyze(picked);
    }
  }

  async function handleTakePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para fotografar o documento.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const picked = { uri: asset.uri, name: asset.fileName ?? `foto_${Date.now()}.jpg`, mimeType: asset.mimeType ?? 'image/jpeg' };
      setFile(picked);
      analyze(picked);
    }
  }

  async function handlePickDocument() {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      const picked = { uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/pdf' };
      setFile(picked);
      analyze(picked);
    }
  }

  function handleDiscard() {
    setFile(null);
    setExamType('');
    setObservations('');
    setDate(formatDate(new Date()));
  }

  async function handleSubmit() {
    if (!examType || !file) {
      Alert.alert('Atenção', 'Selecione o tipo de documento e anexe um arquivo.');
      return;
    }

    setSaving(true);
    try {
      await uploadFamilyExam({ exam_type: examType, exam_date: date, observations: observations || undefined, file });
      setSentCount((c) => c + 1);
      handleDiscard();
      Alert.alert('Enviado', 'Documento registrado. Você já pode enviar o próximo.');
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar o documento. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  const pickersDisabled = !!file || analyzing;

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerLogoWrap}>
            <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
          </View>
          <Text style={styles.headerTitle}>Enviar documento</Text>
        </View>
        <TouchableOpacity style={styles.back} onPress={onBack} activeOpacity={0.75} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.backText}>‹ Voltar</Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView style={styles.scroll} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: spacing.xl + insets.bottom }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.subtitle}>
          Tire a foto do documento do paciente — a IA identifica o tipo e a data automaticamente. Confirme e envie para liberar o próximo documento.
          {sentCount > 0 ? `\nEnviados nesta sessão: ${sentCount}` : ''}
        </Text>

        <View style={styles.pickButtonRow}>
          <TouchableOpacity style={[styles.pickButton, pickersDisabled && styles.pickButtonDisabled]} onPress={handleTakePhoto} activeOpacity={0.75} disabled={pickersDisabled}>
            <Text style={styles.pickButtonText}>📷 Foto</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.pickButton, pickersDisabled && styles.pickButtonDisabled]} onPress={handlePickImage} activeOpacity={0.75} disabled={pickersDisabled}>
            <Text style={styles.pickButtonText}>🖼️ Galeria</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.pickButton, pickersDisabled && styles.pickButtonDisabled]} onPress={handlePickDocument} activeOpacity={0.75} disabled={pickersDisabled}>
            <Text style={styles.pickButtonText}>📄 PDF</Text>
          </TouchableOpacity>
        </View>

        {file ? (
          <View style={styles.previewWrap}>
            {file.mimeType.startsWith('image') ? (
              <Image source={{ uri: file.uri }} style={styles.preview} resizeMode="cover" />
            ) : (
              <View style={styles.filePreview}>
                <Text style={styles.filePreviewIcon}>📄</Text>
                <Text style={styles.filePreviewName} numberOfLines={1}>{file.name}</Text>
              </View>
            )}
            {analyzing && (
              <View style={styles.analyzingOverlay}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.analyzingText}>Analisando com IA...</Text>
              </View>
            )}
            <TouchableOpacity style={styles.discardButton} onPress={handleDiscard} disabled={analyzing || saving}>
              <Text style={styles.discardButtonText}>🗑️ Descartar e tirar outra foto</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.previewPlaceholder}>
            <Text style={styles.muted}>Nenhum arquivo anexado ainda.</Text>
          </View>
        )}

        <View style={styles.chipRow}>
          {TYPES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.chip, examType === t && styles.chipActive]}
              onPress={() => setExamType(t)}
            >
              <Text style={[styles.chipText, examType === t && styles.chipTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={styles.input}
          placeholder="Tipo do documento (preenchido pela IA)"
          placeholderTextColor={colors.hint}
          value={examType}
          onChangeText={setExamType}
        />

        <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)} activeOpacity={0.75}>
          <Text style={styles.pickerValue}>{`📅 ${formatDateLabel(date)}`}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={new Date(date + 'T00:00:00')}
            mode="date"
            display="calendar"
            maximumDate={new Date()}
            onChange={(event, selected) => {
              setShowDatePicker(false);
              if (event.type === 'set' && selected) setDate(formatDate(selected));
            }}
          />
        )}

        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="Observações (opcional)"
          placeholderTextColor={colors.hint}
          value={observations}
          onChangeText={setObservations}
          multiline
        />

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={saving || analyzing || !file}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Registrar e enviar</Text>}
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
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.md },
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
  notesInput: { height: buttonHeight * 1.5, paddingTop: spacing.md, textAlignVertical: 'top' },
  previewWrap: { marginBottom: spacing.md },
  preview: {
    width: '100%',
    height: 220,
    borderRadius: 12,
  },
  analyzingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 220,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  analyzingText: { color: '#fff', fontWeight: '600' },
  discardButton: { alignItems: 'center', paddingVertical: spacing.sm },
  discardButtonText: { color: colors.red, fontWeight: '700', fontSize: typography.label },
  previewPlaceholder: {
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  muted: { fontSize: typography.label, color: colors.muted },
  filePreview: {
    height: 100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  filePreviewIcon: { fontSize: 32, marginBottom: 4 },
  filePreviewName: { fontSize: typography.label, color: colors.text, fontWeight: '600' },
  pickButtonRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  pickButton: {
    flex: 1,
    height: buttonHeight - 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: colors.blue,
    backgroundColor: colors.blueDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickButtonDisabled: { opacity: 0.4 },
  pickButtonText: { color: colors.blue, fontWeight: '700', fontSize: typography.label },
  button: {
    backgroundColor: colors.blue,
    height: buttonHeight,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontSize: typography.subtitle, fontWeight: '700' },
});
