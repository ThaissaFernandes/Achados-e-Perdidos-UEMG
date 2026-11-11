import { readFileSync } from 'node:fs';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

const ambiente = await initializeTestEnvironment({
  projectId: 'demo-achados-spark',
  firestore: {
    host: '127.0.0.1', port: 8080,
    rules: readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8'),
  },
});
after(async () => ambiente.cleanup());
const aluno = ambiente.authenticatedContext('aluno', { email: 'aluno@teste.com' }).firestore();
const outro = ambiente.authenticatedContext('outro', { email: 'outro@teste.com' }).firestore();
const admin = ambiente.authenticatedContext('admin', { email: 'admin@teste.com' }).firestore();
const visitante = ambiente.unauthenticatedContext().firestore();
const agora = () => firebase.firestore.FieldValue.serverTimestamp();
const CODIGO = 'ABC-234';

async function preparar() {
  await ambiente.clearFirestore();
  await ambiente.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await Promise.all([
      db.doc('administradores/admin').set({ ativo: true }),
      db.doc('usuarios/admin').set({ nome: 'Admin', email: 'admin@teste.com', numeroCadastro: '20260003', tipo: 'admin', eAdmin: true }),
      db.doc('usuarios/aluno').set({ nome: 'Aluno', email: 'aluno@teste.com', numeroCadastro: '20260001', tipo: 'usuario', eAdmin: false }),
      db.doc('usuarios/outro').set({ nome: 'Outro', email: 'outro@teste.com', numeroCadastro: '20260002', tipo: 'usuario', eAdmin: false }),
      db.doc('itens/item').set({ titulo: 'Garrafa', descricao: 'Encontrada', categoriaId: 'Pessoal', localEncontrado: 'Biblioteca', fotoUrl: '', status: 'disponível', solicitacaoAtivaId: null, teveSolicitacoes: false }),
    ]);
  });
}
function criarPedido(db, id = 'pedido', { codigo = CODIGO, uid = 'aluno', titulo = 'Garrafa', matricula = '20260001', nome = 'Aluno' } = {}) {
  const batch = db.batch();
  batch.set(db.doc(`solicitacoesDevolucao/${id}`), {
    itemId: 'item', itemTitulo: titulo, usuarioId: uid, nomeUsuario: nome,
    numeroCadastro: matricula, status: 'Pendente', dataSolicitacao: agora(),
  });
  batch.set(db.doc(`codigosRetirada/${id}`), { codigo, usuarioId: uid, criadoEm: agora() });
  batch.update(db.doc('itens/item'), { status: 'em análise', solicitacaoAtivaId: id, teveSolicitacoes: true });
  return batch.commit();
}
function atender(db, status, codigo = CODIGO, id = 'pedido') {
  const batch = db.batch();
  if (status === 'Concluído') {
    batch.set(db.doc(`conferenciasRetirada/${id}`), { codigo, administradorId: 'admin', criadoEm: agora() });
  }
  batch.update(db.doc(`solicitacoesDevolucao/${id}`), {
    status, atendidoPor: 'admin', dataAtendimento: agora(),
  });
  batch.update(db.doc('itens/item'), {
    status: status === 'Concluído' ? 'devolvido' : 'disponível', solicitacaoAtivaId: null,
  });
  return batch.commit();
}

test('Visitante lê item, mas não o altera', async () => {
  await preparar();
  await assertSucceeds(visitante.doc('itens/item').get());
  await assertFails(visitante.doc('itens/item').update({ status: 'devolvido' }));
});
test('Aluno cria pedido, código e reserva atomicamente', async () => {
  await preparar();
  await assertSucceeds(criarPedido(aluno));
  assert.equal((await aluno.doc('itens/item').get()).data().status, 'em análise');
  assert.equal((await aluno.doc('codigosRetirada/pedido').get()).data().codigo, CODIGO);
  await assertFails(outro.doc('codigosRetirada/pedido').get());
  await assertFails(admin.doc('codigosRetirada/pedido').get());
  await assertFails(admin.doc('conferenciasRetirada/pedido').get());
});
test('Não permite pedido isolado, código isolado nem reserva isolada', async () => {
  await preparar();
  await assertFails(aluno.doc('solicitacoesDevolucao/pedido').set({
    itemId: 'item', itemTitulo: 'Garrafa', usuarioId: 'aluno', nomeUsuario: 'Aluno',
    numeroCadastro: '20260001', status: 'Pendente', dataSolicitacao: agora(),
  }));
  await assertFails(aluno.doc('codigosRetirada/pedido').set({ codigo: CODIGO, usuarioId: 'aluno', criadoEm: agora() }));
  await assertFails(aluno.doc('itens/item').update({ status: 'em análise', solicitacaoAtivaId: 'pedido', teveSolicitacoes: true }));
});
test('Não permite pedido de terceiro nem dados pessoais falsificados', async () => {
  await preparar();
  await assertFails(criarPedido(outro, 'fraude', { uid: 'aluno' }));
  await assertFails(criarPedido(aluno, 'fraude2', { matricula: '20260002' }));
  await assertFails(criarPedido(aluno, 'fraude3', { titulo: 'Notebook' }));
});
test('Não permite reivindicar item já reservado', async () => {
  await preparar();
  await assertSucceeds(criarPedido(aluno));
  await assertFails(criarPedido(outro, 'pedido2', { uid: 'outro', nome: 'Outro', matricula: '20260002' }));
});
test('Aluno cancela pedido e libera item, sem apagar histórico', async () => {
  await preparar();
  await assertSucceeds(criarPedido(aluno));
  const batch = aluno.batch();
  batch.update(aluno.doc('solicitacoesDevolucao/pedido'), { status: 'Cancelado', dataCancelamento: agora() });
  batch.update(aluno.doc('itens/item'), { status: 'disponível', solicitacaoAtivaId: null });
  await assertSucceeds(batch.commit());
  assert.equal((await aluno.doc('solicitacoesDevolucao/pedido').get()).data().status, 'Cancelado');
  assert.equal((await aluno.doc('itens/item').get()).data().teveSolicitacoes, true);
});
test('Terceiro não cancela nem confirma', async () => {
  await preparar();
  await assertSucceeds(criarPedido(aluno));
  const batch = outro.batch();
  batch.update(outro.doc('solicitacoesDevolucao/pedido'), { status: 'Cancelado', dataCancelamento: agora() });
  batch.update(outro.doc('itens/item'), { status: 'disponível', solicitacaoAtivaId: null });
  await assertFails(batch.commit());
  await assertFails(atender(aluno, 'Concluído'));
});
test('Administrador confirma apenas com código correto', async () => {
  await preparar();
  await assertSucceeds(criarPedido(aluno));
  await assertFails(atender(admin, 'Concluído', 'XYZ-789'));
  assert.equal((await admin.doc('itens/item').get()).data().status, 'em análise');
  await assertSucceeds(atender(admin, 'Concluído', CODIGO));
  assert.equal((await admin.doc('itens/item').get()).data().status, 'devolvido');
  assert.equal((await admin.doc('solicitacoesDevolucao/pedido').get()).data().status, 'Concluído');
});
test('Administrador recusa pedido e libera item', async () => {
  await preparar();
  await assertSucceeds(criarPedido(aluno));
  await assertSucceeds(atender(admin, 'Recusado'));
  assert.equal((await admin.doc('itens/item').get()).data().status, 'disponível');
});
test('Admin não pode ler ou editar código, nem confirmar sem conferência', async () => {
  await preparar();
  await assertSucceeds(criarPedido(aluno));
  await assertFails(admin.doc('codigosRetirada/pedido').get());
  await assertFails(admin.doc('codigosRetirada/pedido').update({ codigo: 'XYZ-789' }));
  const batch = admin.batch();
  batch.update(admin.doc('solicitacoesDevolucao/pedido'), { status: 'Concluído', atendidoPor: 'admin', dataAtendimento: agora() });
  batch.update(admin.doc('itens/item'), { status: 'devolvido', solicitacaoAtivaId: null });
  await assertFails(batch.commit());
});
test('Aluno não promove a própria conta', async () => {
  await preparar();
  await assertFails(aluno.doc('usuarios/aluno').update({ eAdmin: true, tipo: 'admin' }));
});

