// Ajuste para o IP da máquina rodando a API Laravel na rede local (não use localhost/127.0.0.1
// ao testar em device físico ou emulador Android — 10.0.2.2 é o alias do host no emulador Android).
export const API_BASE_URL = 'http://10.0.2.2:8000/api';

// Laravel Reverb (WebSocket) — mesmos valores do api/.env local.
export const REVERB_HOST = '10.0.2.2';
export const REVERB_PORT = 8080;
export const REVERB_KEY = 'dzhuddyuxwkbqcc3pys6';
export const REVERB_SCHEME: 'http' | 'https' = 'http';
