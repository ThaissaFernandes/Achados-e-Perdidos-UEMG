
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const {
  getFirestore,
  FieldValue,
} = require('firebase-admin/firestore');
const { randomInt } = require('node:crypto');

initializeApp();

const db = getFirestore();

const options = {
  region: 'southamerica-east1',
  maxInstances: 10,
  enforceAppCheck: true,
};

const ALFABETO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

// ===================================================
// FUNÇÕES AUXILIARES
// ===================================================

function exigirLogin(req) {
  if (!req.auth) {
    throw new HttpsError(
      'unauthenticated',
      'Entre na sua conta.'
    );
  }

  return req.auth.uid;
}

function exigirId(id) {
  if (
    typeof id !== 'string' ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(id)
  ) {
    throw new HttpsError(
      'invalid-argument',
      'ID inválido.'
    );
  }

  return id;
}

function disponivel(status) {
  return String(status || 'disponível')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase() === 'disponivel';
}

function gerarCodigoRetirada() {
  const caracteres = [];

  for (let i = 0; i < 6; i++) {
    caracteres.push(
      ALFABETO[randomInt(ALFABETO.length)]
    );
  }

  const codigo = caracteres.join('');

  return `${codigo.slice(0, 3)}-${codigo.slice(3)}`;
}

// ===================================================
// SOLICITAR RETIRADA
// ===================================================

exports.solicitarRetirada = onCall(options, async (req) => {
  const uid = exigirLogin(req);
  const itemId = exigirId(req.data?.itemId);

  const perfilRef = db.doc(`usuarios/${uid}`);
  const itemRef = db.doc(`itens/${itemId}`);
  const pedidoRef = db.collection(
    'solicitacoesDevolucao'
  ).doc();

  const codigo = gerarCodigoRetirada();

  const segredoRef = db.doc(
    `codigosRetirada/${pedidoRef.id}`
  );

  await db.runTransaction(async (tx) => {
    const [perfilSnap, itemSnap, adminSnap] =
      await Promise.all([
        tx.get(perfilRef),
        tx.get(itemRef),
        tx.get(db.doc(`administradores/${uid}`)),
      ]);

    if (
      adminSnap.exists &&
      adminSnap.get('ativo') === true
    ) {
      throw new HttpsError(
        'permission-denied',
        'Administradores não podem solicitar retirada.'
      );
    }

    if (
      !perfilSnap.exists ||
      !perfilSnap.get('numeroCadastro')
    ) {
      throw new HttpsError(
        'failed-precondition',
        'Complete seu cadastro.'
      );
    }

    if (!itemSnap.exists) {
      throw new HttpsError(
        'not-found',
        'Item não encontrado.'
      );
    }

    if (
      !disponivel(itemSnap.get('status')) ||
      itemSnap.get('solicitacaoAtivaId') != null
    ) {
      throw new HttpsError(
        'failed-precondition',
        'ITEM_INDISPONIVEL'
      );
    }

    const perfil = perfilSnap.data();
    const item = itemSnap.data();

    // Cria a solicitação sem expor o código.
    tx.create(pedidoRef, {
      itemId,
      itemTitulo: item.titulo,
      usuarioId: uid,
      nomeUsuario: perfil.nome,
      // A matrícula permanece no perfil, evitando cópia desnecessária no pedido.
      status: 'Pendente',
      dataSolicitacao: FieldValue.serverTimestamp(),
    });

    // Armazena o código em coleção privada.
    tx.create(segredoRef, {
      codigo,
      usuarioId: uid,
      criadoEm: FieldValue.serverTimestamp(),
    });

    // Reserva o item.
    tx.update(itemRef, {
      status: 'em análise',
      solicitacaoAtivaId: pedidoRef.id,
      teveSolicitacoes: true,
    });
  });

  return {
    id: pedidoRef.id,
    codigo,
  };
});

// ===================================================
// CANCELAR SOLICITAÇÃO
// ===================================================

exports.cancelarSolicitacao = onCall(
  options,
  async (req) => {
    const uid = exigirLogin(req);
    const id = exigirId(req.data?.solicitacaoId);

    const pedidoRef = db.doc(
      `solicitacoesDevolucao/${id}`
    );

    await db.runTransaction(async (tx) => {
      const pedidoSnap = await tx.get(pedidoRef);

      if (!pedidoSnap.exists) {
        throw new HttpsError(
          'not-found',
          'Pedido não encontrado.'
        );
      }

      const pedido = pedidoSnap.data();

      if (pedido.usuarioId !== uid) {
        throw new HttpsError(
          'permission-denied',
          'Pedido de outro usuário.'
        );
      }

      if (pedido.status !== 'Pendente') {
        throw new HttpsError(
          'failed-precondition',
          'Pedido já atendido.'
        );
      }

      const itemRef = db.doc(
        `itens/${exigirId(pedido.itemId)}`
      );

      const itemSnap = await tx.get(itemRef);

      if (
        !itemSnap.exists ||
        itemSnap.get('status') !== 'em análise' ||
        itemSnap.get('solicitacaoAtivaId') !== id
      ) {
        throw new HttpsError(
          'failed-precondition',
          'Estado do item incompatível.'
        );
      }

      tx.update(pedidoRef, {
        status: 'Cancelado',
        dataCancelamento: FieldValue.serverTimestamp(),
      });

      tx.update(itemRef, {
        status: 'disponível',
        solicitacaoAtivaId: null,
      });
    });

    return { ok: true };
  }
);

// ===================================================
// ATENDER SOLICITAÇÃO — ADMINISTRAÇÃO
// ===================================================

exports.atenderSolicitacao = onCall(
  options,
  async (req) => {
    const uid = exigirLogin(req);
    const id = exigirId(req.data?.solicitacaoId);
    const acao = req.data?.acao;

    if (!['confirmar', 'recusar'].includes(acao)) {
      throw new HttpsError(
        'invalid-argument',
        'Ação inválida.'
      );
    }

    const codigoInformado = req.data?.codigo;

    if (
      acao === 'confirmar' &&
      (
        typeof codigoInformado !== 'string' ||
        codigoInformado.trim().length === 0
      )
    ) {
      throw new HttpsError(
        'invalid-argument',
        'Informe o código de retirada.'
      );
    }

    const adminRef = db.doc(
      `administradores/${uid}`
    );

    const pedidoRef = db.doc(
      `solicitacoesDevolucao/${id}`
    );

    const segredoRef = db.doc(
      `codigosRetirada/${id}`
    );

    await db.runTransaction(async (tx) => {
      const [adminSnap, pedidoSnap, segredoSnap] =
        await Promise.all([
          tx.get(adminRef),
          tx.get(pedidoRef),
          tx.get(segredoRef),
        ]);

      // Verifica a permissão administrativa.
      if (
        !adminSnap.exists ||
        adminSnap.get('ativo') !== true
      ) {
        throw new HttpsError(
          'permission-denied',
          'Apenas administradores ativos podem atender solicitações.'
        );
      }

      if (!pedidoSnap.exists) {
        throw new HttpsError(
          'not-found',
          'Solicitação não encontrada.'
        );
      }

      if (pedidoSnap.get('status') !== 'Pendente') {
        throw new HttpsError(
          'failed-precondition',
          'A solicitação não está pendente.'
        );
      }

      const pedido = pedidoSnap.data();

      // Valida o código armazenado no servidor.
      if (acao === 'confirmar') {
        const codigoDigitado =
          codigoInformado.trim().toUpperCase();

        if (
          !segredoSnap.exists ||
          codigoDigitado !== segredoSnap.get('codigo')
        ) {
          throw new HttpsError(
            'permission-denied',
            'Código de retirada incorreto.'
          );
        }
      }

      const itemRef = db.doc(
        `itens/${exigirId(pedido.itemId)}`
      );

      const itemSnap = await tx.get(itemRef);

      if (!itemSnap.exists) {
        throw new HttpsError(
          'not-found',
          'Item não encontrado.'
        );
      }

      if (
        itemSnap.get('status') !== 'em análise'
      ) {
        throw new HttpsError(
          'failed-precondition',
          'O item não está reservado.'
        );
      }

      if (
        itemSnap.get('solicitacaoAtivaId') !== id
      ) {
        throw new HttpsError(
          'failed-precondition',
          'A solicitação não corresponde à reserva ativa.'
        );
      }

      const confirmado = acao === 'confirmar';

      // Atualiza solicitação e item na mesma transação.
      tx.update(pedidoRef, {
        status: confirmado
          ? 'Concluído'
          : 'Recusado',
        dataAtendimento: FieldValue.serverTimestamp(),
        atendidoPor: uid,
      });

      tx.update(itemRef, {
        status: confirmado
          ? 'devolvido'
          : 'disponível',
        solicitacaoAtivaId: null,
      });

      // Remove o código após o atendimento.
      if (segredoSnap.exists) {
        tx.delete(segredoRef);
      }
    });

    return { ok: true };
  }
);

// ===================================================
// PROMOVER USUÁRIO A ADMINISTRADOR
// ===================================================

exports.promoverUsuarioAdmin = onCall(
  options,
  async (req) => {
    const operadorUid = exigirLogin(req);
    const usuarioUid = exigirId(req.data?.usuarioUid);

    if (operadorUid === usuarioUid) {
      throw new HttpsError(
        'failed-precondition',
        'Não é possível alterar a própria conta.'
      );
    }

    const operadorRef = db.doc(
      `administradores/${operadorUid}`
    );

    const usuarioRef = db.doc(
      `usuarios/${usuarioUid}`
    );

    const adminRef = db.doc(
      `administradores/${usuarioUid}`
    );

    await db.runTransaction(async (tx) => {
      const [operador, perfil, permissao] =
        await Promise.all([
          tx.get(operadorRef),
          tx.get(usuarioRef),
          tx.get(adminRef),
        ]);

      if (
        !operador.exists ||
        operador.get('ativo') !== true
      ) {
        throw new HttpsError(
          'permission-denied',
          'Apenas administradores ativos podem conceder acesso.'
        );
      }

      if (!perfil.exists) {
        throw new HttpsError(
          'not-found',
          'Usuário não encontrado.'
        );
      }

      if (
        permissao.exists &&
        permissao.get('ativo') === true
      ) {
        throw new HttpsError(
          'already-exists',
          'Esta conta já possui acesso administrativo.'
        );
      }

      tx.set(
        adminRef,
        {
          ativo: true,
          concedidoPor: operadorUid,
          dataConcessao: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      tx.update(usuarioRef, {
        tipo: 'admin',
        eAdmin: true,
      });
    });

    return { ok: true };
  }
);

// ===================================================
// CONSULTAR CÓDIGO — APENAS SOLICITANTE
// ===================================================

exports.obterCodigoRetirada = onCall(
  options,
  async (req) => {
    const uid = exigirLogin(req);
    const id = exigirId(req.data?.solicitacaoId);

    const pedidoSnap = await db
      .doc(`solicitacoesDevolucao/${id}`)
      .get();

    if (!pedidoSnap.exists) {
      throw new HttpsError(
        'not-found',
        'Solicitação não encontrada.'
      );
    }

    if (pedidoSnap.get('usuarioId') !== uid) {
      throw new HttpsError(
        'permission-denied',
        'Acesso negado.'
      );
    }

    if (pedidoSnap.get('status') !== 'Pendente') {
      throw new HttpsError(
        'failed-precondition',
        'Solicitação não está pendente.'
      );
    }

    const segredoSnap = await db
      .doc(`codigosRetirada/${id}`)
      .get();

    if (!segredoSnap.exists) {
      throw new HttpsError(
        'not-found',
        'Código indisponível.'
      );
    }

    return {
      codigo: segredoSnap.get('codigo'),
    };
  }
);
