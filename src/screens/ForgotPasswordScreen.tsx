import { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { familyForgotPassword } from '../services/auth.service';
import { colors, spacing, typography, buttonHeight } from '../theme';

export default function ForgotPasswordScreen({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleSubmit() {
    if (!email) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await familyForgotPassword(email);
      setMessage(res.message);
    } catch {
      setMessage('Não foi possível processar o pedido. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={[colors.blueDark, colors.blue, colors.blueLight]} style={styles.gradient}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
          <View style={styles.brandBlock}>
            <View style={styles.logoWrap}>
              <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
            </View>
            <Text style={styles.title}>Esqueci minha senha</Text>
            <Text style={styles.tagline}>Informe o e-mail cadastrado como responsável</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.inputLabel}>E-mail</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: nome@email.com"
              placeholderTextColor={colors.hint}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            {!!message && <Text style={styles.message}>{message}</Text>}

            <TouchableOpacity
              style={styles.button}
              onPress={handleSubmit}
              disabled={loading || !email}
              activeOpacity={0.85}
            >
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Enviar link por e-mail</Text>}
            </TouchableOpacity>

            <TouchableOpacity style={styles.backLink} onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.backLinkText}>‹ Voltar para o login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  flex: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: spacing.lg, paddingVertical: spacing.xl },
  brandBlock: { alignItems: 'center', marginBottom: spacing.xl },
  logoWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  logo: { width: 66, height: 66 },
  title: { fontSize: typography.title, fontWeight: '800', color: '#fff', textAlign: 'center' },
  tagline: { fontSize: typography.label, color: 'rgba(255,255,255,0.85)', textAlign: 'center', marginTop: 4 },
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
  inputLabel: { fontSize: typography.label - 2, fontWeight: '600', color: colors.muted, marginBottom: 6, marginLeft: 2 },
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
  message: { fontSize: typography.label, color: colors.muted, marginBottom: spacing.md, textAlign: 'center' },
  button: {
    backgroundColor: colors.blue,
    height: buttonHeight,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  buttonText: { color: '#fff', fontSize: typography.subtitle, fontWeight: '700' },
  backLink: { marginTop: spacing.md, alignItems: 'center' },
  backLinkText: { fontSize: typography.label, fontWeight: '700', color: colors.blue, textDecorationLine: 'underline' },
});
