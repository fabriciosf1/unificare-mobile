import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
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
} from '../services/family.service';
import type { Appointment, FamilyContact, Medication, PendingApprovals } from '../types';
import { colors, spacing, typography } from '../theme';

function buildMapHtml(lat: number, lng: number, radius: number, name: string): string {
  const safeName = name.replace(/</g, '&lt;').replace(/'/g, '&#39;');
  return `<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>html,body,#map{height:100%;margin:0;padding:0;}</style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    const map = L.map('map').setView([${lat}, ${lng}], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);
    L.marker([${lat}, ${lng}]).addTo(map).bindPopup('${safeName}');
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

export default function FamilyHomeScreen({ onLoggedOut }: { onLoggedOut: () => void }) {
  const [contact, setContact] = useState<FamilyContact | null>(null);
  const [pending, setPending] = useState<PendingApprovals>({ medications: [], appointments: [] });
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [safeRadius, setSafeRadius] = useState(500);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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
    await familyLogout();
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

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.teal} />
      </View>
    );
  }

  const hasPending = pending.medications.length > 0 || pending.appointments.length > 0 || !!pending.geofence;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>{contact?.patient.name}</Text>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logout}>Sair</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Localização</Text>
        {location ? (
          <WebView
            style={styles.map}
            originWhitelist={['*']}
            source={{ html: buildMapHtml(location.lat, location.lng, safeRadius, contact?.patient.name ?? '') }}
          />
        ) : (
          <Text style={styles.muted}>Ainda sem localização registrada.</Text>
        )}
      </View>

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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  content: { padding: spacing.lg, paddingBottom: spacing.xl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  greeting: { fontSize: typography.title, fontWeight: '700', color: colors.text },
  logout: { fontSize: typography.label, color: colors.muted, fontWeight: '600' },
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
  map: { width: '100%', height: 220, borderRadius: 12 },
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
