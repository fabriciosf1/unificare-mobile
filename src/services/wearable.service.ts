import { Platform } from 'react-native';
import { sendWearableVital } from './patient.service';

// Health Connect (Android) e HealthKit (iOS) só expõem leitura sob demanda com o app aberto —
// diferente do GPS (location.service.ts), não há API de streaming/background contínuo pra
// esses dados nas libs disponíveis. Sync é por polling em foreground.
const SYNC_INTERVAL_MS = 10 * 60 * 1000;

let syncTimer: ReturnType<typeof setInterval> | null = null;

interface WearableSample {
  heart_rate?: number;
  spo2?: number;
  temperature?: number;
}

async function requestAndroidPermissions(): Promise<boolean> {
  const HealthConnect = await import('react-native-health-connect');
  const initialized = await HealthConnect.initialize();
  if (!initialized) return false;

  const granted = await HealthConnect.requestPermission([
    { accessType: 'read', recordType: 'HeartRate' },
    { accessType: 'read', recordType: 'OxygenSaturation' },
    { accessType: 'read', recordType: 'BodyTemperature' },
  ]);
  return granted.length > 0;
}

async function readAndroidSample(): Promise<WearableSample> {
  const HealthConnect = await import('react-native-health-connect');
  const since = new Date(Date.now() - SYNC_INTERVAL_MS).toISOString();
  const now = new Date().toISOString();
  const timeRangeFilter = { operator: 'between' as const, startTime: since, endTime: now };

  const sample: WearableSample = {};

  const heartRate = await HealthConnect.readRecords('HeartRate', { timeRangeFilter }).catch(() => null);
  const lastHeartRateSample = heartRate?.records.at(-1)?.samples.at(-1);
  if (lastHeartRateSample) sample.heart_rate = lastHeartRateSample.beatsPerMinute;

  const spo2 = await HealthConnect.readRecords('OxygenSaturation', { timeRangeFilter }).catch(() => null);
  const lastSpo2 = spo2?.records.at(-1);
  if (lastSpo2) sample.spo2 = lastSpo2.percentage;

  const temperature = await HealthConnect.readRecords('BodyTemperature', { timeRangeFilter }).catch(() => null);
  const lastTemperature = temperature?.records.at(-1);
  if (lastTemperature) sample.temperature = lastTemperature.temperature.value;

  return sample;
}

async function requestIosPermissions(): Promise<boolean> {
  const AppleHealthKit = (await import('react-native-health')).default;
  const permissions = {
    permissions: {
      read: [
        AppleHealthKit.Constants.Permissions.HeartRate,
        AppleHealthKit.Constants.Permissions.OxygenSaturation,
        AppleHealthKit.Constants.Permissions.BodyTemperature,
      ],
      write: [],
    },
  };

  return new Promise((resolve) => {
    AppleHealthKit.initHealthKit(permissions, (error: string) => resolve(!error));
  });
}

async function readIosSample(): Promise<WearableSample> {
  const AppleHealthKit = (await import('react-native-health')).default;
  const since = new Date(Date.now() - SYNC_INTERVAL_MS).toISOString();
  const options = { startDate: since, limit: 1, ascending: false };

  const sample: WearableSample = {};

  const heartRate = await new Promise<any[]>((resolve) =>
    AppleHealthKit.getHeartRateSamples(options, (err: string, results: any[]) => resolve(err ? [] : results)),
  );
  if (heartRate[0]) sample.heart_rate = Math.round(heartRate[0].value);

  const spo2 = await new Promise<any[]>((resolve) =>
    AppleHealthKit.getOxygenSaturationSamples(options, (err: string, results: any[]) => resolve(err ? [] : results)),
  );
  if (spo2[0]) sample.spo2 = Math.round(spo2[0].value * 100);

  const temperature = await new Promise<any[]>((resolve) =>
    AppleHealthKit.getBodyTemperatureSamples(options, (err: string, results: any[]) => resolve(err ? [] : results)),
  );
  if (temperature[0]) sample.temperature = temperature[0].value;

  return sample;
}

export async function requestWearablePermissions(): Promise<boolean> {
  try {
    return Platform.OS === 'android' ? await requestAndroidPermissions() : await requestIosPermissions();
  } catch {
    return false;
  }
}

async function readLatestSample(): Promise<WearableSample> {
  return Platform.OS === 'android' ? readAndroidSample() : readIosSample();
}

export async function syncWearableVitals(): Promise<void> {
  const sample = await readLatestSample().catch(() => ({}) as WearableSample);
  if (sample.heart_rate == null && sample.spo2 == null && sample.temperature == null) return;

  await sendWearableVital(sample).catch(() => {
    // best-effort — próxima sincronização tenta de novo
  });
}

export async function startWearableSync(): Promise<void> {
  if (Platform.OS === 'web') return;

  const granted = await requestWearablePermissions();
  if (!granted) return;

  if (syncTimer) return;

  await syncWearableVitals();
  syncTimer = setInterval(syncWearableVitals, SYNC_INTERVAL_MS);
}

export function stopWearableSync(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}
