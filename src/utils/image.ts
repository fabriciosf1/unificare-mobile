import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const MAX_DIMENSION = 1600;

// Fotos de câmera em resolução nativa (muitas vezes 4000px+) pesam demais pro upload/OCR
// sem ganho de legibilidade — reduzir pra um máximo razoável antes de enviar.
export async function resizeForUpload(uri: string): Promise<{ uri: string; name: string; mimeType: string }> {
  const result = await manipulateAsync(
    uri,
    [{ resize: { width: MAX_DIMENSION } }],
    { compress: 0.8, format: SaveFormat.JPEG },
  );
  return { uri: result.uri, name: 'exam.jpg', mimeType: 'image/jpeg' };
}
