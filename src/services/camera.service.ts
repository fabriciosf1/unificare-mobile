import { api } from './api';

// Lado paciente (ability patient) — transmite a própria câmera no SOS.
export const cameraService = {
  sendMyAnswer(sessionId: string, sdp: unknown): Promise<void> {
    return api.post('/me/camera/answer', { session_id: sessionId, sdp });
  },

  sendMyIce(sessionId: string, candidate: unknown): Promise<void> {
    return api.post('/me/camera/ice', { session_id: sessionId, candidate });
  },

  // Lado família (ability family) — assiste ao vídeo do paciente vinculado.
  sendFamilyOffer(sdp: unknown): Promise<{ session_id: string }> {
    return api.post('/family/camera/offer', { sdp });
  },

  sendFamilyIce(sessionId: string, candidate: unknown): Promise<void> {
    return api.post('/family/camera/ice', { session_id: sessionId, candidate });
  },
};
