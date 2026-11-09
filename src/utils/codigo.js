const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export const gerarCodigoRetirada = () => {
  const caracteres = [];

  while (caracteres.length < 6) {
    const bytes = new Uint8Array(6);
    crypto.getRandomValues(bytes);

    for (const byte of bytes) {
      if (byte >= 248) continue;

      caracteres.push(ALFABETO[byte % ALFABETO.length]);

      if (caracteres.length === 6) break;
    }
  }

  const codigo = caracteres.join('');
  return `${codigo.slice(0, 3)}-${codigo.slice(3)}`;
};