import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getFamilyExams, openFamilyExam } from '../services/family.service';
import type { ExamResult } from '../types';
import { colors, spacing, typography, buttonHeight } from '../theme';

function formatDateLabel(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function sourceLabel(source: ExamResult['source']) {
  if (source === 'staff') return 'Equipe';
  if (source === 'patient') return 'Paciente';
  return 'Você';
}

export default function FamilyExamsScreen({ onBack, onAddExam }: { onBack: () => void; onAddExam: () => void }) {
  const [exams, setExams] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingUuid, setOpeningUuid] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    getFamilyExams()
      .then(setExams)
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleOpen(exam: ExamResult) {
    setOpeningUuid(exam.uuid);
    try {
      await openFamilyExam(exam);
    } catch {
      // silencioso — se não houver app pra abrir o arquivo, o share sheet nem aparece
    } finally {
      setOpeningUuid(null);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerLogoWrap}>
            <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
          </View>
          <Text style={styles.headerTitle}>Documentos</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.addButton} onPress={onAddExam} activeOpacity={0.75} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.addButtonText}>+</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.back} onPress={onBack} activeOpacity={0.75} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.backText}>‹ Voltar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.blue} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={exams}
          keyExtractor={(item) => item.uuid}
          contentContainerStyle={{ padding: spacing.lg }}
          ListEmptyComponent={<Text style={styles.muted}>Nenhum documento enviado ainda.</Text>}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.exam_type}</Text>
                <Text style={styles.cardSource}>{sourceLabel(item.source)}</Text>
              </View>
              <Text style={styles.cardMeta}>{formatDateLabel(item.exam_date)}</Text>
              {item.observations ? <Text style={styles.cardObservations}>{item.observations}</Text> : null}
              <TouchableOpacity
                style={styles.openButton}
                onPress={() => handleOpen(item)}
                disabled={openingUuid === item.uuid}
                activeOpacity={0.75}
              >
                {openingUuid === item.uuid ? (
                  <ActivityIndicator color={colors.blue} />
                ) : (
                  <Text style={styles.openButtonText}>Abrir</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  addButton: {
    width: buttonHeight - 16,
    height: buttonHeight - 16,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#fff',
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: { fontSize: typography.subtitle, color: '#fff', fontWeight: '700', lineHeight: typography.subtitle },
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
  muted: { fontSize: typography.label, color: colors.muted, textAlign: 'center', marginTop: spacing.xl },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: typography.label, fontWeight: '700', color: colors.text },
  cardSource: { fontSize: 13, color: colors.muted, fontWeight: '600' },
  cardMeta: { fontSize: 14, color: colors.muted, marginTop: 4 },
  cardObservations: { fontSize: 14, color: colors.text, marginTop: spacing.sm },
  openButton: {
    marginTop: spacing.md,
    height: buttonHeight - 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  openButtonText: { color: colors.blue, fontWeight: '700', fontSize: typography.label },
});
