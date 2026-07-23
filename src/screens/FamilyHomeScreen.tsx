import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView } from 'react-native-webview';
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
  const [safeRadius, setSafeRadius] = useState(500);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [requestingCamera, setRequestingCamera] = useState(false);

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

  return (
    <View style={styles.screen}>
      <View style={styles.statusBarSpacer} />
      <View style={styles.headerBar}>
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
          <TouchableOpacity onPress={handleLogout} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.logout}>Sair</Text>
          </TouchableOpacity>
        </View>
      </View>

    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <Text style={styles.mapSectionTitle}>Localização</Text>
      {location ? (
        <WebView
          style={styles.map}
          originWhitelist={['*']}
          source={{ html: buildMapHtml(location.lat, location.lng, safeRadius, contact?.patient.name ?? '', contact?.patient.photo_url ?? null) }}
        />
      ) : (
        <View style={styles.card}>
          <Text style={styles.muted}>Ainda sem localização registrada.</Text>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Pendências para aprovar</Text>
        {!hasPending && <Text style={styles.muted}>Nenhuma pendência no momento.</Text>}

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
      </View>
    </ScrollView>

      <View style={styles.footer}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.blueSurface },
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.blueSurface },
  footer: {
    flexDirection: 'row',
    backgroundColor: colors.blueDark,
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingBottom: (Platform.OS === 'ios' ? spacing.lg : spacing.sm),
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
  statusBarSpacer: {
    height: Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 54,
    backgroundColor: colors.blueDarker,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.blueDark,
    paddingTop: spacing.md,
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
  logout: { fontSize: typography.label, color: '#fff', fontWeight: '700', opacity: 0.9 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    borderColor: colors.border,
    borderWidth: 1,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardTitle: { fontSize: typography.subtitle, fontWeight: '700', color: colors.text, marginBottom: spacing.sm },
  muted: { fontSize: typography.label, color: colors.muted },
  mapSectionTitle: {
    fontSize: typography.subtitle,
    fontWeight: '700',
    color: colors.text,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  map: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.5,
    marginHorizontal: -spacing.lg,
    marginBottom: spacing.md,
  },
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
});
