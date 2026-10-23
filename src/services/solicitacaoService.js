import { db } from '../config/firebase';
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  deleteDoc,
  updateDoc,
  runTransaction,
  writeBatch,
  onSnapshot,
} from 'firebase/firestore';
import { gerarCodigoRetirada } from '../utils/codigo';

const solicitacaoCollectionRef = collection(db, 'solicitacoesDevolucao');

// Status da solicitação: 'Pendente' -> 'Concluído' (devolvido) ou 'Recusado'
export const STATUS_PENDENTE = 'Pendente';

export class ItemIndisponivelError extends Error {
  constructor() {
    super('ITEM_INDISPONIVEL');
    this.name = 'ItemIndisponivelError';
  }
}

// Cria a solicitação (com o código de retirada) e muda o status do item para "em análise"
// em uma única transação. Antes eram duas gravações separadas: se a segunda falhasse, o sistema ficava
// inconsistente. A transação também impede que dois alunos reivindiquem o mesmo item ao mesmo tempo.
// Retorna { id, codigo } para o aluno ver o código na hora.
export const solicitarRetiradaItem = async ({ itemId, itemTitulo, usuarioId, nomeUsuario, numeroCadastro }) => {
  const itemRef = doc(db, 'itens', itemId);
  const solicitacaoRef = doc(solicitacaoCollectionRef);
  const codigo = gerarCodigoRetirada();

  await runTransaction(db, async (transacao) => {
    const itemSnap = await transacao.get(itemRef);
    const statusAtual = String(itemSnap.data()?.status || 'disponível')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    if (!itemSnap.exists() || statusAtual !== 'disponivel') {
      throw new ItemIndisponivelError();
    }

    transacao.set(solicitacaoRef, {
      itemId,
      itemTitulo,
      usuarioId,
      nomeUsuario,
      numeroCadastro,
      codigo,
      status: STATUS_PENDENTE,
      dataSolicitacao: new Date(),
    });
    transacao.update(itemRef, { status: 'em análise' });
  });

  return { id: solicitacaoRef.id, codigo };
};

export const listarMinhasSolicitacoes = async (usuarioId) => {
  const q = query(solicitacaoCollectionRef, where('usuarioId', '==', usuarioId));
  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
};

export async function cancelarSolicitacao(solicitacaoId, itemId) {
  if (!solicitacaoId) {
    throw new Error('ID da solicitação não foi fornecido.');
  }

  // 1. Exclui a solicitação
  await deleteDoc(doc(db, 'solicitacoesDevolucao', solicitacaoId));

  // 2. Devolve o item para o status 'disponível'
  if (itemId) {
    await updateDoc(doc(db, 'itens', itemId), { status: 'disponível' });
  }
}

// ---------------------------------------------------------------------------
// Administração
// ---------------------------------------------------------------------------

// Escuta, em tempo real, os pedidos pendentes. A administração vê um pedido novo
// sem precisar recarregar a página (é a "notificação" dentro do sistema).
// onDados(lista, novos): "novos" são os pedidos que acabaram de chegar depois da primeira carga.
export const ouvirPedidosPendentes = (onDados, onErro) => {
  const q = query(solicitacaoCollectionRef, where('status', '==', STATUS_PENDENTE));

  return onSnapshot(
    q,
    (snap) => {
      const lista = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.dataSolicitacao?.seconds || 0) - (a.dataSolicitacao?.seconds || 0));
      const novos = snap
        .docChanges()
        .filter((c) => c.type === 'added')
        .map((c) => ({ id: c.doc.id, ...c.doc.data() }));
      onDados(lista, novos);
    },
    onErro
  );
};

// Confirma a devolução presencial: fecha o pedido e marca o item como devolvido (gravação atômica).
export const confirmarDevolucao = async (pedido, adminId) => {
  const batch = writeBatch(db);
  batch.update(doc(db, 'solicitacoesDevolucao', pedido.id), {
    status: 'Concluído',
    dataAtendimento: new Date(),
    atendidoPor: adminId || '',
  });
  batch.update(doc(db, 'itens', pedido.itemId), { status: 'devolvido' });
  await batch.commit();
};

// Recusa o pedido (ex.: o aluno não comprovou que é o dono): o item volta a ficar disponível.
export const recusarPedido = async (pedido, adminId) => {
  const batch = writeBatch(db);
  batch.update(doc(db, 'solicitacoesDevolucao', pedido.id), {
    status: 'Recusado',
    dataAtendimento: new Date(),
    atendidoPor: adminId || '',
  });
  batch.update(doc(db, 'itens', pedido.itemId), { status: 'disponível' });
  await batch.commit();
};
