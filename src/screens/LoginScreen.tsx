import { useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { login } from '../services/auth.service';
import { colors, spacing, typography, buttonHeight } from '../theme';

export default function LoginScreen({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [loginValue, setLoginValue] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (!loginValue || !password) {
      Alert.alert('Preencha CPF/telefone e senha.');
      return;
    }
    setLoading(true);
    try {
      await login(loginValue, password);
      onLoggedIn();
    } catch (err) {
      Alert.alert('Não foi possível entrar', 'Verifique seus dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>UnifCare</Text>
      <Text style={styles.subtitle}>Entre com seu CPF ou telefone</Text>

      <TextInput
        style={styles.input}
        placeholder="CPF ou telefone"
        placeholderTextColor={colors.hint}
        value={loginValue}
        onChangeText={setLoginValue}
        keyboardType="numbers-and-punctuation"
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Senha"
        placeholderTextColor={colors.hint}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />

      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Entrar</Text>}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: typography.title,
    fontWeight: '700',
    color: colors.teal,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: typography.body,
    color: colors.muted,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
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
  button: {
    backgroundColor: colors.teal,
    height: buttonHeight,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  buttonText: {
    color: '#fff',
    fontSize: typography.subtitle,
    fontWeight: '700',
  },
});
