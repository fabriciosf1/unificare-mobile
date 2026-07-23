import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import InCallManager from 'react-native-incall-manager';
import {
  mediaDevices,
  MediaStream,
  RTCIceCandidate,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCView,
} from 'react-native-webrtc';
import type Pusher from 'pusher-js';
import { cameraService } from '../services/camera.service';
import { subscribeCameraChannel, unsubscribeCameraChannel } from '../services/realtime';
import { respondToAlert } from '../services/family.service';
import { colors, spacing, typography, buttonHeight } from '../theme';

type ConnState = 'requesting' | 'waiting' | 'connected' | 'failed' | 'ended_by_patient';

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

// Assiste ao vídeo ao vivo do paciente vinculado — aberto ao tocar na notificação de SOS.
export default function WatchSosScreen({
  patientId,
  patientName,
  alertUuid,
  onClose,
}: {
  patientId: number;
  patientName: string;
  alertUuid?: string;
  onClose: () => void;
}) {
  const [connState, setConnState] = useState<ConnState>('requesting');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [responding, setResponding] = useState(false);
  const insets = useSafeAreaInsets();
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const cleanup = useCallback(() => {
    if (retryTimerRef.current) {
      clearInterval(retryTimerRef.current);
      retryTimerRef.current = null;
    }
    pcRef.current?.close();
    pcRef.current = null;
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micStreamRef.current = null;
    if (pusherRef.current) {
      unsubscribeCameraChannel(pusherRef.current, patientId);
      pusherRef.current = null;
    }
  }, [patientId]);

  useEffect(() => {
    // Impede a tela de bloquear enquanto assiste — no lock, o SO suspende a conexão
    // e o vídeo trava congelado (preto) mesmo depois de desbloquear.
    activateKeepAwakeAsync('watch-sos').catch(() => {});
    // Sem o InCallManager o áudio do WebRTC sai pelo volume de mídia (baixo, sem ganho de
    // chamada) em vez do volume/roteamento de chamada de voz — força o modo de chamada
    // com o alto-falante ligado (média 'video' já ativa o speaker por padrão).
    InCallManager.start({ media: 'video' });
    InCallManager.setSpeakerphoneOn(true);
    return () => {
      deactivateKeepAwake('watch-sos').catch(() => {});
      InCallManager.stop();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
     try {
      // Microfone da família — sem isso a chamada é só monitoramento, sem conversa dos dois lados.
      let micStream: MediaStream | null = null;
      try {
        micStream = await mediaDevices.getUserMedia({ audio: true }) as unknown as MediaStream;
      } catch {
        // Segue sem áudio próprio se a permissão for negada — ainda assim assiste ao vídeo/áudio do paciente.
      }
      if (cancelled) {
        micStream?.getTracks().forEach((t) => t.stop());
        return;
      }
      micStreamRef.current = micStream;

      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      pc.addTransceiver('video', { direction: 'recvonly' });
      micStream?.getTracks().forEach((track) => pc.addTrack(track, micStream as MediaStream));

      pc.ontrack = (event: { streams: MediaStream[] }) => {
        if (event.streams[0]) {
          setRemoteStream(event.streams[0]);
          setConnState('connected');
        }
      };

      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        if (state === 'failed' || state === 'disconnected') setConnState('failed');
      };

      const { pusher, channel } = subscribeCameraChannel(patientId);
      pusherRef.current = pusher;

      let answered = false;

      channel.bind('camera.answer', async (e: { session_id: string; sdp: RTCSessionDescriptionInit }) => {
        answered = true;
        if (retryTimerRef.current) {
          clearInterval(retryTimerRef.current);
          retryTimerRef.current = null;
        }
        try {
          await pc.setRemoteDescription(new RTCSessionDescription({ sdp: e.sdp.sdp ?? '', type: e.sdp.type }));
        } catch {}
      });

      channel.bind('camera.ice', async (e: { session_id: string; candidate: RTCIceCandidateInit; from: string }) => {
        if (e.from === 'operator') return;
        try {
          await pc.addIceCandidate(new RTCIceCandidate(e.candidate));
        } catch {}
      });

      // Paciente encerrou a chamada do lado dele — sem isso o ICE simplesmente cai e a tela
      // mostra "Conexão perdida ou recusada", dando a entender falha técnica em vez de ação do idoso.
      channel.bind('camera.hangup', (e: { from: string }) => {
        if (e.from !== 'patient') return;
        answered = true;
        if (retryTimerRef.current) {
          clearInterval(retryTimerRef.current);
          retryTimerRef.current = null;
        }
        if (!cancelled) setConnState('ended_by_patient');
      });

      const gatheredCandidates: RTCIceCandidate[] = [];
      let sid: string | null = null;

      pc.onicecandidate = (event: { candidate: RTCIceCandidate | null }) => {
        if (!event.candidate) return;
        gatheredCandidates.push(event.candidate);
        if (sid) cameraService.sendFamilyIce(sid, event.candidate.toJSON());
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (cancelled) return;

      // O app do paciente pode ainda não ter recebido o push nem se inscrito no canal quando a
      // primeira offer chega (o canal não faz replay de eventos passados). Reenviamos a mesma
      // offer periodicamente até a answer chegar, o que resolve essa corrida sem precisar de um
      // handshake extra — o app do paciente ignora as ofertas repetidas depois de aceitar a 1ª.
      const sendOffer = async () => {
        try {
          const { session_id } = await cameraService.sendFamilyOffer(offer);
          sid = session_id;
          gatheredCandidates.forEach((candidate) => {
            cameraService.sendFamilyIce(session_id, candidate.toJSON());
          });
        } catch {}
      };

      await sendOffer();
      if (!cancelled) setConnState('waiting');

      let attempts = 1;
      retryTimerRef.current = setInterval(() => {
        if (answered || attempts >= 5) {
          if (retryTimerRef.current) {
            clearInterval(retryTimerRef.current);
            retryTimerRef.current = null;
          }
          if (!answered && !cancelled) setConnState('failed');
          return;
        }
        attempts += 1;
        sendOffer();
      }, 2500);
     } catch {
       if (!cancelled) setConnState('failed');
     }
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [patientId, cleanup]);

  function handleClose() {
    // Best-effort: avisa o paciente que foi a família quem encerrou, não uma falha de rede.
    if (connState !== 'ended_by_patient') cameraService.sendFamilyHangup().catch(() => {});
    cleanup();
    onClose();
  }

  // Confirma o desfecho do SOS pro operador — puramente informativo, não resolve o alerta
  // (só o operador decide isso via Urgent.tsx). Best-effort: fecha mesmo se a rede falhar.
  async function handleRespond(response: 'ok' | 'help') {
    if (!alertUuid || responding) return;
    setResponding(true);
    if (connState !== 'ended_by_patient') cameraService.sendFamilyHangup().catch(() => {});
    try {
      await respondToAlert(alertUuid, response);
    } catch {
      // best-effort
    } finally {
      cleanup();
      onClose();
    }
  }

  return (
    <View style={styles.container}>
      {remoteStream ? (
        <RTCView streamURL={remoteStream.toURL()} style={styles.video} objectFit="cover" />
      ) : (
        <View style={styles.placeholder}>
          <Text style={styles.placeholderIcon}>📹</Text>
          <Text style={styles.placeholderText}>
            {connState === 'requesting' && 'Conectando...'}
            {connState === 'waiting' && `Aguardando o vídeo de ${patientName}...`}
            {connState === 'failed' && 'Conexão perdida ou recusada.'}
            {connState === 'ended_by_patient' && `${patientName} encerrou a chamada.`}
          </Text>
        </View>
      )}

      <View style={[styles.overlay, { paddingBottom: spacing.lg + insets.bottom }]}>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.dot,
              connState === 'connected' && styles.dotGreen,
              connState === 'waiting' && styles.dotYellow,
              connState === 'failed' && styles.dotRed,
            ]}
          />
          <Text style={styles.statusText}>{patientName} — SOS ao vivo</Text>
        </View>

        {alertUuid ? (
          <View style={styles.responseRow}>
            <TouchableOpacity
              style={[styles.closeButton, styles.responseButton, styles.okButton]}
              onPress={() => handleRespond('ok')}
              disabled={responding}
              activeOpacity={0.85}
            >
              <Text style={styles.closeButtonText}>✅ Está tudo bem</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.closeButton, styles.responseButton, styles.helpButton]}
              onPress={() => handleRespond('help')}
              disabled={responding}
              activeOpacity={0.85}
            >
              <Text style={styles.closeButtonText}>⚠️ Precisa de ajuda</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.85}>
            <Text style={styles.closeButtonText}>Fechar</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  video: { flex: 1 },
  placeholder: { flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  placeholderIcon: { fontSize: 48, marginBottom: spacing.md },
  placeholderText: { color: '#fff', fontSize: typography.label, textAlign: 'center' },
  overlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  statusRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.hint, marginRight: spacing.sm },
  dotGreen: { backgroundColor: colors.green },
  dotYellow: { backgroundColor: colors.yellow },
  dotRed: { backgroundColor: colors.red },
  statusText: { color: '#fff', fontSize: typography.label, fontWeight: '600', flexShrink: 1 },
  closeButton: {
    height: buttonHeight,
    borderRadius: 12,
    backgroundColor: colors.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: { color: '#fff', fontWeight: '700', fontSize: typography.label },
  responseRow: { flexDirection: 'row', gap: spacing.sm },
  responseButton: { flex: 1 },
  okButton: { backgroundColor: colors.green },
  helpButton: { backgroundColor: colors.red },
});
