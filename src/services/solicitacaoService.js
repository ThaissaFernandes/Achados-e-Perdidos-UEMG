
import { auth, db } from '../config/firebase';

import {
  collection,
  doc,
  getDocs,
  query,
  where,
  onSnapshot,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';

import { gerarCodigoRetirada } from '../utils/codigo';

const solicitacoesRef = collection(
  db,
  'solicitacoesDevolucao'
);

export const STATUS_PENDENTE = 'Pendente';

// ===================================================
// ERRO PERSONALIZADO
// ===================================================

export class ItemIndisponivelError extends Error {
  constructor() {
    super('ITEM_INDISPONIVEL');
    this.name = 'ItemIndisponivelError';
  }
}

// ===================================================
// FUNÇÕES AUXILIARES
// ===================================================

function obterUsuarioAutenticado() {
  const usuario = auth.currentUser;

  if (!usuario) {
    throw new Error('Faça login para continuar.');
  }

  return usuario;
}

function normalizarStatus(status) {
  return String(status || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

// ===================================================
// SOLICITAR RETIRADA
// ===================================================

export async function solicitarRetiradaItem({ itemId }) {
  const usuario = obterUsuarioAutenticado();

  if (!itemId) {
    throw new Error('Item não informado.');
  }

  const itemRef = doc(db, 'itens', itemId);
  const usuarioRef = doc(
    db,
    'usuarios',
    usuario.uid
  );
  const pedidoRef = doc(solicitacoesRef);

  const codigo = gerarCodigoRetirada();

  await runTransaction(db, async (transaction) => {
    // Todas as leituras antes das escritas.
    const usuarioSnap = await transaction.get(
      usuarioRef
    );
    const itemSnap = await transaction.get(
      itemRef
    );

    if (!usuarioSnap.exists()) {
      throw new Error(
        'Complete seu cadastro primeiro.'
      );
    }

    if (!itemSnap.exists()) {
      throw new Error('Item não encontrado.');
    }

    const perfil = usuarioSnap.data();
    const item = itemSnap.data();

    if (!perfil.numeroCadastro) {
      throw new Error(
        'Matrícula não cadastrada.'
      );
    }

    if (
      normalizarStatus(item.status || 'disponível') !==
      'disponivel'
    ) {
      throw new ItemIndisponivelError();
    }

    if (item.solicitacaoAtivaId != null) {
      throw new ItemIndisponivelError();
    }

    // Cria a solicitação.
    transaction.set(pedidoRef, {
      itemId,
      itemTitulo: item.titulo,
      usuarioId: usuario.uid,
      nomeUsuario: perfil.nome,
      numeroCadastro: perfil.numeroCadastro,
      codigo,
      status: STATUS_PENDENTE,
      dataSolicitacao: serverTimestamp(),
    });

    // Reserva o item e marca o histórico
    // na MESMA transação.
    transaction.update(itemRef, {
      status: 'em análise',
      solicitacaoAtivaId: pedidoRef.id,
      teveSolicitacoes: true,
    });
  });

  return {
    id: pedidoRef.id,
    codigo,
  };
}

// ===================================================
// LISTAR SOLICITAÇÕES DO USUÁRIO
// ===================================================

export async function listarMinhasSolicitacoes(
  usuarioId
) {
  const usuario = obterUsuarioAutenticado();

  if (usuarioId !== usuario.uid) {
    throw new Error('Acesso não autorizado.');
  }

  const consulta = query(
    solicitacoesRef,
    where('usuarioId', '==', usuario.uid)
  );

  const snapshot = await getDocs(consulta);

  return snapshot.docs.map((documento) => ({
    id: documento.id,
    ...documento.data(),
  }));
}

// ===================================================
// CANCELAR SOLICITAÇÃO
// ===================================================

export async function cancelarSolicitacao(
  solicitacaoId
) {
  const usuario = obterUsuarioAutenticado();

  if (!solicitacaoId) {
    throw new Error(
      'Solicitação não informada.'
    );
  }

  const pedidoRef = doc(
    db,
    'solicitacoesDevolucao',
    solicitacaoId
  );

  await runTransaction(db, async (transaction) => {
    const pedidoSnap = await transaction.get(
      pedidoRef
    );

    if (!pedidoSnap.exists()) {
      throw new Error(
        'Solicitação não encontrada.'
      );
    }

    const pedido = pedidoSnap.data();

    if (pedido.usuarioId !== usuario.uid) {
      throw new Error(
        'Você não pode cancelar este pedido.'
      );
    }

    if (pedido.status !== STATUS_PENDENTE) {
      throw new Error(
        'Este pedido não pode mais ser cancelado.'
      );
    }

    const itemRef = doc(
      db,
      'itens',
      pedido.itemId
    );

    const itemSnap = await transaction.get(
      itemRef
    );

    if (!itemSnap.exists()) {
      throw new Error(
        'Item vinculado não encontrado.'
      );
    }

    const item = itemSnap.data();

    if (
      normalizarStatus(item.status) !==
      'em analise'
    ) {
      throw new Error(
        'O item não está mais reservado.'
      );
    }

    if (
      item.solicitacaoAtivaId !== solicitacaoId
    ) {
      throw new Error(
        'O item pertence a outra solicitação.'
      );
    }

    transaction.update(pedidoRef, {
      status: 'Cancelado',
      dataCancelamento: serverTimestamp(),
    });

    // O item volta a ficar disponível,
    // mas teveSolicitacoes permanece true.
    transaction.update(itemRef, {
      status: 'disponível',
      solicitacaoAtivaId: null,
    });
  });
}

// ===================================================
// PEDIDOS PENDENTES — ADMINISTRAÇÃO
// ===================================================

export function ouvirPedidosPendentes(
  onDados,
  onErro
) {
  const consulta = query(
    solicitacoesRef,
    where('status', '==', STATUS_PENDENTE)
  );

  return onSnapshot(
    consulta,
    (snapshot) => {
      const lista = snapshot.docs
        .map((documento) => ({
          id: documento.id,
          ...documento.data(),
        }))
        .sort(
          (a, b) =>
            (b.dataSolicitacao?.seconds || 0) -
            (a.dataSolicitacao?.seconds || 0)
        );

      const novos = snapshot
        .docChanges()
        .filter(
          (mudanca) => mudanca.type === 'added'
        )
        .map((mudanca) => ({
          id: mudanca.doc.id,
          ...mudanca.doc.data(),
        }));

      onDados(lista, novos);
    },
    onErro
  );
}

// ===================================================
// ATENDIMENTO — ADMINISTRAÇÃO
// ===================================================

async function atenderSolicitacao(pedido, acao) {
  const usuario = obterUsuarioAutenticado();

  if (!pedido?.id) {
    throw new Error('Pedido inválido.');
  }

  if (!['confirmar', 'recusar'].includes(acao)) {
    throw new Error('Ação inválida.');
  }

  const pedidoRef = doc(
    db,
    'solicitacoesDevolucao',
    pedido.id
  );

  await runTransaction(db, async (transaction) => {
    const pedidoSnap = await transaction.get(
      pedidoRef
    );

    if (!pedidoSnap.exists()) {
      throw new Error(
        'Solicitação não encontrada.'
      );
    }

    const dados = pedidoSnap.data();

    if (dados.status !== STATUS_PENDENTE) {
      throw new Error(
        'Este pedido já foi atendido.'
      );
    }

    const itemRef = doc(
      db,
      'itens',
      dados.itemId
    );

    const itemSnap = await transaction.get(
      itemRef
    );

    if (!itemSnap.exists()) {
      throw new Error(
        'Item não encontrado.'
      );
    }

    const item = itemSnap.data();

    if (
      normalizarStatus(item.status) !==
      'em analise'
    ) {
      throw new Error(
        'Estado do item incompatível com o pedido.'
      );
    }

    if (item.solicitacaoAtivaId !== pedido.id) {
      throw new Error(
        'Solicitação não corresponde à reserva ativa.'
      );
    }

    const confirmado = acao === 'confirmar';

    transaction.update(pedidoRef, {
      status: confirmado
        ? 'Concluído'
        : 'Recusado',
      dataAtendimento: serverTimestamp(),
      atendidoPor: usuario.uid,
    });

    // Preserva o valor de teveSolicitacoes.
    transaction.update(itemRef, {
      status: confirmado
        ? 'devolvido'
        : 'disponível',
      solicitacaoAtivaId: null,
    });
  });
}

// ===================================================
// CONFIRMAR DEVOLUÇÃO
// ===================================================

export async function confirmarDevolucao(pedido) {
  return atenderSolicitacao(
    pedido,
    'confirmar'
  );
}

// ===================================================
// RECUSAR SOLICITAÇÃO
// ===================================================

export async function recusarPedido(pedido) {
  return atenderSolicitacao(
    pedido,
    'recusar'
  );
}
