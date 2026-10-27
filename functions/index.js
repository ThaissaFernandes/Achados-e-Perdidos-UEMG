const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {initializeApp} = require('firebase-admin/app');
const {getFirestore, FieldValue} = require('firebase-admin/firestore');
const {randomInt} = require('node:crypto');
initializeApp();
const db = getFirestore();
const options = {region: 'southamerica-east1', maxInstances: 10, enforceAppCheck: true};
const exigirLogin = (req) => { if (!req.auth) throw new HttpsError('unauthenticated', 'Entre na sua conta.'); return req.auth.uid; };
const exigirAdmin = (req) => { exigirLogin(req); if (req.auth.token.admin !== true) throw new HttpsError('permission-denied','Apenas administradores.'); };
const exigirId = (id) => { if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(id)) throw new HttpsError('invalid-argument','ID inválido.'); return id; };
const disponivel = (s) => String(s || 'disponível').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase() === 'disponivel';
exports.solicitarRetirada = onCall(options, async (req) => {
  const uid = exigirLogin(req); const itemId = exigirId(req.data?.itemId);
  const perfilSnap = await db.doc(`usuarios/${uid}`).get();
  if (!perfilSnap.exists || !perfilSnap.get('numeroCadastro')) throw new HttpsError('failed-precondition','Complete seu cadastro.');
  const perfil = perfilSnap.data(); const itemRef = db.doc(`itens/${itemId}`);
  const pedidoRef = db.collection('solicitacoesDevolucao').doc();
  const codigo = String(randomInt(100000,1000000));
  await db.runTransaction(async (tx) => {
    const item = await tx.get(itemRef);
    if (!item.exists || !disponivel(item.get('status'))) throw new HttpsError('failed-precondition','ITEM_INDISPONIVEL');
    tx.create(pedidoRef, {itemId, itemTitulo: String(item.get('titulo') || item.get('title') || 'Pertence').slice(0,150), usuarioId:uid,
      nomeUsuario:String(perfil.nome || '').slice(0,120), numeroCadastro:String(perfil.numeroCadastro).slice(0,80),
      codigo, status:'Pendente', dataSolicitacao: FieldValue.serverTimestamp()});
    tx.update(itemRef, {status:'em análise'});
  });
  return {id:pedidoRef.id, codigo};
});
exports.cancelarSolicitacao = onCall(options, async (req) => {
  const uid = exigirLogin(req); const id = exigirId(req.data?.solicitacaoId);
  const ref=db.doc(`solicitacoesDevolucao/${id}`);
  await db.runTransaction(async (tx) => {
    const pedido=await tx.get(ref);
    if (!pedido.exists) throw new HttpsError('not-found','Pedido não encontrado.');
    if (pedido.get('usuarioId') !== uid) throw new HttpsError('permission-denied','Pedido de outro usuário.');
    if (pedido.get('status') !== 'Pendente') throw new HttpsError('failed-precondition','Pedido já atendido.');
    const itemRef=db.doc(`itens/${exigirId(pedido.get('itemId'))}`);
    const item=await tx.get(itemRef);
    if (!item.exists || item.get('status') !== 'em análise') throw new HttpsError('failed-precondition','Status do item incompatível.');
    tx.update(ref,{status:'Cancelado',dataAtendimento: FieldValue.serverTimestamp(),atendidoPor:uid});
    tx.update(itemRef,{status:'disponível'});
  });
  return {ok:true};
});
exports.atenderSolicitacao = onCall(options, async (req) => {
  exigirAdmin(req);
  const id=exigirId(req.data?.solicitacaoId);
  const acao=req.data?.acao;
  if (!['confirmar','recusar'].includes(acao)) throw new HttpsError('invalid-argument','Ação inválida.');
  const ref=db.doc(`solicitacoesDevolucao/${id}`);
  await db.runTransaction(async (tx) => {
    const pedido=await tx.get(ref);
    if (!pedido.exists || pedido.get('status') !== 'Pendente') throw new HttpsError('failed-precondition','Pedido não está pendente.');
    const itemRef=db.doc(`itens/${exigirId(pedido.get('itemId'))}`);
    const item=await tx.get(itemRef);
    if (!item.exists || item.get('status') !== 'em análise') throw new HttpsError('failed-precondition','Status do item incompatível.');
    tx.update(ref,{status:acao==='confirmar'?'Concluído':'Recusado',dataAtendimento:FieldValue.serverTimestamp(),atendidoPor:req.auth.uid});
    tx.update(itemRef,{status:acao==='confirmar'?'devolvido':'disponível'});
  });
  return {ok:true};
});
