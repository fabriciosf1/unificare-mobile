import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Platform } from 'react-native';
import { registerPushToken } from './patient.service';
import { registerFamilyPushToken } from './family.service';

export const CRITICAL_CHANNEL_ID = 'alertas-criticos';

/** Canal Android dedicado a SOS/pedido de câmera/remédio atrasado — importância máxima +
 * bypassDnd faz o aparelho vibrar/tocar mesmo com o modo silencioso ativado, igual um
 * alarme. Precisa existir ANTES do push chegar (o servidor só referencia o channelId).
 * Idempotente: seguro chamar em todo boot do app. */
export async function ensureCriticalAlertChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CRITICAL_CHANNEL_ID, {
    name: 'Alertas críticos (SOS)',
    importance: Notifications.AndroidImportance.MAX,
    sound: 'alarm_sound',
    vibrationPattern: [0, 500, 250, 500, 250, 500],
    enableVibrate: true,
    bypassDnd: true,
    lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
  });
}

async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  // Push remoto via expo-notifications foi removido do Expo Go a partir do SDK 53 — só funciona em dev build.
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return null;
  }

  const projectId = Constants.expoConfig?.extra?.eas?.projectId;
  if (!projectId) {
    console.warn('[push] extra.eas.projectId ausente no app.json — token de push não pode ser gerado.');
    return null;
  }

  try {
    const { data: expoPushToken } = await Notifications.getExpoPushTokenAsync({ projectId });
    return expoPushToken;
  } catch (error) {
    console.warn('[push] Falha ao obter o token de push Expo:', error);
    return null;
  }
}

export async function registerForPushNotifications(): Promise<void> {
  const token = await getExpoPushToken();
  if (!token) return;
  try {
    await registerPushToken(token, Platform.OS);
  } catch (error) {
    console.warn('[push] Falha ao registrar token de push (paciente) no servidor:', error);
  }
}

export async function registerForFamilyPushNotifications(): Promise<void> {
  const token = await getExpoPushToken();
  if (!token) return;
  try {
    await registerFamilyPushToken(token, Platform.OS);
  } catch (error) {
    console.warn('[push] Falha ao registrar token de push (família) no servidor:', error);
  }
}
