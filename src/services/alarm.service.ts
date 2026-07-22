import { DeviceEventEmitter } from 'react-native';
import notifee, {
  AlarmType,
  AndroidCategory,
  AndroidImportance,
  AndroidNotificationSetting,
  AndroidVisibility,
  EventDetail,
  EventType,
  TriggerType,
} from 'react-native-notify-kit';
import type { Medication } from '../types';
import { logMedication } from './patient.service';

const CHANNEL_ID = 'medication-alarm';
const ALARM_ID_PREFIX = 'med-';

/** Emitido quando a ação "Tomei" da notificação é confirmada com o app já aberto —
 * handleAlarmAction roda fora da árvore React (onForegroundEvent), sem outra forma
 * de avisar uma tela montada para recarregar. HomeScreen escuta este evento. */
export const MEDICATION_TAKEN_EVENT = 'medication-taken';

function alarmId(medicationId: number, doseTime: string): string {
  return `${ALARM_ID_PREFIX}${medicationId}-${doseTime}`;
}

export async function initAlarmChannel(): Promise<void> {
  await notifee.requestPermission();
  await notifee.createChannel({
    id: CHANNEL_ID,
    name: 'Alarme de remédio',
    importance: AndroidImportance.HIGH,
    sound: 'alarm_sound',
    vibration: true,
    bypassDnd: true,
    visibility: AndroidVisibility.PUBLIC,
  });
}

/** Retorna true se a permissão de alarme exato (Android 12+) ainda não foi concedida. */
export async function needsExactAlarmPermission(): Promise<boolean> {
  const settings = await notifee.getNotificationSettings();
  return settings.android.alarm === AndroidNotificationSetting.DISABLED;
}

export async function openAlarmPermissionSettings(): Promise<void> {
  await notifee.openAlarmPermissionSettings();
}

async function scheduleAlarm(medication: Medication, doseTime: string, scheduledAt: string, timestamp: number): Promise<void> {
  await notifee.createTriggerNotification(
    {
      id: alarmId(medication.id, doseTime),
      title: `Hora do remédio — ${medication.name}`,
      body: `${medication.dosage} às ${doseTime}`,
      data: {
        medicationId: String(medication.id),
        medicationName: medication.name,
        dosage: medication.dosage,
        doseTime,
        scheduledAt,
      },
      android: {
        channelId: CHANNEL_ID,
        category: AndroidCategory.ALARM,
        ongoing: true,
        autoCancel: false,
        loopSound: true,
        fullScreenAction: {
          id: 'default',
          launchActivity: 'default',
        },
        pressAction: {
          id: 'default',
          launchActivity: 'default',
        },
        actions: [
          { title: 'Tomei', pressAction: { id: 'taken' } },
          { title: 'Adiar 10 min', pressAction: { id: 'snooze' } },
        ],
      },
    },
    {
      type: TriggerType.TIMESTAMP,
      timestamp,
      alarmManager: {
        type: AlarmType.SET_ALARM_CLOCK,
      },
    },
  );
}

/** Cancela e recria todos os alarmes de remédio — mais simples e robusto que diffing. */
export async function syncMedicationAlarms(medications: Medication[]): Promise<void> {
  // getTriggerNotificationIds só cobre alarmes ainda não disparados — um alarme já tocado
  // vira notificação "ongoing" exibida, não sendo mais listado ali. Sem cancelar por essa
  // segunda via também, o card confirmado como "Tomei" pelo app deixava a notificação presa.
  const [triggerIds, displayed] = await Promise.all([
    notifee.getTriggerNotificationIds(),
    notifee.getDisplayedNotifications(),
  ]);
  const displayedIds = displayed.map((n) => n.notification.id).filter((id): id is string => !!id);
  const previousMedAlarms = [...new Set([...triggerIds, ...displayedIds])].filter((id) =>
    id.startsWith(ALARM_ID_PREFIX),
  );
  await Promise.all(previousMedAlarms.map((id) => notifee.cancelNotification(id)));

  const now = Date.now();

  for (const medication of medications) {
    if (medication.approval_status === 'pending') continue;

    for (const dose of medication.today_doses) {
      if (dose.status !== 'pending') continue;

      const scheduledTime = new Date(dose.scheduled_at).getTime();
      const timestamp = scheduledTime > now ? scheduledTime : now + 5000;

      await scheduleAlarm(medication, dose.time, dose.scheduled_at, timestamp);
    }
  }
}

export async function cancelMedicationAlarm(medicationId: number, doseTime: string): Promise<void> {
  await notifee.cancelNotification(alarmId(medicationId, doseTime));
}

export async function snoozeMedicationAlarm(
  medication: Medication,
  doseTime: string,
  scheduledAt: string,
): Promise<void> {
  await scheduleAlarm(medication, doseTime, scheduledAt, Date.now() + 10 * 60 * 1000);
}

export async function handleAlarmAction(
  type: EventType,
  detail: EventDetail,
): Promise<void> {
  const pressActionId = detail.pressAction?.id;
  const data = detail.notification?.data as
    | { medicationId?: string; medicationName?: string; dosage?: string; doseTime?: string; scheduledAt?: string }
    | undefined;
  if (!data?.medicationId || !data.doseTime || !data.scheduledAt) return;

  const medicationId = Number(data.medicationId);

  if (type === EventType.ACTION_PRESS && pressActionId === 'taken') {
    try {
      await logMedication(medicationId, data.scheduledAt);
    } catch {
      // best-effort — sem internet, ainda cancela o alarme local para não ficar preso tocando
    }
    await cancelMedicationAlarm(medicationId, data.doseTime);
    DeviceEventEmitter.emit(MEDICATION_TAKEN_EVENT);
    return;
  }

  if (type === EventType.ACTION_PRESS && pressActionId === 'snooze') {
    await snoozeMedicationAlarm(
      {
        id: medicationId,
        name: data.medicationName ?? '',
        dosage: data.dosage ?? '',
      } as Medication,
      data.doseTime,
      data.scheduledAt,
    );
  }
}
