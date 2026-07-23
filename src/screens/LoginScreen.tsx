import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { login, familyLogin } from '../services/auth.service';
import type { AppRole } from '../services/api';
import { colors, spacing, typography, buttonHeight } from '../theme';

const ROLE_THEME = {
  patient: { dark: colors.greenDark, mid: colors.green, light: colors.greenLight },
  family: { dark: colors.blueDark, mid: colors.blue, light: colors.blueLight },
};

function formatCpf(digits: string) {
  return digits
    .slice(0, 11)
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export default function LoginScreen({
  onLoggedIn,
  onForgotPassword,
}: {
  onLoggedIn: (role: AppRole, mustChangePassword?: boolean) => void;
  onForgotPassword: () => void;
}) {
  const [role, setRoleValue] = useState<AppRole>('patient');
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertInfo, setAlertInfo] = useState<{ title: string; message?: string } | null>(null);
  const fade = useRef(new Animated.Value(1)).current;
  const theme = ROLE_THEME[role];

  function switchRole(nextRole: AppRole) {
    Animated.sequence([
      Animated.timing(fade, { toValue: 0, duration: 140, useNativeDriver: true }),
      Animated.timing(fade, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    setRoleValue(nextRole);
    setLoginValue('');
    if (nextRole === 'patient') {
      setLoginValue(v => v.replace(/\D/g, ''));
    }
  }

  async function handleSubmit() {
    if (!loginValue || !password) {
      setAlertInfo({
        title: 'Campos obrigatórios',
        message: role === 'patient' ? 'Preencha CPF e senha.' : 'Preencha e-mail e senha.',
      });
      return;
    }
    setLoading(true);
    try {
      if (role === 'patient') {
        const patient = await login(loginValue, password);
        onLoggedIn(role, patient.password_must_change);
      } else {
        const contact = await familyLogin(loginValue, password);
        onLoggedIn(role, contact.password_must_change);
      }
    } catch (err) {
      setAlertInfo({ title: 'Não foi possível entrar', message: 'Verifique seus dados e tente novamente.' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={[theme.dark, theme.mid, theme.light]} style={styles.gradient}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View style={{ opacity: fade }}>
            <View style={styles.brandBlock}>
              <View style={styles.logoWrap}>
                <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
              </View>
              <Text style={styles.title}>UnifCare</Text>
              <Text style={styles.tagline}>
                {role === 'patient' ? 'Cuidado conectado, a todo momento' : 'Acompanhe quem você ama'}
              </Text>
            </View>

            <View style={styles.card}>
              <Text style={styles.subtitle}>
                {role === 'patient' ? 'Entre com seu CPF' : 'Entre com seu e-mail'}
              </Text>

              <Text style={styles.inputLabel}>{role === 'patient' ? 'CPF' : 'E-mail'}</Text>
              <TextInput
                style={styles.input}
                placeholder={role === 'patient' ? 'Ex: 123.456.789-00' : 'Ex: nome@email.com'}
                placeholderTextColor={colors.hint}
                value={role === 'patient' ? formatCpf(loginValue) : loginValue}
                onChangeText={text => {
                  if (role === 'patient') {
                    setLoginValue(text.replace(/\D/g, '').slice(0, 11));
                  } else {
                    setLoginValue(text);
                  }
                }}
                autoCapitalize="none"
                keyboardType={role === 'patient' ? 'number-pad' : 'email-address'}
              />

              <Text style={styles.inputLabel}>Senha</Text>
              <View style={styles.passwordWrap}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  placeholder="Digite sua senha"
                  placeholderTextColor={colors.hint}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setShowPassword(v => !v)}
                  hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                >
                  <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁'}</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.button, { backgroundColor: theme.mid, shadowColor: theme.mid }]}
                onPress={handleSubmit}
                disabled={loading}
                activeOpacity={0.85}
              >
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar</Text>}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.switchRoleLink}
                onPress={() => switchRole(role === 'patient' ? 'family' : 'patient')}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={[styles.switchRoleLinkText, { color: theme.mid }]}>
                  {role === 'patient' ? 'Sou familiar' : 'Sou cliente'}
                </Text>
              </TouchableOpacity>

              {role === 'family' && (
                <TouchableOpacity
                  style={styles.switchRoleLink}
                  onPress={onForgotPassword}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.switchRoleLinkText, { color: colors.muted, textDecorationLine: 'underline' }]}>
                    Esqueci minha senha
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>

          <Text style={styles.footer}>UnifCare © {new Date().getFullYear()} — Sua saúde, monitorada com cuidado</Text>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={!!alertInfo} transparent animationType="fade" onRequestClose={() => setAlertInfo(null)}>
        <View style={styles.alertBackdrop}>
          <View style={styles.alertCard}>
            <View style={[styles.alertIconWrap, { backgroundColor: theme.mid }]}>
              <Text style={styles.alertIcon}>!</Text>
            </View>
            <Text style={styles.alertTitle}>{alertInfo?.title}</Text>
            {!!alertInfo?.message && <Text style={styles.alertMessage}>{alertInfo.message}</Text>}
            <TouchableOpacity
              style={[styles.alertButton, { backgroundColor: theme.mid }]}
              onPress={() => setAlertInfo(null)}
              activeOpacity={0.85}
            >
              <Text style={styles.alertButtonText}>Entendi</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  brandBlock: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  logoWrap: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logo: {
    width: 76,
    height: 76,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '800',
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  tagline: {
    fontSize: typography.label,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
    marginTop: 4,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 8,
  },
  subtitle: {
    fontSize: typography.label,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  switchRoleLink: {
    marginTop: spacing.md,
    alignItems: 'center',
  },
  switchRoleLinkText: {
    fontSize: typography.label,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  inputLabel: {
    fontSize: typography.label - 2,
    fontWeight: '600',
    color: colors.muted,
    marginBottom: 6,
    marginLeft: 2,
  },
  input: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    height: buttonHeight,
    fontSize: typography.body,
    color: colors.text,
    marginBottom: spacing.md,
  },
  passwordWrap: {
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: spacing.xl + spacing.md,
  },
  eyeButton: {
    position: 'absolute',
    right: spacing.md,
    top: 0,
    height: buttonHeight,
    justifyContent: 'center',
  },
  eyeIcon: {
    fontSize: typography.subtitle,
  },
  button: {
    backgroundColor: colors.teal,
    height: buttonHeight,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    shadowColor: colors.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontSize: typography.subtitle,
    fontWeight: '700',
  },
  footer: {
    fontSize: typography.label - 3,
    color: 'rgba(255,255,255,0.75)',
    textAlign: 'center',
    marginTop: spacing.xl,
  },
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
