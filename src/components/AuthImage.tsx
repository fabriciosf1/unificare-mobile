import { useEffect, useState } from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';
import { API_BASE_URL } from '../config';
import { getToken } from '../services/api';

interface Props {
  path: string | null | undefined; // caminho relativo vindo da API, ex.: /patients/{uuid}/photo
  style?: StyleProp<ImageStyle>;
}

// Foto de paciente/avatar agora exige auth:sanctum — Image aceita headers por requisição,
// então buscamos o token salvo e mandamos o Bearer junto do source.
export default function AuthImage({ path, style }: Props) {
  const [headers, setHeaders] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    let cancelled = false;
    getToken().then((token) => {
      if (!cancelled && token) setHeaders({ Authorization: `Bearer ${token}` });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!path || !headers) return null;

  return <Image source={{ uri: `${API_BASE_URL}${path}`, headers }} style={style} />;
}
