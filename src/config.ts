// Ambiente de homologação (mesmos valores de frontend/.env.homolog). Para voltar a testar
// contra a API local (emulador Android), trocar por 'http://10.0.2.2:8000/api' — 10.0.2.2 é o
// alias do host no emulador Android (não use localhost/127.0.0.1 em device físico nem emulador).
export const API_BASE_URL = 'https://api-homolog.unifcare.com.br/api';

// Laravel Reverb (WebSocket) — mesmos valores de frontend/.env.homolog.
export const REVERB_HOST = 'api-homolog.unifcare.com.br';
export const REVERB_PORT = 443;
export const REVERB_KEY = '761e042cb2b337feb9cb38665bf782e1';
export const REVERB_SCHEME: 'http' | 'https' = 'https';
