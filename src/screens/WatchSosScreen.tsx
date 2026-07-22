import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
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

type ConnState = 'requesting' | 'waiting' | 'connected' | 'failed';

const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

// Assiste ao vídeo ao vivo do paciente vinculado — aberto ao tocar na notificação de SOS.
export default function WatchSosScreen({
  patientId,
  patientName,
  onClose,
}: {
  patientId: number;
  patientName: string;
  onClose: () => void;
}) {
  const [connState, setConnState] = useState<ConnState>('requesting');
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const pusherRef = useRef<Pusher | null>(null);

  const cleanup = useCallback(() => {
    pcRef.current?.close();
    pcRef.current = null;
    if (pusherRef.current) {
      unsubscribeCameraChannel(pusherRef.current, patientId);
      pusherRef.current = null;
    }
  }, [patientId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
     try {
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });

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

      channel.bind('camera.answer', async (e: { session_id: string; sdp: RTCSessionDescriptionInit }) => {
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

      const pendingCandidates: RTCIceCandidate[] = [];
      let sid: string | null = null;

      pc.onicecandidate = (event: { candidate: RTCIceCandidate | null }) => {
        if (!event.candidate) return;
        if (!sid) {
          pendingCandidates.push(event.candidate);
          return;
        }
        cameraService.sendFamilyIce(sid, event.candidate.toJSON());
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      if (cancelled) return;

      const { session_id } = await cameraService.sendFamilyOffer(offer);
      sid = session_id;

      pendingCandidates.splice(0).forEach((candidate) => {
        cameraService.sendFamilyIce(sid as string, candidate.toJSON());
      });

      if (!cancelled) setConnState('waiting');
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
    cleanup();
    onClose();
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
          </Text>
        </View>
      )}

      <View style={styles.overlay}>
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

        <TouchableOpacity style={styles.closeButton} onPress={handleClose} activeOpacity={0.85}>
          <Text style={styles.closeButtonText}>Fechar</Text>
        </TouchableOpacity>
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
});
