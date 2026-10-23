// Ciclo de vida do item: disponível -> em análise (alguém reivindicou) -> devolvido.
// Cada estado tem cor, ícone e texto próprios (Nielsen 1 - Visibilidade do estado do sistema).
// "Devolvido" usa azul (desfecho positivo e encerrado), e não vermelho, que remete a erro.
export const obterChaveStatus = (status) => {
  const s = String(status || 'disponível')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
  if (s === 'disponivel') return 'disponivel';
  if (s === 'em analise') return 'analise';
  if (s === 'devolvido') return 'devolvido';
  return 'outro';
};

export const ESTILOS_STATUS = {
  disponivel: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
  analise: 'bg-amber-100 text-amber-900 border border-amber-200',
  devolvido: 'bg-sky-100 text-sky-900 border border-sky-200',
  outro: 'bg-gray-100 text-gray-700 border border-gray-200',
};

export const ROTULOS_STATUS = {
  disponivel: 'Disponível',
  analise: 'Em análise',
  devolvido: 'Devolvido',
  outro: 'Indefinido',
};
