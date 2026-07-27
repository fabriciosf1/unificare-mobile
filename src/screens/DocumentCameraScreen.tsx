import { useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../theme';

// Proporção A4 (210x297mm) para orientar o enquadramento do documento na foto.
const A4_RATIO = 210 / 297;
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const FRAME_WIDTH = SCREEN_WIDTH * 0.82;
const FRAME_HEIGHT = FRAME_WIDTH / A4_RATIO;

interface Props {
  onCancel: () => void;
  onCaptured: (uri: string) => void;
  accentColor?: string;
}

export default function DocumentCameraScreen({ onCancel, onCaptured, accentColor = colors.green }: Props) {
  const insets = useSafeAreaInsets();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturing, setCapturing] = useState(false);

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.container, styles.permissionContainer]}>
        <Text style={styles.permissionText}>Precisamos de acesso à câmera para fotografar o documento.</Text>
        <TouchableOpacity style={[styles.permissionButton, { backgroundColor: accentColor }]} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Permitir câmera</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cancelLink} onPress={onCancel}>
          <Text style={styles.cancelLinkText}>Cancelar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  async function handleCapture() {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (photo?.uri) onCaptured(photo.uri);
    } finally {
      setCapturing(false);
    }
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.dim} />
        <View style={styles.frameRow}>
          <View style={styles.dim} />
          <View style={[styles.frame, { width: FRAME_WIDTH, height: FRAME_HEIGHT, borderColor: accentColor }]} />
          <View style={styles.dim} />
        </View>
        <View style={styles.dim} />
      </View>

      <Text style={[styles.hint, { top: insets.top + spacing.lg }]}>Encaixe o documento (A4) dentro da moldura</Text>

      <View style={[styles.controls, { paddingBottom: insets.bottom + spacing.lg }]}>
        <TouchableOpacity style={styles.cancelButton} onPress={onCancel} disabled={capturing}>
          <Text style={styles.cancelButtonText}>Cancelar</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.shutter, { borderColor: accentColor }]} onPress={handleCapture} disabled={capturing}>
          {capturing ? <ActivityIndicator color={accentColor} /> : <View style={[styles.shutterInner, { backgroundColor: accentColor }]} />}
        </TouchableOpacity>
        <View style={styles.cancelButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFill, flexDirection: 'column' },
  dim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
  frameRow: { flexDirection: 'row' },
  frame: { borderWidth: 3, borderRadius: 12, backgroundColor: 'transparent' },
  hint: {
    position: 'absolute',
    alignSelf: 'center',
    color: '#fff',
    fontSize: typography.label,
    fontWeight: '600',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
  },
  cancelButton: { width: 80, alignItems: 'center' },
  cancelButtonText: { color: '#fff', fontSize: typography.label, fontWeight: '600' },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  shutterInner: { width: 58, height: 58, borderRadius: 29 },
  permissionContainer: { alignItems: 'center', justifyContent: 'center', padding: spacing.lg, gap: spacing.md },
  permissionText: { color: '#fff', fontSize: typography.body, textAlign: 'center' },
  permissionButton: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderRadius: 12 },
  permissionButtonText: { color: '#fff', fontWeight: '700', fontSize: typography.label },
  cancelLink: { padding: spacing.sm },
  cancelLinkText: { color: colors.hint, fontSize: typography.label },
});
