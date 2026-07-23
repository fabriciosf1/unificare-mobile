import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { uploadMyExam } from '../services/patient.service';
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

export default function AddExamScreen({ onBack, onSaved }: { onBack: () => void; onSaved: () => void }) {
  const [examType, setExamType] = useState('');
  const [date, setDate] = useState(formatDate(new Date()));
  const [observations, setObservations] = useState('');
  const [file, setFile] = useState<PickedFile | null>(null);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

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
      setFile({ uri: asset.uri, name: asset.fileName ?? `foto_${Date.now()}.jpg`, mimeType: asset.mimeType ?? 'image/jpeg' });
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
      setFile({ uri: asset.uri, name: asset.fileName ?? `foto_${Date.now()}.jpg`, mimeType: asset.mimeType ?? 'image/jpeg' });
    }
  }

  async function handlePickDocument() {
    const result = await DocumentPicker.getDocumentAsync({ type: ['application/pdf', 'image/*'] });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setFile({ uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/pdf' });
    }
  }

  async function handleSubmit() {
    if (!examType || !file) {
      Alert.alert('Atenção', 'Selecione o tipo de documento e anexe um arquivo.');
      return;
    }

    setSaving(true);
    try {
      await uploadMyExam({ exam_type: examType, exam_date: date, observations: observations || undefined, file });
      Alert.alert('Enviado', 'Seu documento foi enviado com sucesso.');
      onSaved();
    } catch {
      Alert.alert('Erro', 'Não foi possível enviar o documento. Tente novamente.');
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
          <Text style={styles.headerTitle}>Enviar documento</Text>
        </View>
        <TouchableOpacity style={styles.back} onPress={onBack} activeOpacity={0.75} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.backText}>‹ Voltar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.subtitle}>Exame, receita ou atestado — envia direto, sem precisar de aprovação.</Text>

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

        {file ? (
          file.mimeType.startsWith('image') ? (
            <Image source={{ uri: file.uri }} style={styles.preview} resizeMode="cover" />
          ) : (
            <View style={styles.filePreview}>
              <Text style={styles.filePreviewIcon}>📄</Text>
              <Text style={styles.filePreviewName} numberOfLines={1}>{file.name}</Text>
            </View>
          )
        ) : (
          <View style={styles.previewPlaceholder}>
            <Text style={styles.muted}>Nenhum arquivo anexado ainda.</Text>
          </View>
        )}

        <View style={styles.pickButtonRow}>
          <TouchableOpacity style={styles.pickButton} onPress={handleTakePhoto} activeOpacity={0.75}>
            <Text style={styles.pickButtonText}>📷 Foto</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pickButton} onPress={handlePickImage} activeOpacity={0.75}>
            <Text style={styles.pickButtonText}>🖼️ Galeria</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.pickButton} onPress={handlePickDocument} activeOpacity={0.75}>
            <Text style={styles.pickButtonText}>📄 PDF</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Enviar</Text>}
        </TouchableOpacity>
      </ScrollView>
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
  chipActive: { backgroundColor: colors.green, borderColor: colors.green },
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
  preview: {
    width: '100%',
    height: 220,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
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
    marginBottom: spacing.md,
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
    borderColor: colors.green,
    backgroundColor: colors.greenDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickButtonText: { color: colors.green, fontWeight: '700', fontSize: typography.label },
  button: {
    backgroundColor: colors.green,
    height: buttonHeight,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: '#fff', fontSize: typography.subtitle, fontWeight: '700' },
});
