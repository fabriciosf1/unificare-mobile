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
import { LinearGradient } from 'expo-linear-gradient';
import { updateMyPassword } from '../services/patient.service';
import { colors, spacing, typography, buttonHeight } from '../theme';

export default function ChangePasswordScreen({ onChanged }: { onChanged: () => void }) {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!newPassword || newPassword.length < 8) {
      Alert.alert('Informe uma nova senha com ao menos 8 caracteres.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('A confirmação de senha não confere.');
      return;
    }

    setSaving(true);
    try {
      // token Sanctum já comprova identidade nesse fluxo — backend dispensa a senha atual
      await updateMyPassword('', newPassword);
      onChanged();
    } catch (err) {
      Alert.alert('Erro', err instanceof Error ? err.message : 'Não foi possível trocar a senha.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.brandBlock}>
          <LinearGradient
            colors={[colors.greenLight, colors.green, colors.greenDark]}
            locations={[0, 0.55, 1]}
            style={styles.logoWrap}
          >
            <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
          </LinearGradient>
          <Text style={styles.welcome}>Bem-vindo ao UnifCare!</Text>
        </View>

        <Text style={styles.info}>
          Por segurança, é necessário alterar sua senha para continuar usando o app.
        </Text>

        <View style={styles.passwordWrap}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Nova senha (mín. 8 caracteres)"
            placeholderTextColor={colors.hint}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showNewPassword}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowNewPassword(v => !v)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.eyeIcon}>{showNewPassword ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.passwordWrap}>
          <TextInput
            style={[styles.input, styles.passwordInput]}
            placeholder="Confirmar nova senha"
            placeholderTextColor={colors.hint}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
          />
          <TouchableOpacity
            style={styles.eyeButton}
            onPress={() => setShowConfirmPassword(v => !v)}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.eyeIcon}>{showConfirmPassword ? '🙈' : '👁'}</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.button} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Salvar e continuar</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.greenSurface },
  container: { flex: 1 },
  content: {
    padding: spacing.lg,
    paddingTop: (Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 54) + spacing.xl,
    paddingBottom: spacing.xl,
  },
  brandBlock: { alignItems: 'center', marginBottom: spacing.lg },
  logoWrap: {
    width: 116,
    height: 116,
    borderRadius: 58,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
    shadowColor: colors.greenDark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  logo: { width: 80, height: 80 },
  welcome: { fontSize: typography.title, fontWeight: '800', color: colors.greenDark, textAlign: 'center' },
  info: { fontSize: typography.body, color: colors.muted, marginBottom: spacing.lg, textAlign: 'center' },
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
  passwordWrap: { justifyContent: 'center' },
  passwordInput: { paddingRight: spacing.xl + spacing.md },
  eyeButton: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    height: buttonHeight,
    justifyContent: 'center',
  },
  eyeIcon: { fontSize: typography.subtitle },
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
