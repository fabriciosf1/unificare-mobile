import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { sendGpsPing } from './patient.service';

const LOCATION_TASK_NAME = 'unifcare-background-location';

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) return;

  const { locations } = (data as { locations: Location.LocationObject[] }) ?? { locations: [] };
  const last = locations?.[locations.length - 1];
  if (!last) return;

  try {
    await sendGpsPing(last.coords.latitude, last.coords.longitude);
  } catch {
    // best-effort — próximo ping tenta de novo
  }
});

export async function startBackgroundLocation(): Promise<void> {
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') return;

  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
  if (bgStatus !== 'granted') return;

  const alreadyRunning = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
  if (alreadyRunning) return;

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.Balanced,
    timeInterval: 3 * 60 * 1000,
    distanceInterval: 50,
    showsBackgroundLocationIndicator: true,
    foregroundService: {
      notificationTitle: 'UnifCare — monitoramento ativo',
      notificationBody: 'Compartilhando sua localização para sua segurança.',
    },
    pausesUpdatesAutomatically: false,
  });
}

export async function stopBackgroundLocation(): Promise<void> {
  const running = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
  if (running) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
}

export async function getCurrentPosition(): Promise<Location.LocationObjectCoords> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('Permissão de localização negada.');
  }
  const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  return position.coords;
}
