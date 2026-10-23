// Código de retirada: curto, fácil de ditar e sem caracteres que se confundem
// (sem 0/O, 1/I/L). Formato "K7M-X2P", cerca de 887 milhões de combinações.
// Usa crypto.getRandomValues para não ser previsível.
const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const gerarCodigoRetirada = () => {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const letras = Array.from(bytes, (b) => ALFABETO[b % ALFABETO.length]).join('');
  return `${letras.slice(0, 3)}-${letras.slice(3)}`;
};
