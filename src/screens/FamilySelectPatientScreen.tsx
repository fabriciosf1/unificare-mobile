import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { FamilyPatient } from '../types';
import { familyMe } from '../services/family.service';
import { getActivePatientUuid, setActivePatientUuid } from '../services/familyPatientContext';
import AuthImage from '../components/AuthImage';
import { colors, spacing, typography } from '../theme';

export default function FamilySelectPatientScreen({
  allowBack,
  onSelected,
  onBack,
}: {
  allowBack: boolean;
  onSelected: () => void;
  onBack: () => void;
}) {
  const [patients, setPatients] = useState<FamilyPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const activeUuid = getActivePatientUuid();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    familyMe()
      .then((contact) => setPatients(contact.patients))
      .finally(() => setLoading(false));
  }, []);

  async function handleSelect(patient: FamilyPatient) {
    await setActivePatientUuid(patient.uuid);
    onSelected();
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.blue} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.lg }]}>
      <View style={styles.headerRow}>
        <View style={styles.headerTitleRow}>
          <View style={styles.headerLogoWrap}>
            <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
          </View>
          <Text style={styles.headerTitle}>Quem você quer acompanhar?</Text>
        </View>
        {allowBack && (
          <TouchableOpacity onPress={onBack} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.backText}>‹ Voltar</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={patients}
        keyExtractor={(item) => item.uuid}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.lg + insets.bottom }}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.card, item.uuid === activeUuid && styles.cardActive]}
            onPress={() => handleSelect(item)}
            activeOpacity={0.8}
          >
            {item.photo_url ? (
              <AuthImage path={item.photo_url} style={styles.photo} />
            ) : (
              <View style={[styles.photo, styles.photoPlaceholder]}>
                <Text style={styles.photoInitial}>{item.name[0] ?? '?'}</Text>
              </View>
            )}
            <View style={styles.info}>
              <Text style={styles.name}>{item.name}</Text>
              {!!item.relationship && <Text style={styles.relationship}>{item.relationship}</Text>}
            </View>
            {item.is_primary && (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>Principal</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.blueSurface },
  center: { alignItems: 'center', justifyContent: 'center' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  headerLogoWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.blueDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: { width: 22, height: 22 },
  headerTitle: { fontSize: typography.subtitle, fontWeight: '700', color: colors.text, flexShrink: 1 },
  backText: { fontSize: typography.label, color: colors.blueDark, fontWeight: '700' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  cardActive: { borderColor: colors.blue },
  photo: { width: 56, height: 56, borderRadius: 28 },
  photoPlaceholder: { backgroundColor: colors.blueDim, alignItems: 'center', justifyContent: 'center' },
  photoInitial: { fontSize: 22, fontWeight: '700', color: colors.blueDark },
  info: { flex: 1 },
  name: { fontSize: typography.label, fontWeight: '700', color: colors.text },
  relationship: { fontSize: 14, color: colors.muted, marginTop: 2 },
  badge: { backgroundColor: colors.blueDim, borderRadius: 8, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  badgeText: { fontSize: 12, fontWeight: '700', color: colors.blueDark },
});
