import { useEffect, useState } from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';
import { API_BASE_URL } from '../config';
import { getToken } from '../services/api';

interface Props {
  path: string | null | undefined; // caminho relativo vindo da API, ex.: /patients/{uuid}/photo
  style?: StyleProp<ImageStyle>;
}

// Foto de paciente/avatar exige auth:sanctum. O componente <Image> nativo com `headers` no
// source não envia o Authorization de forma confiável (New Architecture do RN ignora/derruba
// headers custom em boa parte dos casos), então a imagem simplesmente não aparecia. Solução:
// buscar com fetch() (headers garantidos) e converter para data URI antes de renderizar.
export default function AuthImage({ path, style }: Props) {
  const [dataUri, setDataUri] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDataUri(null);
    if (!path) return;

    (async () => {
      const token = await getToken();
      if (!token || cancelled) return;
      try {
        const res = await fetch(`${API_BASE_URL}${path}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const blob = await res.blob();
        const reader = new FileReader();
        reader.onloadend = () => {
          if (!cancelled) setDataUri(reader.result as string);
        };
        reader.readAsDataURL(blob);
      } catch {
        // sem imagem — mantém o placeholder de iniciais no componente pai
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!dataUri) return null;

  return <Image source={{ uri: dataUri }} style={style} />;
}
