import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, Image, Platform, StatusBar, StyleSheet, Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getFamilyTimeline } from '../services/family.service';
import type { TimelineItem, TimelineHealthEvent, TimelineCheckIn } from '../types';
import { colors, spacing, typography, buttonHeight } from '../theme';

// Iteração 3 Alexa (F2): a família vê o que o paciente contou pra Alexa (sintomas e medições) e os
// check-ins do dia a dia. A Alexa só registra — quem interpreta é a equipe; aqui mostramos a faixa.

const SEVERITY: Record<string, { label: string; color: string }> = {
  normal: { label: 'dentro da faixa', color: colors.green },
  attention: { label: 'atenção', color: colors.yellow },
  critical: { label: 'crítico', color: colors.red },
};

const CHECKIN: Record<string, { label: string; color: string }> = {
  ok: { label: 'disse que está bem', color: colors.green },
  attention: { label: 'disse que está mais ou menos', color: colors.yellow },
  critical: { label: 'disse que está mal', color: colors.red },
  missed: { label: 'sem resposta', color: colors.border },
  pending: { label: 'pendente', color: colors.border },
};

const DAY_OPTIONS = [7, 14, 30];

function formatValue(ev: TimelineHealthEvent): string {
  if (ev.kind === 'symptom' || ev.value == null) return ev.label;
  const unit = ev.unit ? ` ${ev.unit}` : '';
  if (ev.subtype === 'blood_pressure' && ev.value_secondary != null) {
    return `${ev.label} ${Math.round(ev.value)}/${Math.round(ev.value_secondary)}${unit}`;
  }
  const v = Number.isInteger(ev.value) ? String(ev.value) : ev.value.toFixed(1);
  return `${ev.label} ${v}${unit}`;
}

function HealthCard({ ev }: { ev: TimelineHealthEvent }) {
  const sev = SEVERITY[ev.severity] ?? SEVERITY.normal;
  return (
    <View style={[styles.card, { borderLeftColor: sev.color }]}>
      <Text style={styles.cardTitle}>{ev.kind === 'symptom' ? '🗣️ Contou um sintoma' : '📏 Mediu pela Alexa'}</Text>
      <Text style={styles.cardBody}>{formatValue(ev)}</Text>
      <View style={styles.badgeRow}>
        <Text style={[styles.badge, { color: sev.color, borderColor: sev.color }]}>{sev.label}</Text>
        {ev.confirmation_pending && <Text style={[styles.badge, { color: colors.yellow, borderColor: colors.yellow }]}>não confirmou</Text>}
        {ev.alert && <Text style={[styles.badge, { color: colors.red, borderColor: colors.red }]}>{ev.alert.status === 'active' ? 'alerta ativo' : 'alerta resolvido'}</Text>}
      </View>
      <Text style={styles.cardMeta}>{new Date(ev.at).toLocaleString('pt-BR')}</Text>
    </View>
  );
}

function CheckInCard({ ci }: { ci: TimelineCheckIn }) {
  const st = CHECKIN[ci.status] ?? CHECKIN.pending;
  return (
    <View style={[styles.card, { borderLeftColor: st.color }]}>
      <Text style={styles.cardTitle}>✅ Check-in</Text>
      <Text style={styles.cardBody}>{st.label}</Text>
      {(ci.transcript || ci.notes) ? <Text style={styles.cardNote}>{ci.transcript ?? ci.notes}</Text> : null}
      <Text style={styles.cardMeta}>{new Date(ci.at).toLocaleString('pt-BR')}</Text>
    </View>
  );
}

export default function FamilyTimelineScreen({ onBack }: { onBack: () => void }) {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [days, setDays] = useState(14);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    return getFamilyTimeline(days)
      .then((res) => setItems(res.items))
      .catch((err: any) => setError(err?.message ?? 'Não foi possível carregar.'))
      .finally(() => setLoading(false));
  }, [days]);

  useEffect(() => { load(); }, [load]);

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerLogoWrap}>
            <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
          </View>
          <Text style={styles.headerTitle}>Saúde</Text>
        </View>
        <TouchableOpacity style={styles.back} onPress={onBack} activeOpacity={0.75} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={styles.backText}>‹ Voltar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.filterRow}>
        {DAY_OPTIONS.map((d) => (
          <TouchableOpacity key={d} style={[styles.filterChip, days === d && styles.filterChipActive]} onPress={() => setDays(d)} activeOpacity={0.8}>
            <Text style={[styles.filterText, days === d && styles.filterTextActive]}>{d} dias</Text>
          </TouchableOpacity>
        ))}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {loading ? (
        <ActivityIndicator size="large" color={colors.blue} style={{ marginTop: spacing.xl }} />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => `${item.type}-${item.uuid}`}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.lg + insets.bottom }}
          ListEmptyComponent={<Text style={styles.muted}>Nenhum registro no período.</Text>}
          renderItem={({ item }) => (item.type === 'health_event' ? <HealthCard ev={item} /> : <CheckInCard ci={item} />)}
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
  filterRow: { flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  filterChip: {
    paddingHorizontal: spacing.md,
    height: buttonHeight - 16,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: colors.blue,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
  },
  filterChipActive: { backgroundColor: colors.blue },
  filterText: { fontSize: 14, fontWeight: '700', color: colors.blue },
  filterTextActive: { color: '#fff' },
  error: { color: colors.red, marginHorizontal: spacing.lg, marginTop: spacing.sm, fontSize: 14 },
  muted: { fontSize: typography.label, color: colors.muted, textAlign: 'center', marginTop: spacing.xl },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    borderLeftWidth: 6,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.muted },
  cardBody: { fontSize: typography.label, color: colors.text, marginTop: 4, fontWeight: '600' },
  cardNote: { fontSize: 14, color: colors.text, marginTop: 4, fontStyle: 'italic' },
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  badge: { fontSize: 12, fontWeight: '700', borderWidth: 1, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  cardMeta: { fontSize: 13, color: colors.muted, marginTop: 6 },
});
