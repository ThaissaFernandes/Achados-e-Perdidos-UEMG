// Formata Timestamp do Firestore (ou texto) como data curta em português: "12 out"
export const formatarDataCurta = (item) => {
  const data = item.dataEncontrado || item.dataCadastro || item.data || item.dataRegistro;
  if (data?.seconds) {
    return new Date(data.seconds * 1000)
      .toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
      .replace('.', '');
  }
  if (typeof data === 'string') return data;
  return 'Recente';
};
