import { useEffect, useState } from 'react';
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
import { me } from '../services/auth.service';
import { updateMyProfile, updateMyPassword, uploadMyPhoto } from '../services/patient.service';
import { lookupCep } from '../services/cep.service';
import type { Patient } from '../types';
import { colors, spacing, typography, buttonHeight } from '../theme';

function formatCep(value: string) {
  return value.replace(/\D/g, '').slice(0, 8).replace(/(\d{5})(\d)/, '$1-$2');
}

export default function ProfileScreen({ onBack }: { onBack: () => void }) {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [phone, setPhone] = useState('');
  const [cep, setCep] = useState('');
  const [street, setStreet] = useState('');
  const [number, setNumber] = useState('');
  const [complement, setComplement] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [referencePoint, setReferencePoint] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [cepLoading, setCepLoading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    me()
      .then((p) => {
        setPatient(p);
        setPhone(p.phone ?? '');
        setCep(p.cep ?? '');
        setStreet(p.street ?? '');
        setNumber(p.number ?? '');
        setComplement(p.complement ?? '');
        setNeighborhood(p.neighborhood ?? '');
        setCity(p.city ?? '');
        setState(p.state ?? '');
        setReferencePoint(p.reference_point ?? '');
      })
      .catch(() => Alert.alert('Erro', 'Não foi possível carregar seus dados.'))
      .finally(() => setLoading(false));
  }, []);

  async function handlePickPhoto() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permissão necessária', 'Permita o acesso às fotos para trocar sua foto de perfil.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.[0]) return;

    setUploadingPhoto(true);
    try {
      const { photo_url } = await uploadMyPhoto(result.assets[0].uri);
      setPatient((prev) => (prev ? { ...prev, photo_url } : prev));
    } catch {
      Alert.alert('Erro', 'Não foi possível atualizar sua foto.');
    } finally {
      setUploadingPhoto(false);
    }
  }

  async function handleCepBlur() {
    setCepLoading(true);
    try {
      const result = await lookupCep(cep);
      if (!result) return;
      setStreet(result.street || street);
      setNeighborhood(result.neighborhood || neighborhood);
      setCity(result.city || city);
      setState(result.state || state);
    } catch {
      // sem internet ou CEP inválido — usuário preenche manualmente
    } finally {
      setCepLoading(false);
    }
  }

  async function handleSaveProfile() {
    setSavingProfile(true);
    try {
      await updateMyProfile({
        phone,
        cep,
        street,
        number,
        complement,
        neighborhood,
        city,
        state,
        reference_point: referencePoint,
      });
      Alert.alert('Sucesso', 'Seus dados foram atualizados.');
    } catch {
      Alert.alert('Erro', 'Não foi possível salvar seus dados.');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleSavePassword() {
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      Alert.alert('Informe a senha atual e uma nova senha com ao menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('A confirmação de senha não confere.');
      return;
    }

    setSavingPassword(true);
    try {
      await updateMyPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      Alert.alert('Sucesso', 'Sua senha foi alterada.');
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível trocar a senha.');
    } finally {
      setSavingPassword(false);
    }
  }

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
        <View style={styles.headerTitleRow}>
          <View style={styles.headerLogoWrap}>
            <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
          </View>
          <Text style={styles.headerTitle}>Meu perfil</Text>
        </View>
        <TouchableOpacity style={styles.back} onPress={onBack} activeOpacity={0.75} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.backText}>‹ Voltar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.photoSection}>
        <TouchableOpacity onPress={handlePickPhoto} activeOpacity={0.8} disabled={uploadingPhoto}>
          {patient?.photo_url ? (
            <Image source={{ uri: patient.photo_url }} style={styles.photo} />
          ) : (
            <View style={[styles.photo, styles.photoPlaceholder]}>
              <Text style={styles.photoPlaceholderText}>{patient?.name?.[0] ?? '?'}</Text>
            </View>
          )}
          <View style={styles.photoBadge}>
            {uploadingPhoto ? <ActivityIndicator size="small" color="#fff" /> : <Text style={styles.photoBadgeText}>📷</Text>}
          </View>
        </TouchableOpacity>
        <Text style={styles.patientName}>{patient?.name}</Text>
      </View>

      <Text style={styles.sectionTitle}>Contato e endereço</Text>
      <TextInput style={styles.input} placeholder="Telefone" placeholderTextColor={colors.hint} value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
      <View style={styles.cepRow}>
        <TextInput
          style={[styles.input, styles.cepInput]}
          placeholder="CEP"
          placeholderTextColor={colors.hint}
          value={cep}
          onChangeText={(text) => setCep(formatCep(text))}
          onBlur={handleCepBlur}
          keyboardType="numeric"
          maxLength={9}
        />
        {cepLoading && <ActivityIndicator size="small" color={colors.green} style={styles.cepLoading} />}
      </View>
      <TextInput style={styles.input} placeholder="Rua" placeholderTextColor={colors.hint} value={street} onChangeText={setStreet} />
      <View style={styles.row}>
        <TextInput style={[styles.input, styles.rowInput]} placeholder="Número" placeholderTextColor={colors.hint} value={number} onChangeText={setNumber} />
        <TextInput style={[styles.input, styles.rowInput]} placeholder="Complemento" placeholderTextColor={colors.hint} value={complement} onChangeText={setComplement} />
      </View>
      <TextInput style={styles.input} placeholder="Bairro" placeholderTextColor={colors.hint} value={neighborhood} onChangeText={setNeighborhood} />
      <View style={styles.row}>
        <TextInput style={[styles.input, styles.rowInput]} placeholder="Cidade" placeholderTextColor={colors.hint} value={city} onChangeText={setCity} />
        <TextInput style={[styles.input, styles.rowInputSmall]} placeholder="UF" placeholderTextColor={colors.hint} value={state} onChangeText={setState} maxLength={2} autoCapitalize="characters" />
      </View>
      <TextInput style={styles.input} placeholder="Ponto de referência" placeholderTextColor={colors.hint} value={referencePoint} onChangeText={setReferencePoint} />

      <TouchableOpacity style={styles.button} onPress={handleSaveProfile} disabled={savingProfile}>
        {savingProfile ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Salvar dados</Text>}
      </TouchableOpacity>

      <Text style={styles.sectionTitle}>Trocar senha</Text>
      <TextInput
        style={styles.input}
        placeholder="Senha atual"
        placeholderTextColor={colors.hint}
        value={currentPassword}
        onChangeText={setCurrentPassword}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="Nova senha (mín. 8 caracteres)"
        placeholderTextColor={colors.hint}
        value={newPassword}
        onChangeText={setNewPassword}
        secureTextEntry
      />
      <TextInput
        style={styles.input}
        placeholder="Confirmar nova senha"
        placeholderTextColor={colors.hint}
        value={confirmPassword}
        onChangeText={setConfirmPassword}
        secureTextEntry
      />
      <TouchableOpacity style={styles.button} onPress={handleSavePassword} disabled={savingPassword}>
        {savingPassword ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Trocar senha</Text>}
      </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.greenSurface },
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingTop: spacing.xl, paddingBottom: spacing.xl },
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
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
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
  photoSection: { alignItems: 'center', marginBottom: spacing.lg },
  photo: { width: 96, height: 96, borderRadius: 48 },
  photoPlaceholder: { backgroundColor: colors.greenDim, alignItems: 'center', justifyContent: 'center' },
  photoPlaceholderText: { fontSize: 36, fontWeight: '700', color: colors.green },
  photoBadge: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.greenSurface,
  },
  photoBadgeText: { fontSize: 14 },
  patientName: { marginTop: spacing.sm, fontSize: typography.subtitle, fontWeight: '700', color: colors.text },
  sectionTitle: { fontSize: typography.label, fontWeight: '700', color: colors.text, marginBottom: spacing.sm, marginTop: spacing.sm },
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
  row: { flexDirection: 'row', gap: spacing.sm },
  cepRow: { position: 'relative', justifyContent: 'center' },
  cepInput: { width: '55%' },
  cepLoading: { position: 'absolute', left: '55%', marginLeft: spacing.sm },
  rowInput: { flex: 1 },
  rowInputSmall: { width: 70 },
  button: {
    backgroundColor: colors.green,
    height: buttonHeight,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  buttonText: { color: '#fff', fontSize: typography.subtitle, fontWeight: '700' },
});
