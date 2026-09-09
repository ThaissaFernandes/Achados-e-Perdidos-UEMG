import { db } from '../config/firebase';
import { collection, addDoc, getDocs, query, where, doc, deleteDoc, updateDoc } from 'firebase/firestore';

const solicitacaoCollectionRef = collection(db, 'solicitacoesDevolucao');

export const criarSolicitacaoDevolucao = async (dadosSolicitacao) => {
  const docRef = await addDoc(solicitacaoCollectionRef, {
    itemId: dadosSolicitacao.itemId,
    itemTitulo: dadosSolicitacao.itemTitulo,
    usuarioId: dadosSolicitacao.usuarioId,
    nomeUsuario: dadosSolicitacao.nomeUsuario,
    numeroCadastro: dadosSolicitacao.numeroCadastro,
    status: 'Pendente',
    dataSolicitacao: new Date()
  });
  return docRef.id;
};

export const listarMinhasSolicitacoes = async (usuarioId) => {
  const q = query(solicitacaoCollectionRef, where("usuarioId", "==", usuarioId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

export async function cancelarSolicitacao(solicitacaoId, itemId) {
  try {
    if (!solicitacaoId) {
      throw new Error("ID da solicitação não foi fornecido.");
    }

    // 1. Exclui da coleção correta no Firestore (confirme se o nome é 'solicitacoesDevolucao' ou 'solicitacoes')
    const solicitacaoRef = doc(db, 'solicitacoesDevolucao', solicitacaoId);
    await deleteDoc(solicitacaoRef);

    // 2. Retorna o item associado para o status 'disponível'
    if (itemId) {
      const itemRef = doc(db, 'itens', itemId);
      await updateDoc(itemRef, { status: 'disponível' });
    }

    console.log("Sucesso ao deletar do Firebase!");
  } catch (error) {
    console.error("Erro crítico no Firebase ao excluir:", error);
    throw error; // Joga o erro para o componente saber que falhou
  }
}