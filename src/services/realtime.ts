import PusherModule, { type Channel } from 'pusher-js';
import { REVERB_HOST, REVERB_KEY, REVERB_PORT, REVERB_SCHEME } from '../config';

type Pusher = InstanceType<typeof PusherModule>;
// Interop do bundle RN: o default import às vezes resolve pro namespace inteiro
// ({ Pusher: [Function] }) em vez da classe — cai no `.Pusher` quando isso acontece.
const Pusher: typeof PusherModule = (PusherModule as any).Pusher ?? PusherModule;

// Canal público `camera.{patientId}` do Reverb — mesmo protocolo Pusher usado pelo laravel-echo
// na web, sem necessidade de auth (não é PrivateChannel).
export function subscribeCameraChannel(patientId: number): { pusher: Pusher; channel: Channel } {
  const pusher = new Pusher(REVERB_KEY, {
    cluster: '',
    wsHost: REVERB_HOST,
    wsPort: REVERB_PORT,
    wssPort: REVERB_PORT,
    forceTLS: REVERB_SCHEME === 'https',
    enabledTransports: ['ws', 'wss'],
    disableStats: true,
  });

  const channel = pusher.subscribe(`camera.${patientId}`);

  return { pusher, channel };
}

export function unsubscribeCameraChannel(pusher: Pusher, patientId: number): void {
  pusher.unsubscribe(`camera.${patientId}`);
  pusher.disconnect();
}
