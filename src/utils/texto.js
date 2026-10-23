// Remove acentos e padroniza caixa para comparações de busca.
// Ex.: "Eletrônicos" e "eletronicos" passam a ser equivalentes (Nielsen 7 - Flexibilidade e eficiência).
export const normalizar = (valor) =>
  String(valor ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
