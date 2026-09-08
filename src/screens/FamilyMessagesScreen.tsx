import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, KeyboardAvoidingView, Platform, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFamilyMessages, sendFamilyMessage } from '../services/family.service';
import type { AlexaMessage } from '../types';
import { colors, spacing, typography, buttonHeight } from '../theme';

// Iteração 3 Alexa (F1): família deixa recado curto que a Alexa lê pro paciente, e vê os recados
// que o paciente ditou pela Alexa. A Alexa só transporta — nunca interpreta.
const MAX_LENGTH = 300;

export default function FamilyMessagesScreen({ onBack }: { onBack: () => void }) {
  const [messages, setMessages] = useState<AlexaMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const load = useCallback(() => {
    return getFamilyMessages()
      .then((res) => setMessages(res.data))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSend() {
    const text = body.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    setFeedback(null);
    try {
      await sendFamilyMessage(text);
      setBody('');
      setFeedback('Recado enviado. A Alexa oferece a leitura na próxima vez que o paciente abrir a skill.');
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'Não foi possível enviar o recado.');
    } finally {
      setSending(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.headerBar}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerLogoWrap}>
            <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
          </View>
          <Text style={styles.headerTitle}>Recados</Text>
        </View>
        <TouchableOpacity style={styles.back} onPress={onBack} activeOpacity={0.75} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.backText}>‹ Voltar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.composer}>
        <TextInput
          style={styles.input}
          placeholder="Escreva um recado curto — a Alexa lê em voz alta"
          placeholderTextColor={colors.hint}
          value={body}
          onChangeText={setBody}
          multiline
          maxLength={MAX_LENGTH}
        />
        <View style={styles.composerRow}>
          <Text style={styles.counter}>{body.length}/{MAX_LENGTH}</Text>
          <TouchableOpacity style={[styles.sendButton, (!body.trim() || sending) && styles.sendButtonDisabled]} onPress={handleSend} disabled={!body.trim() || sending} activeOpacity={0.8}>
            {sending ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendButtonText}>Enviar recado</Text>}
          </TouchableOpacity>
        </View>
        {error && <Text style={styles.error}>{error}</Text>}
        {feedback && <Text style={styles.feedback}>{feedback}</Text>}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.blue} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={messages}
          keyExtractor={(item) => item.uuid}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.lg + insets.bottom }}
          ListEmptyComponent={<Text style={styles.muted}>Nenhum recado ainda.</Text>}
          renderItem={({ item }) => {
            const fromPatient = item.direction === 'from_patient';
            return (
              <View style={[styles.card, { borderLeftColor: fromPatient ? colors.blue : colors.border }]}>
                <Text style={styles.cardTitle}>
                  {fromPatient ? `${item.author_name.split(' ')[0]} mandou` : `${item.author_name.split(' ')[0]} deixou`}
                  {item.status === 'draft' ? ' (não confirmado)' : ''}
                </Text>
                <Text style={styles.cardBody}>{item.body}</Text>
                <Text style={styles.cardMeta}>
                  {new Date(item.created_at).toLocaleString('pt-BR')}
                  {!fromPatient && (item.read_at ? ' • ouvido pela Alexa' : ' • ainda não ouvido')}
                </Text>
              </View>
            );
          }}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.blueSurface },
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
  composer: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  input: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    minHeight: buttonHeight * 1.5,
    fontSize: typography.body,
    color: colors.text,
    textAlignVertical: 'top',
  },
  composerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  counter: { fontSize: 13, color: colors.muted },
  sendButton: {
    backgroundColor: colors.blue,
    borderRadius: 12,
    height: buttonHeight - 8,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: { opacity: 0.5 },
  sendButtonText: { color: '#fff', fontWeight: '700', fontSize: typography.label },
  error: { color: colors.red, marginTop: spacing.sm, fontSize: 14 },
  feedback: { color: colors.blueDark, marginTop: spacing.sm, fontSize: 14 },
  muted: { fontSize: typography.label, color: colors.muted, textAlign: 'center', marginTop: spacing.xl },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderLeftWidth: 6,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.muted },
  cardBody: { fontSize: typography.label, color: colors.text, marginTop: 4 },
  cardMeta: { fontSize: 13, color: colors.muted, marginTop: 6 },
});
