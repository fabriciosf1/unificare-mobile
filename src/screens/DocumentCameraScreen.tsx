import { useRef, useState } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, spacing, typography } from '../theme';

// Proporção A4 (210x297mm), só como guia — a moldura ocupa o máximo de espaço
// disponível na tela pra permitir fotografar de perto (documentos com muito
// texto ficam ilegíveis pra IA se o usuário precisar se afastar demais pra
// encaixar a folha inteira numa moldura pequena).
const A4_RATIO = 210 / 297;
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HINT_SPACE = 64;
const SHUTTER_SPACE = 76 + spacing.lg * 2;

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

  const topReserved = insets.top + HINT_SPACE;
  const bottomReserved = insets.bottom + SHUTTER_SPACE;
  const availableHeight = SCREEN_HEIGHT - topReserved - bottomReserved;
  const frameWidth = Math.min(SCREEN_WIDTH * 0.95, availableHeight * A4_RATIO);
  const frameHeight = frameWidth / A4_RATIO;
  const frameLeft = (SCREEN_WIDTH - frameWidth) / 2;
  const frameTop = topReserved + (availableHeight - frameHeight) / 2;

  async function handleCapture() {
    if (!cameraRef.current || capturing) return;
    setCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.9 });
      if (!photo?.uri) return;

      // CameraView preenche a tela em modo "cover": a foto capturada quase sempre
      // tem proporção diferente da tela (ex: sensor 4:3 numa tela 9:19.5), então
      // o preview mostra só um recorte central da foto. Convertemos a moldura
      // (em coordenadas de tela) para coordenadas da foto real replicando esse
      // recorte de "cover", em vez de assumir que a foto tem a proporção da tela.
      const coverScale = Math.max(SCREEN_WIDTH / photo.width, SCREEN_HEIGHT / photo.height);
      const offsetX = (photo.width * coverScale - SCREEN_WIDTH) / 2;
      const offsetY = (photo.height * coverScale - SCREEN_HEIGHT) / 2;

      const originX = Math.max(0, Math.round((frameLeft + offsetX) / coverScale));
      const originY = Math.max(0, Math.round((frameTop + offsetY) / coverScale));
      const width = Math.min(photo.width - originX, Math.round(frameWidth / coverScale));
      const height = Math.min(photo.height - originY, Math.round(frameHeight / coverScale));

      const cropped = await manipulateAsync(
        photo.uri,
        [{ crop: { originX, originY, width, height } }],
        { format: SaveFormat.JPEG },
      );
      onCaptured(cropped.uri);
    } finally {
      setCapturing(false);
    }
  }

  return (
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" />

      <View pointerEvents="none">
        <View style={[styles.dim, { top: 0, left: 0, right: 0, height: frameTop }]} />
        <View style={[styles.dim, { top: frameTop + frameHeight, left: 0, right: 0, height: SCREEN_HEIGHT - frameTop - frameHeight }]} />
        <View style={[styles.dim, { top: frameTop, left: 0, width: frameLeft, height: frameHeight }]} />
        <View style={[styles.dim, { top: frameTop, left: frameLeft + frameWidth, right: 0, height: frameHeight }]} />
        <View style={[styles.frame, { top: frameTop, left: frameLeft, width: frameWidth, height: frameHeight, borderColor: accentColor }]} />
      </View>

      <Text style={[styles.hint, { top: insets.top + spacing.lg }]}>Encaixe o documento na moldura, o mais próximo possível</Text>

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
  dim: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.55)' },
  frame: { position: 'absolute', borderWidth: 3, borderRadius: 12, backgroundColor: 'transparent' },
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
