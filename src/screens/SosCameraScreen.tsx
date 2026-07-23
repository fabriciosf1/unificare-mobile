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
import { colors, spacing, typography, buttonHeight } from '../theme';

type ConnState = 'starting' | 'camera_on' | 'waiting_offer' | 'connected' | 'failed';

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

// Transmite a própria câmera do paciente ao vivo — aberto automaticamente após o SOS.
export default function SosCameraScreen({ patientId, onClose }: { patientId: number; onClose: () => void }) {
  const [connState, setConnState] = useState<ConnState>('starting');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const insets = useSafeAreaInsets();
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pusherRef = useRef<Pusher | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (pusherRef.current) {
      unsubscribeCameraChannel(pusherRef.current, patientId);
      pusherRef.current = null;
    }
  }, [patientId]);

  useEffect(() => {
    // Sem isso o Android bloqueia a tela durante a transmissão e o SO mata o acesso
    // à câmera em background — ao desbloquear, o vídeo fica congelado/preto.
    activateKeepAwakeAsync('sos-camera').catch(() => {});
    // Sem o InCallManager o áudio do WebRTC sai pelo volume de mídia (baixo, sem ganho de
    // chamada) em vez do volume/roteamento de chamada de voz — força o modo de chamada
    // com o alto-falante ligado (média 'video' já ativa o speaker por padrão).
    InCallManager.start({ media: 'video' });
    InCallManager.setSpeakerphoneOn(true);
    return () => {
      deactivateKeepAwake('sos-camera').catch(() => {});
      InCallManager.stop();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      let stream: MediaStream;
      try {
        stream = await mediaDevices.getUserMedia({ video: true, audio: true }) as unknown as MediaStream;
      } catch {
        if (!cancelled) setConnState('failed');
        return;
      }
      if (cancelled) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      setLocalStream(stream);
      setConnState('camera_on');

      let pusher, channel;
      try {
        ({ pusher, channel } = subscribeCameraChannel(patientId));
      } catch {
        if (!cancelled) setConnState('failed');
        return;
      }
      pusherRef.current = pusher;

      channel.bind('camera.offer', async (e: { session_id: string; sdp: RTCSessionDescriptionInit }) => {
        // A família reenvia a offer (retry) até receber a answer, pois pode chegar antes de nos
        // inscrevermos no canal. Uma vez que já criamos a conexão, ignoramos os reenvios redundantes.
        if (pcRef.current) return;

        sessionIdRef.current = e.session_id;
        setConnState('waiting_offer');

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        pcRef.current = pc;

        stream.getTracks().forEach((track) => pc.addTrack(track, stream));

        // Áudio de volta da família (ela também envia o próprio microfone) — o react-native-webrtc
        // já roteia a track remota pro alto-falante nativo assim que chega, sem precisar de player.
        pc.ontrack = () => {};

        pc.onicecandidate = (event: { candidate: RTCIceCandidate | null }) => {
          if (!event.candidate || !sessionIdRef.current) return;
          cameraService.sendMyIce(sessionIdRef.current, event.candidate.toJSON());
        };

        pc.oniceconnectionstatechange = () => {
          const state = pc.iceConnectionState;
          if (state === 'connected' || state === 'completed') setConnState('connected');
          if (state === 'failed' || state === 'disconnected') setConnState('failed');
        };

        try {
          await pc.setRemoteDescription(new RTCSessionDescription({ sdp: e.sdp.sdp ?? '', type: e.sdp.type }));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          await cameraService.sendMyAnswer(e.session_id, answer);
        } catch {
          setConnState('failed');
        }
      });

      channel.bind('camera.ice', async (e: { session_id: string; candidate: RTCIceCandidateInit; from: string }) => {
        if (e.from === 'patient') return;
        if (e.session_id !== sessionIdRef.current) return;
        try {
          await pcRef.current?.addIceCandidate(new RTCIceCandidate(e.candidate));
        } catch {}
      });
    })();

    return () => {
      cancelled = true;
      cleanup();
    };
  }, [patientId, cleanup]);

  function handleClose() {
    cleanup();
    onClose();
  }

  return (
    <View style={styles.container}>
      {localStream ? (
        <RTCView streamURL={localStream.toURL()} style={styles.video} objectFit="cover" mirror />
      ) : (
        <View style={styles.placeholder} />
      )}

      <View style={[styles.overlay, { paddingBottom: spacing.lg + insets.bottom }]}>
        <View style={styles.statusRow}>
          <View
            style={[
              styles.dot,
              connState === 'connected' && styles.dotGreen,
              connState === 'waiting_offer' && styles.dotYellow,
              connState === 'failed' && styles.dotRed,
            ]}
          />
          <Text style={styles.statusText}>
            {connState === 'starting' && 'Ligando câmera...'}
            {connState === 'camera_on' && 'Transmitindo — aguardando sua família'}
            {connState === 'waiting_offer' && 'Conectando com sua família...'}
            {connState === 'connected' && 'Ao vivo — sua família está vendo'}
            {connState === 'failed' && 'Falha ao transmitir'}
          </Text>
        </View>

        <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.85}>
          <Text style={styles.closeButtonText}>Encerrar transmissão</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  video: { flex: 1 },
  placeholder: { flex: 1, backgroundColor: '#000' },
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
    backgroundColor: colors.red,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: { color: '#fff', fontWeight: '700', fontSize: typography.label },
});
