import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { familyLogout } from '../services/auth.service';
import {
  approveAppointment,
  approveGeofence,
  approveMedication,
  familyMe,
  getLatestLocation,
  getPendingApprovals,
  rejectAppointment,
  rejectGeofence,
  rejectMedication,
  requestCamera,
} from '../services/family.service';
import type { Appointment, FamilyContact, Medication, PendingApprovals } from '../types';
import { colors, spacing, typography } from '../theme';

function buildMapHtml(lat: number, lng: number, radius: number, name: string, photoUrl: string | null): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html,body,#map{height:100%;margin:0;padding:0;}
    .marker-pin {
      width: 46px;
      height: 46px;
      border-radius: 50% 50% 50% 0;
      background: ${colors.teal};
      transform: rotate(-45deg);
      box-shadow: 0 2px 6px rgba(0,0,0,0.35);
    }
    .marker-pin img {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      object-fit: cover;
      transform: rotate(45deg);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map').setView([${lat}, ${lng}], 17);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    const photoUrl = ${JSON.stringify(photoUrl)};
    const marker = photoUrl
      ? L.marker([${lat}, ${lng}], {
          icon: L.divIcon({
            className: '',
            html: '<div class="marker-pin"><img src="' + photoUrl + '" /></div>',
            iconSize: [46, 46],
            iconAnchor: [23, 46],
            popupAnchor: [0, -42],
          }),
        })
      : L.marker([${lat}, ${lng}]);
    marker.addTo(map).bindPopup(${JSON.stringify(name)});

    L.circle([${lat}, ${lng}], {
      radius: ${radius},
      color: '${colors.teal}',
      fillColor: '${colors.teal}',
      fillOpacity: 0.15
    }).addTo(map);
  </script>
</body>
</html>`;
}

function formatSince(iso: string | null): string | null {
  if (!iso) return null;
  const time = new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `Desde às ${time}`;
}

export default function FamilyHomeScreen({
  onLoggedOut,
  onOpenAlerts,
  onOpenMedications,
  onOpenCamera,
  onOpenAddExam,
  onOpenAddAppointment,
  onOpenProfile,
}: {
  onLoggedOut: () => void;
  onOpenAlerts: () => void;
  onOpenMedications: () => void;
  onOpenCamera: (patientId: number, patientName: string) => void;
  onOpenAddExam: () => void;
  onOpenAddAppointment: () => void;
  onOpenProfile: () => void;
}) {
  const [contact, setContact] = useState<FamilyContact | null>(null);
  const [pending, setPending] = useState<PendingApprovals>({ medications: [], appointments: [] });
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [since, setSince] = useState<string | null>(null);
  const [safeRadius, setSafeRadius] = useState(500);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requestingCamera, setRequestingCamera] = useState(false);
  const [pendingModalOpen, setPendingModalOpen] = useState(false);
  const insets = useSafeAreaInsets();

  const loadData = useCallback(async () => {
    const [c, p, loc] = await Promise.all([familyMe(), getPendingApprovals(), getLatestLocation()]);
    setContact(c);
    setPending(p);
    if (loc.location?.gps_lat && loc.location?.gps_lng) {
      setLocation({ lat: parseFloat(loc.location.gps_lat), lng: parseFloat(loc.location.gps_lng) });
    }
    if (loc.threshold?.safe_radius_m) {
      setSafeRadius(loc.threshold.safe_radius_m);
    }
    setAddress(loc.address);
    setSince(loc.since);
  }, []);

  useEffect(() => {
    loadData().finally(() => setLoading(false));
  }, [loadData]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }

  async function handleLogout() {
    try {
      await familyLogout();
    } catch {
      // token pode já estar inválido no servidor — segue o logout local mesmo assim
    }
    onLoggedOut();
  }

  async function handleMedication(med: Medication, approve: boolean) {
    try {
      await (approve ? approveMedication(med.uuid) : rejectMedication(med.uuid));
      await loadData();
    } catch {
      Alert.alert('Erro', 'Não foi possível processar a solicitação.');
    }
  }

  async function handleAppointment(appt: Appointment, approve: boolean) {
    try {
      await (approve ? approveAppointment(appt.uuid) : rejectAppointment(appt.uuid));
      await loadData();
    } catch {
      Alert.alert('Erro', 'Não foi possível processar a solicitação.');
    }
  }

  async function handleGeofence(approve: boolean) {
    try {
      await (approve ? approveGeofence() : rejectGeofence());
      await loadData();
    } catch {
      Alert.alert('Erro', 'Não foi possível processar a solicitação.');
    }
  }

  async function handleRequestCamera() {
    if (!contact) return;
    setRequestingCamera(true);
    try {
      await requestCamera();
      onOpenCamera(contact.patient.id, contact.patient.name);
    } catch {
      Alert.alert('Erro', 'Não foi possível solicitar a câmera agora.');
    } finally {
      setRequestingCamera(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }

  const hasPending = pending.medications.length > 0 || pending.appointments.length > 0 || !!pending.geofence;
  const pendingCount = pending.medications.length + pending.appointments.length + (pending.geofence ? 1 : 0);

  return (
    <View style={styles.screen}>
      {location ? (
        <WebView
          style={styles.map}
          originWhitelist={['*']}
          source={{ html: buildMapHtml(location.lat, location.lng, safeRadius, contact?.patient.name ?? '', contact?.patient.photo_url ?? null) }}
        />
      ) : (
        <View style={[styles.map, styles.noLocation]}>
          <Text style={styles.muted}>Ainda sem localização registrada.</Text>
        </View>
      )}

      <View style={[styles.headerBar, { paddingTop: Math.max(insets.top, spacing.sm) }]}>
        <TouchableOpacity style={styles.headerLeft} onPress={onOpenProfile} activeOpacity={0.75} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <View style={styles.headerLogoWrap}>
            <Image source={require('../../assets/logo.png')} style={styles.headerLogo} resizeMode="contain" />
          </View>
          <View style={styles.headerNames}>
            <Text style={styles.greeting}>{contact?.name}</Text>
            <Text style={styles.headerPatientName}>{contact?.patient.name}</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={handleRefresh} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }} disabled={refreshing}>
            {refreshing ? <ActivityIndicator color="#fff" /> : <Text style={styles.refreshIcon}>↻</Text>}
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.logout}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>

      {hasPending && (
        <TouchableOpacity
          style={[styles.pendingBadge, { top: Math.max(insets.top, spacing.sm) + 64 }]}
          onPress={() => setPendingModalOpen(true)}
          activeOpacity={0.8}
        >
          <Text style={styles.pendingBadgeIcon}>🔔</Text>
          <View style={styles.pendingBadgeCount}>
            <Text style={styles.pendingBadgeCountText}>{pendingCount}</Text>
          </View>
        </TouchableOpacity>
      )}

      <View style={[styles.statusCard, { bottom: insets.bottom + 96 }]}>
        {contact?.patient.photo_url ? (
          <Image source={{ uri: contact.patient.photo_url }} style={styles.statusPhoto} />
        ) : (
          <View style={[styles.statusPhoto, styles.statusPhotoPlaceholder]}>
            <Text style={styles.statusPhotoInitial}>{contact?.patient.name?.[0] ?? '?'}</Text>
          </View>
        )}
        <View style={styles.statusInfo}>
          <Text style={styles.statusName}>{contact?.patient.name}</Text>
          <Text style={styles.statusAddress} numberOfLines={1}>
            {address ?? (location ? 'Localização não identificada' : 'Sem localização')}
          </Text>
          {since && <Text style={styles.statusSince}>{formatSince(since)}</Text>}
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.sm) }]}>
        <TouchableOpacity style={styles.footerItem} onPress={onOpenAlerts} activeOpacity={0.75}>
          <Text style={styles.footerIcon}>🚨</Text>
          <Text style={styles.footerLabel}>Alertas</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerItem} onPress={onOpenMedications} activeOpacity={0.75}>
          <Text style={styles.footerIcon}>💊</Text>
          <Text style={styles.footerLabel}>Remédios</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerItem} onPress={handleRequestCamera} activeOpacity={0.75} disabled={requestingCamera}>
          {requestingCamera ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.footerIcon}>📹</Text>
              <Text style={styles.footerLabel}>Câmera</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerItem} onPress={onOpenAddExam} activeOpacity={0.75}>
          <Text style={styles.footerIcon}>📄</Text>
          <Text style={styles.footerLabel}>Documento</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.footerItem} onPress={onOpenAddAppointment} activeOpacity={0.75}>
          <Text style={styles.footerIcon}>🗓️</Text>
          <Text style={styles.footerLabel}>Consulta</Text>
        </TouchableOpacity>
      </View>

      <Modal visible={pendingModalOpen} animationType="slide" transparent onRequestClose={() => setPendingModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.cardTitle}>Pendências para aprovar</Text>

            {pending.geofence && (
              <View style={styles.pendingRow}>
                <Text style={styles.pendingTitle}>📍 Nova localização de "minha casa"</Text>
                <Text style={styles.pendingDetail}>
                  {contact?.patient.name} solicitou definir a localização atual como área segura
                  {pending.geofence.pending_safe_radius_m ? ` (raio de ${pending.geofence.pending_safe_radius_m} m)` : ''}.
                </Text>
                <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.rejectButton} onPress={() => handleGeofence(false)}>
                    <Text style={styles.rejectButtonText}>Rejeitar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.approveButton} onPress={() => handleGeofence(true)}>
                    <Text style={styles.approveButtonText}>Aprovar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {pending.medications.map((med) => (
              <View key={med.uuid} style={styles.pendingRow}>
                <Text style={styles.pendingTitle}>💊 {med.name}</Text>
                <Text style={styles.pendingDetail}>
                  {med.dosage} • {med.schedule_times.join(', ')}
                </Text>
                <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.rejectButton} onPress={() => handleMedication(med, false)}>
                    <Text style={styles.rejectButtonText}>Rejeitar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.approveButton} onPress={() => handleMedication(med, true)}>
                    <Text style={styles.approveButtonText}>Aprovar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            {pending.appointments.map((appt) => (
              <View key={appt.uuid} style={styles.pendingRow}>
                <Text style={styles.pendingTitle}>🗓️ {appt.type}</Text>
                <Text style={styles.pendingDetail}>
                  {appt.appointment_date} às {appt.appointment_time}
                  {appt.professional ? ` • ${appt.professional}` : ''}
                </Text>
                <View style={styles.actionsRow}>
                  <TouchableOpacity style={styles.rejectButton} onPress={() => handleAppointment(appt, false)}>
                    <Text style={styles.rejectButtonText}>Rejeitar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.approveButton} onPress={() => handleAppointment(appt, true)}>
                    <Text style={styles.approveButtonText}>Aprovar</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}

            <TouchableOpacity style={styles.modalCloseButton} onPress={() => setPendingModalOpen(false)}>
              <Text style={styles.modalCloseButtonText}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.blueSurface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueSurface },
  map: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  noLocation: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueSurface },
  muted: { fontSize: typography.label, color: colors.muted },
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(11,41,71,0.85)',
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexShrink: 1 },
  headerLogoWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: { width: 22, height: 22 },
  headerNames: { flexShrink: 1 },
  greeting: { fontSize: typography.subtitle, fontWeight: '700', color: '#fff', flexShrink: 1 },
  headerPatientName: { fontSize: 13, color: '#fff', opacity: 0.85, marginTop: 1, flexShrink: 1 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  refreshIcon: { fontSize: 22, color: '#fff', fontWeight: '700' },
  logout: { fontSize: typography.label, color: '#fff', fontWeight: '700', opacity: 0.9 },
  pendingBadge: {
    position: 'absolute',
    right: spacing.lg,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  pendingBadgeIcon: { fontSize: 22 },
  pendingBadgeCount: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  pendingBadgeCountText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  statusCard: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: spacing.md,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 5,
  },
  statusPhoto: { width: 56, height: 56, borderRadius: 28 },
  statusPhotoPlaceholder: { backgroundColor: colors.blueDim, alignItems: 'center', justifyContent: 'center' },
  statusPhotoInitial: { fontSize: 22, fontWeight: '700', color: colors.blueDark },
  statusInfo: { flex: 1 },
  statusName: { fontSize: typography.subtitle, fontWeight: '700', color: colors.text },
  statusAddress: { fontSize: 14, color: colors.muted, marginTop: 2 },
  statusSince: { fontSize: 13, color: colors.hint, marginTop: 2, fontWeight: '600' },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    backgroundColor: 'rgba(11,41,71,0.85)',
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    gap: spacing.sm,
  },
  footerItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
  },
  footerIcon: { fontSize: 22 },
  footerLabel: { fontSize: 13, fontWeight: '700', color: '#fff', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.border,
    alignSelf: 'center',
    marginBottom: spacing.md,
  },
  cardTitle: { fontSize: typography.subtitle, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  pendingRow: {
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pendingTitle: { fontSize: typography.label, fontWeight: '700', color: colors.text },
  pendingDetail: { fontSize: 14, color: colors.muted, marginTop: 2, marginBottom: spacing.sm },
  actionsRow: { flexDirection: 'row', gap: spacing.sm },
  approveButton: {
    flex: 1,
    backgroundColor: colors.teal,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    alignItems: 'center',
  },
  approveButtonText: { color: '#fff', fontWeight: '700' },
  rejectButton: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.red,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    alignItems: 'center',
  },
  rejectButtonText: { color: colors.red, fontWeight: '700' },
  modalCloseButton: {
    marginTop: spacing.md,
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  modalCloseButtonText: { color: colors.muted, fontWeight: '700' },
});
