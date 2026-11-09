import { auth, db } from '../config/firebase';
import {
  collection, doc, getDoc, getDocs, query, where, onSnapshot,
  runTransaction, serverTimestamp,
} from 'firebase/firestore';

const solicitacoesRef = collection(db, 'solicitacoesDevolucao');
export const STATUS_PENDENTE = 'Pendente';
const ALFABETO = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const FORMATO_CODIGO = /^[A-HJ-NP-Z2-9]{3}-[A-HJ-NP-Z2-9]{3}$/;

export class ItemIndisponivelError extends Error {
  constructor() { super('ITEM_INDISPONIVEL'); this.name = 'ItemIndisponivelError'; }
}

function usuarioAutenticado() {
  if (!auth.currentUser) throw new Error('Faça login para continuar.');
  return auth.currentUser;
}

function gerarCodigo() {
  if (!globalThis.crypto?.getRandomValues) {
    throw new Error('Seu navegador não suporta geração segura de códigos.');
  }
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  const caracteres = Array.from(bytes, (byte) => ALFABETO[byte & 31]);
  return `${caracteres.slice(0, 3).join('')}-${caracteres.slice(3).join('')}`;
}

export async function solicitarRetiradaItem({ itemId }) {
  const usuario = usuarioAutenticado();
  if (!itemId) throw new Error('Item não informado.');
  const perfilRef = doc(db, 'usuarios', usuario.uid);
  const itemRef = doc(db, 'itens', itemId);
  const pedidoRef = doc(solicitacoesRef);
  const codigoRef = doc(db, 'codigosRetirada', pedidoRef.id);
  const codigo = gerarCodigo();

  await runTransaction(db, async (tx) => {
    const [perfilSnap, itemSnap] = await Promise.all([
      tx.get(perfilRef), tx.get(itemRef),
    ]);
    if (!perfilSnap.exists()) throw new Error('Complete seu cadastro antes de solicitar.');
    const perfil = perfilSnap.data();
    if (!perfil.numeroCadastro || perfil.tipo !== 'usuario' || perfil.eAdmin === true) {
      throw new Error('Sua conta não pode solicitar retiradas.');
    }
    if (!itemSnap.exists()) throw new ItemIndisponivelError();
    const item = itemSnap.data();
    if (item.status !== 'disponível' || item.solicitacaoAtivaId != null) {
      throw new ItemIndisponivelError();
    }
    tx.set(pedidoRef, {
      itemId,
      itemTitulo: item.titulo,
      usuarioId: usuario.uid,
      nomeUsuario: perfil.nome,
      numeroCadastro: perfil.numeroCadastro,
      status: STATUS_PENDENTE,
      dataSolicitacao: serverTimestamp(),
    });
    tx.set(codigoRef, {
      codigo, usuarioId: usuario.uid, criadoEm: serverTimestamp(),
    });
    tx.update(itemRef, {
      status: 'em análise', solicitacaoAtivaId: pedidoRef.id, teveSolicitacoes: true,
    });
  });
  return { id: pedidoRef.id, codigo };
}

export async function obterCodigoRetirada(solicitacaoId) {
  const usuario = usuarioAutenticado();
  if (!solicitacaoId) throw new Error('Solicitação não informada.');
  const codigoSnap = await getDoc(doc(db, 'codigosRetirada', solicitacaoId));
  if (!codigoSnap.exists() || codigoSnap.data().usuarioId !== usuario.uid) {
    throw new Error('Código não encontrado ou acesso não autorizado.');
  }
  return codigoSnap.data().codigo;
}

export async function listarMinhasSolicitacoes(usuarioId) {
  const usuario = usuarioAutenticado();
  if (usuarioId !== usuario.uid) throw new Error('Acesso não autorizado.');
  const snapshot = await getDocs(query(solicitacoesRef, where('usuarioId', '==', usuario.uid)));
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function cancelarSolicitacao(solicitacaoId) {
  const usuario = usuarioAutenticado();
  if (!solicitacaoId) throw new Error('Solicitação não informada.');
  const pedidoRef = doc(db, 'solicitacoesDevolucao', solicitacaoId);
  await runTransaction(db, async (tx) => {
    const pedidoSnap = await tx.get(pedidoRef);
    if (!pedidoSnap.exists()) throw new Error('Solicitação não encontrada.');
    const pedido = pedidoSnap.data();
    if (pedido.usuarioId !== usuario.uid) throw new Error('Acesso não autorizado.');
    if (pedido.status !== STATUS_PENDENTE) throw new Error('O pedido não está pendente.');
    const itemRef = doc(db, 'itens', pedido.itemId);
    const itemSnap = await tx.get(itemRef);
    if (!itemSnap.exists() || itemSnap.data().status !== 'em análise' ||
        itemSnap.data().solicitacaoAtivaId !== solicitacaoId) {
      throw new Error('O item não está mais reservado para este pedido.');
    }
    tx.update(pedidoRef, { status: 'Cancelado', dataCancelamento: serverTimestamp() });
    tx.update(itemRef, { status: 'disponível', solicitacaoAtivaId: null });
  });
}

export function ouvirPedidosPendentes(onDados, onErro) {
  return onSnapshot(query(solicitacoesRef, where('status', '==', STATUS_PENDENTE)),
    (snapshot) => {
      const lista = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.dataSolicitacao?.seconds || 0) - (a.dataSolicitacao?.seconds || 0));
      const novos = snapshot.docChanges().filter((c) => c.type === 'added')
        .map((c) => ({ id: c.doc.id, ...c.doc.data() }));
      onDados(lista, novos);
    }, onErro);
}

async function atenderSolicitacao(pedido, acao, codigo) {
  const usuario = usuarioAutenticado();
  if (!pedido?.id) throw new Error('Pedido inválido.');
  if (!['confirmar', 'recusar'].includes(acao)) throw new Error('Ação inválida.');
  if (acao === 'confirmar' && !FORMATO_CODIGO.test(codigo || '')) {
    throw new Error('Informe um código válido no formato ABC-234.');
  }
  const adminSnap = await getDoc(doc(db, 'administradores', usuario.uid));
  if (!adminSnap.exists() || adminSnap.data().ativo !== true) {
    throw new Error('Acesso administrativo não autorizado.');
  }
  const pedidoRef = doc(db, 'solicitacoesDevolucao', pedido.id);
  const conferenciaRef = doc(db, 'conferenciasRetirada', pedido.id);
  await runTransaction(db, async (tx) => {
    const pedidoSnap = await tx.get(pedidoRef);
    if (!pedidoSnap.exists() || pedidoSnap.data().status !== STATUS_PENDENTE) {
      throw new Error('Pedido não está mais pendente.');
    }
    const pedidoAtual = pedidoSnap.data();
    const itemRef = doc(db, 'itens', pedidoAtual.itemId);
    const itemSnap = await tx.get(itemRef);
    if (!itemSnap.exists() || itemSnap.data().status !== 'em análise' ||
        itemSnap.data().solicitacaoAtivaId !== pedido.id) {
      throw new Error('O item não está reservado para este pedido.');
    }
    if (acao === 'confirmar') {
      // Sem leitura do segredo: o Firestore valida o código nas regras.
      tx.set(conferenciaRef, {
        codigo, administradorId: usuario.uid, criadoEm: serverTimestamp(),
      });
    }
    tx.update(pedidoRef, {
      status: acao === 'confirmar' ? 'Concluído' : 'Recusado',
      atendidoPor: usuario.uid,
      dataAtendimento: serverTimestamp(),
    });
    tx.update(itemRef, {
      status: acao === 'confirmar' ? 'devolvido' : 'disponível',
      solicitacaoAtivaId: null,
    });
  });
  return { id: pedido.id, status: acao === 'confirmar' ? 'Concluído' : 'Recusado' };
}

export async function confirmarDevolucao(pedido, codigo) {
  return atenderSolicitacao(pedido, 'confirmar', String(codigo || '').trim().toUpperCase());
}

export async function recusarPedido(pedido) {
  return atenderSolicitacao(pedido, 'recusar');
}
