import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography, buttonHeight } from '../theme';
import { requestWearablePermissions, syncWearableVitals } from '../services/wearable.service';

// Pareamento da Xiaomi Smart Band 8 Pro sempre passa pelo Mi Fitness, em qualquer
// plataforma — não tem como pular essa etapa (é a Xiaomi quem controla o protocolo BLE).
const MI_FITNESS_PACKAGE = 'com.xiaomi.wearable';
const HEALTH_CONNECT_PACKAGE = 'com.google.android.apps.healthdata';

// Espelha react-native-health-connect (lido direto do .d.ts instalado): 1 = SDK
// indisponível (precisa instalar), 2 = precisa atualizar o provedor, 3 = disponível.
const HC_UNAVAILABLE = 1;
const HC_UPDATE_REQUIRED = 2;
const HC_AVAILABLE = 3;

type HcStatus = 'checking' | 'unavailable' | 'update_required' | 'available' | 'not_applicable';
type SyncTest = 'idle' | 'testing' | 'ok' | 'empty' | 'denied';

function openPlayStore(packageName: string) {
  Linking.openURL(`market://details?id=${packageName}`).catch(() =>
    Linking.openURL(`https://play.google.com/store/apps/details?id=${packageName}`),
  );
}

export default function WearableSetupScreen({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const [hcStatus, setHcStatus] = useState<HcStatus>(Platform.OS === 'android' ? 'checking' : 'not_applicable');
  const [syncTest, setSyncTest] = useState<SyncTest>('idle');

  const checkHealthConnect = useCallback(async () => {
    if (Platform.OS !== 'android') return;
    setHcStatus('checking');
    try {
      const HealthConnect = await import('react-native-health-connect');
      const status = await HealthConnect.getSdkStatus();
      if (status === HC_AVAILABLE) setHcStatus('available');
      else if (status === HC_UPDATE_REQUIRED) setHcStatus('update_required');
      else setHcStatus('unavailable');
    } catch {
      setHcStatus('unavailable');
    }
  }, []);

  useEffect(() => {
    checkHealthConnect();
  }, [checkHealthConnect]);

  async function handleOpenHealthConnectPermissions() {
    try {
      const HealthConnect = await import('react-native-health-connect');
      HealthConnect.openHealthConnectSettings();
    } catch {
      // ignora — próximo passo (testar sincronização) revela se algo ainda falta
    }
  }

  async function handleTestSync() {
    setSyncTest('testing');
    const granted = await requestWearablePermissions();
    if (!granted) {
      setSyncTest('denied');
      return;
    }
    await syncWearableVitals();
    setSyncTest('ok');
    checkHealthConnect();
  }

  return (
    <View style={styles.screen}>
      <View style={styles.headerBar}>
        <Text style={styles.headerTitle}>Configurar relógio</Text>
        <TouchableOpacity style={styles.back} onPress={onBack} activeOpacity={0.75} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.backText}>‹ Voltar</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.container} contentContainerStyle={[styles.content, { paddingBottom: spacing.xl + insets.bottom }]}>
        <Text style={styles.intro}>
          Siga os passos abaixo, na ordem, para que as medições da sua Xiaomi Smart Band cheguem até o UnifCare.
        </Text>

        {/* Passo 1 — Mi Fitness */}
        <View style={styles.card}>
          <Text style={styles.stepLabel}>Passo 1</Text>
          <Text style={styles.stepTitle}>Pareie a pulseira no Mi Fitness</Text>
          <Text style={styles.stepText}>
            O Mi Fitness é o app da Xiaomi que conversa diretamente com a pulseira. Se ela já aparece
            conectada lá, pode pular este passo.
          </Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => openPlayStore(MI_FITNESS_PACKAGE)}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>Abrir Mi Fitness</Text>
          </TouchableOpacity>
        </View>

        {/* Passo 2 — Health Connect (só Android; iOS usa o app Saúde nativo) */}
        {Platform.OS === 'android' && (
          <View style={styles.card}>
            <Text style={styles.stepLabel}>Passo 2</Text>
            <Text style={styles.stepTitle}>Autorize o Health Connect</Text>
            <Text style={styles.stepText}>
              É a ponte entre o Mi Fitness e o UnifCare — ela guarda as medições no aparelho e deixa o
              UnifCare lê-las.
            </Text>

            {hcStatus === 'checking' && (
              <View style={styles.center}>
                <ActivityIndicator color={colors.green} />
              </View>
            )}

            {hcStatus === 'available' && (
              <>
                <Text style={styles.statusOk}>✓ Já está disponível neste aparelho.</Text>
                <TouchableOpacity style={styles.actionButton} onPress={handleOpenHealthConnectPermissions} activeOpacity={0.8}>
                  <Text style={styles.actionButtonText}>Revisar permissões</Text>
                </TouchableOpacity>
              </>
            )}

            {hcStatus === 'update_required' && (
              <>
                <Text style={styles.statusWarn}>Precisa atualizar o Health Connect.</Text>
                <TouchableOpacity style={styles.actionButton} onPress={() => openPlayStore(HEALTH_CONNECT_PACKAGE)} activeOpacity={0.8}>
                  <Text style={styles.actionButtonText}>Atualizar</Text>
                </TouchableOpacity>
              </>
            )}

            {hcStatus === 'unavailable' && (
              <>
                <Text style={styles.statusWarn}>Não encontrado neste aparelho — precisa instalar.</Text>
                <TouchableOpacity style={styles.actionButton} onPress={() => openPlayStore(HEALTH_CONNECT_PACKAGE)} activeOpacity={0.8}>
                  <Text style={styles.actionButtonText}>Instalar Health Connect</Text>
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity style={styles.linkButton} onPress={checkHealthConnect} activeOpacity={0.7}>
              <Text style={styles.linkButtonText}>Verificar novamente</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Passo 3 — testar sincronização */}
        <View style={styles.card}>
          <Text style={styles.stepLabel}>Passo {Platform.OS === 'android' ? '3' : '2'}</Text>
          <Text style={styles.stepTitle}>Teste a sincronização com o UnifCare</Text>
          <Text style={styles.stepText}>
            Depois de completar os passos acima, toque no botão abaixo para confirmar que o UnifCare
            consegue ler a última medição da pulseira. A partir daí, a sincronização acontece sozinha a
            cada 10 minutos com o app aberto.
          </Text>

          <TouchableOpacity style={styles.actionButton} onPress={handleTestSync} disabled={syncTest === 'testing'} activeOpacity={0.8}>
            <Text style={styles.actionButtonText}>{syncTest === 'testing' ? 'Testando...' : 'Testar agora'}</Text>
          </TouchableOpacity>

          {syncTest === 'ok' && <Text style={styles.statusOk}>✓ Sincronização funcionando.</Text>}
          {syncTest === 'denied' && (
            <Text style={styles.statusWarn}>
              Permissão negada. Volte ao Passo {Platform.OS === 'android' ? '2' : '1'} e autorize o acesso.
            </Text>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.greenSurface },
  container: { flex: 1 },
  content: { padding: spacing.lg },
  center: { paddingVertical: spacing.md, alignItems: 'center' },
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
  intro: { fontSize: typography.label, color: colors.muted, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  stepLabel: { fontSize: 13, fontWeight: '700', color: colors.green, textTransform: 'uppercase' },
  stepTitle: { fontSize: typography.subtitle, fontWeight: '700', color: colors.text, marginTop: 4 },
  stepText: { fontSize: typography.label, color: colors.muted, marginTop: spacing.sm },
  actionButton: {
    marginTop: spacing.md,
    backgroundColor: colors.green,
    height: buttonHeight - 12,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionButtonText: { color: '#fff', fontWeight: '700', fontSize: typography.label },
  linkButton: { marginTop: spacing.sm, alignItems: 'center' },
  linkButtonText: { color: colors.green, fontWeight: '700', fontSize: 14 },
  statusOk: { marginTop: spacing.sm, color: colors.green, fontWeight: '700', fontSize: typography.label },
  statusWarn: { marginTop: spacing.sm, color: colors.yellow, fontWeight: '700', fontSize: typography.label },
});
