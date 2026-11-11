// Suíte original preservada (64 casos), com acesso ao próprio código atualizado.
// Os 11 cenários adicionais de reivindicação estão no arquivo complementar.


import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
} from '@firebase/rules-unit-testing';

import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

// =====================================================
// 1. CONFIGURAÇÃO DO FIREBASE EMULATOR
// =====================================================

const ambiente = await initializeTestEnvironment({
  projectId: 'demo-achados-seguranca',
  firestore: {
    host: '127.0.0.1',
    port: 8080,
    rules: readFileSync(
      new URL('../firestore.rules', import.meta.url),
      'utf8'
    ),
  },
});

// =====================================================
// 2. USUÁRIOS FICTÍCIOS
// =====================================================

const aluno = ambiente.authenticatedContext(
  'aluno-teste',
  { email: 'aluno@teste.com' }
).firestore();

const outroAluno = ambiente.authenticatedContext(
  'outro-aluno',
  { email: 'outro@teste.com' }
).firestore();

const admin = ambiente.authenticatedContext(
  'admin-teste',
  { email: 'admin@teste.com' }
).firestore();

const visitante = ambiente
  .unauthenticatedContext()
  .firestore();

const alunoNovo = ambiente.authenticatedContext(
  'aluno-novo',
  { email: 'novo@teste.com' }
).firestore();

const alunoDuplicado = ambiente.authenticatedContext(
  'aluno-duplicado',
  { email: 'duplicado@teste.com' }
).firestore();

// =====================================================
// 3. CONSTANTES E FUNÇÕES AUXILIARES
// =====================================================

const agora = () =>
  firebase.firestore.FieldValue.serverTimestamp();

const CODIGO_VALIDO = 'ABC-234';

async function escreverSemRegras(caminho, dados) {
  await ambiente.withSecurityRulesDisabled(
    async (ctx) => {
      await ctx.firestore().doc(caminho).set(dados);
    }
  );
}

async function lerSemRegras(caminho) {
  let dados;

  await ambiente.withSecurityRulesDisabled(
    async (ctx) => {
      const documento = await ctx
        .firestore()
        .doc(caminho)
        .get();

      dados = documento.exists
        ? documento.data()
        : null;
    }
  );

  return dados;
}

// =====================================================
// 4. PREPARAR DADOS DE TESTE
// =====================================================

async function preparar() {
  await ambiente.clearFirestore();

  await ambiente.withSecurityRulesDisabled(
    async (ctx) => {
      const db = ctx.firestore();

      await Promise.all([
        db.doc('administradores/admin-teste').set({
          ativo: true,
        }),

        db.doc('usuarios/admin-teste').set({
          nome: 'Administrador Teste',
          email: 'admin@teste.com',
          numeroCadastro: '20260003',
          tipo: 'admin',
          eAdmin: true,
        }),

        db.doc('usuarios/aluno-teste').set({
          nome: 'Aluno Teste',
          email: 'aluno@teste.com',
          numeroCadastro: '20260001',
          tipo: 'usuario',
          eAdmin: false,
        }),

        db.doc('usuarios/outro-aluno').set({
          nome: 'Outro Aluno',
          email: 'outro@teste.com',
          numeroCadastro: '20260002',
          tipo: 'usuario',
          eAdmin: false,
        }),

        db.doc('itens/item-teste').set({
          titulo: 'Garrafa de teste',
          descricao: 'Objeto encontrado no campus',
          categoriaId: 'Objetos pessoais',
          localEncontrado: 'Biblioteca',
          fotoUrl: '',
          status: 'disponível',
          solicitacaoAtivaId: null,
          teveSolicitacoes: false,
        }),

        db.doc('solicitacoesDevolucao/pedido-aluno').set({
          usuarioId: 'aluno-teste',
          itemId: 'item-teste',
          itemTitulo: 'Garrafa de teste',
          status: 'Pendente',
        }),

        db.doc('matriculas/20260001').set({
          uid: 'aluno-teste',
          criadoEm: firebase.firestore.Timestamp.now(),
        }),

        db.doc('matriculas/20260002').set({
          uid: 'outro-aluno',
          criadoEm: firebase.firestore.Timestamp.now(),
        }),
      ]);
    }
  );
}

// =====================================================
// 5. PREPARAR RESERVA FICTÍCIA
// =====================================================

async function prepararReserva(
  id,
  donoUid = 'aluno-teste'
) {
  const nomeUsuario =
    donoUid === 'aluno-teste'
      ? 'Aluno Teste'
      : 'Outro Aluno';

  const numeroCadastro =
    donoUid === 'aluno-teste'
      ? '20260001'
      : '20260002';

  await ambiente.withSecurityRulesDisabled(
    async (ctx) => {
      const db = ctx.firestore();

      await Promise.all([
        db.doc(`itens/item-${id}`).set({
          titulo: `Objeto ${id}`,
          descricao: 'Objeto usado no teste',
          categoriaId: 'Objetos pessoais',
          localEncontrado: 'Biblioteca',
          fotoUrl: '',
          status: 'em análise',
          solicitacaoAtivaId: `pedido-${id}`,
          teveSolicitacoes: true,
        }),

        db.doc(
          `solicitacoesDevolucao/pedido-${id}`
        ).set({
          itemId: `item-${id}`,
          itemTitulo: `Objeto ${id}`,
          usuarioId: donoUid,
          nomeUsuario,
          numeroCadastro,
          status: 'Pendente',
          dataSolicitacao:
            firebase.firestore.Timestamp.now(),
        }),

        // O código fica em uma coleção privada.
        db.doc(
          `codigosRetirada/pedido-${id}`
        ).set({
          codigo: CODIGO_VALIDO,
          usuarioId: donoUid,
          criadoEm:
            firebase.firestore.Timestamp.now(),
        }),
      ]);
    }
  );
}

// =====================================================
// 6. TENTATIVA DE CRIAÇÃO DIRETA PELO CLIENTE
// =====================================================

function criarPedidoDiretamente(
  db,
  itemId,
  pedidoId,
  uid = 'aluno-teste',
  nome = 'Aluno Teste',
  matricula = '20260001'
) {
  const batch = db.batch();

  batch.set(
    db.doc(`solicitacoesDevolucao/${pedidoId}`),
    {
      itemId,
      itemTitulo: 'Objeto de teste',
      usuarioId: uid,
      nomeUsuario: nome,
      numeroCadastro: matricula,
      status: 'Pendente',
      dataSolicitacao: agora(),
    }
  );

  batch.update(
    db.doc(`itens/${itemId}`),
    {
      status: 'em análise',
      solicitacaoAtivaId: pedidoId,
      teveSolicitacoes: true,
    }
  );

  return batch.commit();
}

// =====================================================
// 7. TENTATIVA DE FINALIZAÇÃO PELO CLIENTE
// =====================================================

function finalizar(
  db,
  id,
  statusPedido,
  statusItem,
  campos = {}
) {
  return db.runTransaction(async (tx) => {
    const pedidoRef = db.doc(
      `solicitacoesDevolucao/pedido-${id}`
    );

    const itemRef = db.doc(`itens/item-${id}`);

    const pedido = await tx.get(pedidoRef);
    const item = await tx.get(itemRef);

    if (
      !pedido.exists ||
      !item.exists ||
      pedido.data().status !== 'Pendente'
    ) {
      throw new Error('PEDIDO_INDISPONIVEL');
    }

    tx.update(pedidoRef, {
      status: statusPedido,
      ...campos,
    });

    tx.update(itemRef, {
      status: statusItem,
      solicitacaoAtivaId: null,
    });
  });
}

// =====================================================
// 8. CADASTRAR PERFIL E MATRÍCULA
// =====================================================

function criarCadastro(
  db,
  uid,
  email,
  nome,
  numeroCadastro
) {
  const batch = db.batch();

  batch.set(
    db.doc(`matriculas/${numeroCadastro}`),
    {
      uid,
      criadoEm: agora(),
    }
  );

  batch.set(
    db.doc(`usuarios/${uid}`),
    {
      nome,
      email,
      numeroCadastro,
      tipo: 'usuario',
      eAdmin: false,
      dataCriacao: agora(),
    }
  );

  return batch.commit();
}

// =====================================================
// 9. TESTES AUTOMATIZADOS
// =====================================================

try {
  await test('Segurança do Firestore', async (t) => {

    // =================================================
    // GRUPO 1: ACESSO AOS ITENS
    // =================================================

    await t.test(
      'Visitante pode consultar itens',
      async () => {
        await preparar();

        await assertSucceeds(
          visitante.doc('itens/item-teste').get()
        );
      }
    );

    await t.test(
      'Visitante não pode cadastrar itens',
      async () => {
        await preparar();

        await assertFails(
          visitante.doc('itens/item-visitante').set({
            titulo: 'Inválido',
            status: 'disponível',
          })
        );
      }
    );

    await t.test(
      'Aluno não pode cadastrar itens',
      async () => {
        await preparar();

        await assertFails(
          aluno.doc('itens/item-aluno').set({
            titulo: 'Inválido',
            status: 'disponível',
          })
        );
      }
    );

    await t.test(
      'Administrador pode cadastrar itens',
      async () => {
        await preparar();

        await assertSucceeds(
          admin.doc('itens/item-admin').set({
            titulo: 'Objeto do administrador',
            status: 'disponível',
            teveSolicitacoes: false,
            solicitacaoAtivaId: null,
          })
        );
      }
    );

    await t.test(
      'Aluno não pode modificar status diretamente',
      async () => {
        await preparar();

        await assertFails(
          aluno.doc('itens/item-teste').update({
            status: 'devolvido',
          })
        );
      }
    );

    await t.test(
      'Aluno não pode se promover a administrador',
      async () => {
        await preparar();

        await assertFails(
          aluno.doc('usuarios/aluno-teste').update({
            eAdmin: true,
          })
        );
      }
    );

    await t.test(
      'Aluno não pode criar autorização administrativa',
      async () => {
        await preparar();

        await assertFails(
          aluno.doc('administradores/aluno-teste').set({
            ativo: true,
          })
        );
      }
    );

    await t.test('Aluno só pode ler o próprio perfil', async () => {
      await preparar();
      await assertSucceeds(aluno.doc('usuarios/aluno-teste').get());
      await assertFails(aluno.doc('usuarios/outro-aluno').get());
    });

    await t.test('Aluno não pode listar perfis de terceiros', async () => {
      await preparar();
      await assertFails(aluno.collection('usuarios').get());
    });

    await t.test('Aluno não pode consultar matrícula de terceiro', async () => {
      await preparar();
      await assertSucceeds(aluno.doc('matriculas/20260001').get());
      await assertFails(aluno.doc('matriculas/20260002').get());
      await assertFails(aluno.collection('matriculas').get());
    });

    await t.test('Administrador não pode listar reservas de matrícula', async () => {
      await preparar();
      await assertFails(admin.collection('matriculas').get());
    });

    // =================================================
    // GRUPO 2: PRIVACIDADE DAS SOLICITAÇÕES
    // =================================================

    await t.test(
      'Aluno pode consultar sua solicitação',
      async () => {
        await preparar();

        await assertSucceeds(
          aluno.doc(
            'solicitacoesDevolucao/pedido-aluno'
          ).get()
        );
      }
    );

    await t.test(
      'Outro aluno não pode consultar pedido privado',
      async () => {
        await preparar();

        await assertFails(
          outroAluno.doc(
            'solicitacoesDevolucao/pedido-aluno'
          ).get()
        );
      }
    );

    await t.test(
      'Administrador pode consultar solicitações',
      async () => {
        await preparar();

        await assertSucceeds(
          admin.doc(
            'solicitacoesDevolucao/pedido-aluno'
          ).get()
        );
      }
    );

    await t.test(
      'Solicitação não expõe código de retirada',
      async () => {
        await preparar();
        await prepararReserva('privacidade');

        const pedido = await admin.doc(
          'solicitacoesDevolucao/pedido-privacidade'
        ).get();

        assert.equal(pedido.exists, true);

        assert.equal(
          Object.hasOwn(pedido.data(), 'codigo'),
          false
        );
      }
    );

    // =================================================
    // GRUPO 3: PROTEÇÃO DOS CÓDIGOS PRIVADOS
    // =================================================

    await t.test(
      'Somente o aluno dono pode ler seu código privado',
      async () => {
        await preparar();
        await prepararReserva('segredo-aluno');

        await assertSucceeds(
          aluno.doc(
            'codigosRetirada/pedido-segredo-aluno'
          ).get()
        );
      }
    );

    await t.test(
      'Administrador não pode ler código privado',
      async () => {
        await preparar();
        await prepararReserva('segredo-admin');

        await assertFails(
          admin.doc(
            'codigosRetirada/pedido-segredo-admin'
          ).get()
        );
      }
    );

    await t.test(
      'Visitante não pode ler código privado',
      async () => {
        await preparar();
        await prepararReserva('segredo-visitante');

        await assertFails(
          visitante.doc(
            'codigosRetirada/pedido-segredo-visitante'
          ).get()
        );
      }
    );

    await t.test(
      'Outro aluno não pode ler código privado',
      async () => {
        await preparar();
        await prepararReserva('segredo-terceiro');

        await assertFails(
          outroAluno.doc(
            'codigosRetirada/pedido-segredo-terceiro'
          ).get()
        );
      }
    );

    await t.test(
      'Aluno não pode criar código privado',
      async () => {
        await preparar();

        await assertFails(
          aluno.doc(
            'codigosRetirada/pedido-falso'
          ).set({
            codigo: CODIGO_VALIDO,
            usuarioId: 'aluno-teste',
            criadoEm: agora(),
          })
        );
      }
    );

    await t.test(
      'Administrador não pode criar código privado',
      async () => {
        await preparar();

        await assertFails(
          admin.doc(
            'codigosRetirada/pedido-falso'
          ).set({
            codigo: CODIGO_VALIDO,
            usuarioId: 'aluno-teste',
            criadoEm: agora(),
          })
        );
      }
    );

    await t.test(
      'Aluno não pode alterar código privado',
      async () => {
        await preparar();
        await prepararReserva('alterar-aluno');

        await assertFails(
          aluno.doc(
            'codigosRetirada/pedido-alterar-aluno'
          ).update({
            codigo: 'XYZ-789',
          })
        );
      }
    );

    await t.test(
      'Administrador não pode alterar código privado',
      async () => {
        await preparar();
        await prepararReserva('alterar-admin');

        await assertFails(
          admin.doc(
            'codigosRetirada/pedido-alterar-admin'
          ).update({
            codigo: 'XYZ-789',
          })
        );
      }
    );

    await t.test(
      'Aluno não pode excluir código privado',
      async () => {
        await preparar();
        await prepararReserva('excluir-aluno');

        await assertFails(
          aluno.doc(
            'codigosRetirada/pedido-excluir-aluno'
          ).delete()
        );
      }
    );

    await t.test(
      'Administrador não pode excluir código privado',
      async () => {
        await preparar();
        await prepararReserva('excluir-admin');

        await assertFails(
          admin.doc(
            'codigosRetirada/pedido-excluir-admin'
          ).delete()
        );
      }
    );

    await t.test(
      'Código privado permanece intacto após tentativa de alteração',
      async () => {
        await preparar();
        await prepararReserva('integridade');

        await assertFails(
          admin.doc(
            'codigosRetirada/pedido-integridade'
          ).update({
            codigo: 'XYZ-789',
          })
        );

        const segredo = await lerSemRegras(
          'codigosRetirada/pedido-integridade'
        );

        assert.equal(
          segredo.codigo,
          CODIGO_VALIDO
        );
      }
    );

    // =================================================
    // GRUPO 4: CRIAÇÃO DE SOLICITAÇÕES
    // =================================================

    await t.test(
      'Aluno não pode criar solicitação diretamente',
      async () => {
        await preparar();

        await assertFails(
          criarPedidoDiretamente(
            aluno,
            'item-teste',
            'pedido-direto'
          )
        );

        const pedido = await lerSemRegras(
          'solicitacoesDevolucao/pedido-direto'
        );

        assert.equal(pedido, null);
      }
    );

    await t.test(
      'Administrador não pode criar solicitação diretamente',
      async () => {
        await preparar();

        await assertFails(
          criarPedidoDiretamente(
            admin,
            'item-teste',
            'pedido-admin',
            'admin-teste',
            'Administrador Teste',
            '20260003'
          )
        );
      }
    );

    await t.test(
      'Visitante não pode criar solicitação',
      async () => {
        await preparar();

        await assertFails(
          visitante.doc(
            'solicitacoesDevolucao/pedido-visitante'
          ).set({
            itemId: 'item-teste',
            usuarioId: 'visitante',
            status: 'Pendente',
          })
        );
      }
    );

    await t.test(
      'Aluno não pode criar pedido isolado',
      async () => {
        await preparar();

        await assertFails(
          aluno.doc(
            'solicitacoesDevolucao/pedido-isolado'
          ).set({
            itemId: 'item-teste',
            itemTitulo: 'Garrafa de teste',
            usuarioId: 'aluno-teste',
            nomeUsuario: 'Aluno Teste',
            numeroCadastro: '20260001',
            status: 'Pendente',
            dataSolicitacao: agora(),
          })
        );
      }
    );

    await t.test(
      'Aluno não pode criar pedido com código embutido',
      async () => {
        await preparar();

        await assertFails(
          aluno.doc(
            'solicitacoesDevolucao/pedido-com-codigo'
          ).set({
            itemId: 'item-teste',
            itemTitulo: 'Garrafa de teste',
            usuarioId: 'aluno-teste',
            nomeUsuario: 'Aluno Teste',
            numeroCadastro: '20260001',
            codigo: CODIGO_VALIDO,
            status: 'Pendente',
            dataSolicitacao: agora(),
          })
        );
      }
    );

    await t.test(
      'Aluno não pode reservar item diretamente',
      async () => {
        await preparar();

        await assertFails(
          aluno.doc('itens/item-teste').update({
            status: 'em análise',
            solicitacaoAtivaId: 'pedido-inexistente',
            teveSolicitacoes: true,
          })
        );
      }
    );

    await t.test(
      'Administrador não pode reservar item diretamente',
      async () => {
        await preparar();

        await assertFails(
          admin.doc('itens/item-teste').update({
            status: 'em análise',
            solicitacaoAtivaId: 'pedido-inexistente',
            teveSolicitacoes: true,
          })
        );
      }
    );

    // =================================================
    // GRUPO 5: CANCELAMENTO
    // =================================================

    await t.test(
      'Dono cancela pedido pendente e libera item',
      async () => {
        await preparar();
        await prepararReserva('cancelamento');

        await assertSucceeds(
          finalizar(
            aluno,
            'cancelamento',
            'Cancelado',
            'disponível',
            {
              dataCancelamento: agora(),
            }
          )
        );

        const item = await aluno.doc(
          'itens/item-cancelamento'
        ).get();

        const pedido = await aluno.doc(
          'solicitacoesDevolucao/pedido-cancelamento'
        ).get();

        assert.equal(
          item.data().status,
          'disponível'
        );

        assert.equal(
          item.data().solicitacaoAtivaId,
          null
        );

        assert.equal(
          item.data().teveSolicitacoes,
          true
        );

        assert.equal(
          pedido.data().status,
          'Cancelado'
        );
      }
    );

    await t.test(
      'Outro aluno não pode cancelar pedido de terceiro',
      async () => {
        await preparar();
        await prepararReserva('terceiro');

        await assertFails(
          finalizar(
            outroAluno,
            'terceiro',
            'Cancelado',
            'disponível',
            {
              dataCancelamento: agora(),
            }
          )
        );
      }
    );

    await t.test(
      'Administrador não pode cancelar pedido de aluno diretamente',
      async () => {
        await preparar();
        await prepararReserva('cancelar-admin');

        await assertFails(
          finalizar(
            admin,
            'cancelar-admin',
            'Cancelado',
            'disponível',
            {
              dataCancelamento: agora(),
            }
          )
        );
      }
    );

    await t.test(
      'Cancelamento preserva código privado para tratamento pelo servidor',
      async () => {
        await preparar();
        await prepararReserva('codigo-cancelado');

        await assertSucceeds(
          finalizar(
            aluno,
            'codigo-cancelado',
            'Cancelado',
            'disponível',
            {
              dataCancelamento: agora(),
            }
          )
        );

        const segredo = await lerSemRegras(
          'codigosRetirada/pedido-codigo-cancelado'
        );

        assert.equal(
          segredo.codigo,
          CODIGO_VALIDO
        );
      }
    );

    // =================================================
    // GRUPO 6: CONFIRMAÇÃO E RECUSA
    // =================================================

    await t.test(
      'Aluno não pode confirmar retirada diretamente',
      async () => {
        await preparar();
        await prepararReserva('aluno-confirmar');

        await assertFails(
          finalizar(
            aluno,
            'aluno-confirmar',
            'Concluído',
            'devolvido',
            {
              dataAtendimento: agora(),
              atendidoPor: 'aluno-teste',
            }
          )
        );
      }
    );

    await t.test(
      'Administrador não pode confirmar diretamente',
      async () => {
        await preparar();
        await prepararReserva('admin-confirmar');

        await assertFails(
          finalizar(
            admin,
            'admin-confirmar',
            'Concluído',
            'devolvido',
            {
              dataAtendimento: agora(),
              atendidoPor: 'admin-teste',
            }
          )
        );

        const item = await admin.doc(
          'itens/item-admin-confirmar'
        ).get();

        const pedido = await admin.doc(
          'solicitacoesDevolucao/pedido-admin-confirmar'
        ).get();

        assert.equal(
          item.data().status,
          'em análise'
        );

        assert.equal(
          pedido.data().status,
          'Pendente'
        );
      }
    );

    await t.test(
  'Administrador pode recusar pedido e liberar item atomicamente',
  async () => {
    await preparar();
    await prepararReserva('admin-recusar');

    await assertSucceeds(
      finalizar(
        admin,
        'admin-recusar',
        'Recusado',
        'disponível',
        {
          dataAtendimento: agora(),
          atendidoPor: 'admin-teste',
        }
      )
    );

    const pedido = await admin.doc(
      'solicitacoesDevolucao/pedido-admin-recusar'
    ).get();

    const item = await admin.doc(
      'itens/item-admin-recusar'
    ).get();

    assert.equal(pedido.data().status, 'Recusado');
    assert.equal(item.data().status, 'disponível');
    assert.equal(item.data().solicitacaoAtivaId, null);
  }
);

    await t.test(
      'Aluno não pode concluir pedido por atualização simples',
      async () => {
        await preparar();
        await prepararReserva('aluno-direto');

        await assertFails(
          aluno.doc(
            'solicitacoesDevolucao/pedido-aluno-direto'
          ).update({
            status: 'Concluído',
            dataAtendimento: agora(),
            atendidoPor: 'aluno-teste',
          })
        );
      }
    );

    await t.test(
      'Administrador não pode concluir pedido por atualização simples',
      async () => {
        await preparar();
        await prepararReserva('admin-direto');

        await assertFails(
          admin.doc(
            'solicitacoesDevolucao/pedido-admin-direto'
          ).update({
            status: 'Concluído',
            dataAtendimento: agora(),
            atendidoPor: 'admin-teste',
          })
        );
      }
    );

    await t.test(
      'Administrador não pode recusar pedido por atualização simples',
      async () => {
        await preparar();
        await prepararReserva('recusa-direta');

        await assertFails(
          admin.doc(
            'solicitacoesDevolucao/pedido-recusa-direta'
          ).update({
            status: 'Recusado',
            dataAtendimento: agora(),
            atendidoPor: 'admin-teste',
          })
        );
      }
    );

    // =================================================
    // GRUPO 7: ADMINISTRAÇÃO
    // =================================================

    await t.test(
      'Admin promove aluno em batch atômico',
      async () => {
        await preparar();

        const batch = admin.batch();

        batch.set(
          admin.doc(
            'administradores/aluno-teste'
          ),
          {
            ativo: true,
            concedidoPor: 'admin-teste',
            dataConcessao: agora(),
          }
        );

        batch.update(
          admin.doc('usuarios/aluno-teste'),
          {
            tipo: 'admin',
            eAdmin: true,
          }
        );

        await assertSucceeds(batch.commit());

        const perfil = await admin.doc(
          'usuarios/aluno-teste'
        ).get();

        const autorizacao = await aluno.doc(
          'administradores/aluno-teste'
        ).get();

        assert.equal(perfil.data().tipo, 'admin');
        assert.equal(perfil.data().eAdmin, true);
        assert.equal(autorizacao.data().ativo, true);
      }
    );

    await t.test(
      'Aluno não promove outro aluno',
      async () => {
        await preparar();

        const batch = aluno.batch();

        batch.set(
          aluno.doc(
            'administradores/outro-aluno'
          ),
          {
            ativo: true,
            concedidoPor: 'aluno-teste',
            dataConcessao: agora(),
          }
        );

        batch.update(
          aluno.doc('usuarios/outro-aluno'),
          {
            tipo: 'admin',
            eAdmin: true,
          }
        );

        await assertFails(batch.commit());
      }
    );

    await t.test(
      'Admin não cria autorização isoladamente',
      async () => {
        await preparar();

        await assertFails(
          admin.doc(
            'administradores/aluno-teste'
          ).set({
            ativo: true,
            concedidoPor: 'admin-teste',
            dataConcessao: agora(),
          })
        );
      }
    );

    await t.test(
      'Admin não altera perfil isoladamente',
      async () => {
        await preparar();

        await assertFails(
          admin.doc('usuarios/aluno-teste').update({
            tipo: 'admin',
            eAdmin: true,
          })
        );
      }
    );

    await t.test(
      'Admin não altera próprio tipo de conta',
      async () => {
        await preparar();

        await assertFails(
          admin.doc('usuarios/admin-teste').update({
            tipo: 'usuario',
            eAdmin: false,
          })
        );
      }
    );

    await t.test(
      'Admin revoga permissão em batch',
      async () => {
        await preparar();

        const promover = admin.batch();

        promover.set(
          admin.doc(
            'administradores/aluno-teste'
          ),
          {
            ativo: true,
            concedidoPor: 'admin-teste',
            dataConcessao: agora(),
          }
        );

        promover.update(
          admin.doc('usuarios/aluno-teste'),
          {
            tipo: 'admin',
            eAdmin: true,
          }
        );

        await assertSucceeds(promover.commit());

        const revogar = admin.batch();

        revogar.update(
          admin.doc(
            'administradores/aluno-teste'
          ),
          {
            ativo: false,
            revogadoPor: 'admin-teste',
            dataRevogacao: agora(),
          }
        );

        revogar.update(
          admin.doc('usuarios/aluno-teste'),
          {
            tipo: 'usuario',
            eAdmin: false,
          }
        );

        await assertSucceeds(revogar.commit());

        const perfil = await aluno.doc(
          'usuarios/aluno-teste'
        ).get();

        const autorizacao = await aluno.doc(
          'administradores/aluno-teste'
        ).get();

        assert.equal(perfil.data().eAdmin, false);
        assert.equal(autorizacao.data().ativo, false);
      }
    );

    await t.test(
      'Aluno não revoga administrador',
      async () => {
        await preparar();

        const batch = aluno.batch();

        batch.update(
          aluno.doc(
            'administradores/admin-teste'
          ),
          {
            ativo: false,
            revogadoPor: 'aluno-teste',
            dataRevogacao: agora(),
          }
        );

        batch.update(
          aluno.doc('usuarios/admin-teste'),
          {
            tipo: 'usuario',
            eAdmin: false,
          }
        );

        await assertFails(batch.commit());
      }
    );

    await t.test(
      'Admin não revoga própria permissão',
      async () => {
        await preparar();

        const batch = admin.batch();

        batch.update(
          admin.doc(
            'administradores/admin-teste'
          ),
          {
            ativo: false,
            revogadoPor: 'admin-teste',
            dataRevogacao: agora(),
          }
        );

        batch.update(
          admin.doc('usuarios/admin-teste'),
          {
            tipo: 'usuario',
            eAdmin: false,
          }
        );

        await assertFails(batch.commit());
      }
    );

    await t.test(
      'Admin não desativa autorização isoladamente',
      async () => {
        await preparar();

        await assertFails(
          admin.doc(
            'administradores/admin-teste'
          ).update({
            ativo: false,
          })
        );
      }
    );

    await t.test(
      'Admin não rebaixa perfil isoladamente',
      async () => {
        await preparar();

        await assertFails(
          admin.doc('usuarios/admin-teste').update({
            tipo: 'usuario',
            eAdmin: false,
          })
        );
      }
    );

    await t.test(
      'Admin pode reativar conta revogada',
      async () => {
        await preparar();

        const promover = admin.batch();

        promover.set(
          admin.doc(
            'administradores/aluno-teste'
          ),
          {
            ativo: true,
            concedidoPor: 'admin-teste',
            dataConcessao: agora(),
          }
        );

        promover.update(
          admin.doc('usuarios/aluno-teste'),
          {
            tipo: 'admin',
            eAdmin: true,
          }
        );

        await assertSucceeds(promover.commit());

        const revogar = admin.batch();

        revogar.update(
          admin.doc(
            'administradores/aluno-teste'
          ),
          {
            ativo: false,
            revogadoPor: 'admin-teste',
            dataRevogacao: agora(),
          }
        );

        revogar.update(
          admin.doc('usuarios/aluno-teste'),
          {
            tipo: 'usuario',
            eAdmin: false,
          }
        );

        await assertSucceeds(revogar.commit());

        const reativar = admin.batch();

        reativar.update(
          admin.doc(
            'administradores/aluno-teste'
          ),
          {
            ativo: true,
            concedidoPor: 'admin-teste',
            dataConcessao: agora(),
            revogadoPor:
              firebase.firestore.FieldValue.delete(),
            dataRevogacao:
              firebase.firestore.FieldValue.delete(),
          }
        );

        reativar.update(
          admin.doc('usuarios/aluno-teste'),
          {
            tipo: 'admin',
            eAdmin: true,
          }
        );

        await assertSucceeds(reativar.commit());

        const autorizacao = await aluno.doc(
          'administradores/aluno-teste'
        ).get();

        assert.equal(autorizacao.data().ativo, true);
      }
    );

    // =================================================
    // GRUPO 8: EDIÇÃO ADMINISTRATIVA DOS ITENS
    // =================================================

    await t.test(
      'Admin pode editar título e descrição',
      async () => {
        await preparar();

        await assertSucceeds(
          admin.doc('itens/item-teste').update({
            titulo: 'Garrafa azul',
            descricao: 'Encontrada na biblioteca',
          })
        );

        const item = await admin.doc(
          'itens/item-teste'
        ).get();

        assert.equal(
          item.data().titulo,
          'Garrafa azul'
        );

        assert.equal(
          item.data().status,
          'disponível'
        );
      }
    );

    await t.test(
      'Aluno não pode editar informações do item',
      async () => {
        await preparar();

        await assertFails(
          aluno.doc('itens/item-teste').update({
            titulo: 'Alteração não autorizada',
          })
        );
      }
    );

    await t.test(
      'Admin não pode alterar status diretamente',
      async () => {
        await preparar();

        await assertFails(
          admin.doc('itens/item-teste').update({
            status: 'devolvido',
          })
        );
      }
    );

    await t.test(
      'Admin não pode modificar solicitação ativa diretamente',
      async () => {
        await preparar();

        await assertFails(
          admin.doc('itens/item-teste').update({
            solicitacaoAtivaId: 'pedido-falso',
          })
        );
      }
    );

    // =================================================
    // GRUPO 9: MATRÍCULAS E PERFIS
    // =================================================

    await t.test(
      'Aluno cria perfil e matrícula juntos',
      async () => {
        await preparar();

        await assertSucceeds(
          criarCadastro(
            alunoNovo,
            'aluno-novo',
            'novo@teste.com',
            'Aluno Novo',
            '20269999'
          )
        );

        const perfil = await alunoNovo.doc(
          'usuarios/aluno-novo'
        ).get();

        const matricula = await alunoNovo.doc(
          'matriculas/20269999'
        ).get();

        assert.equal(perfil.exists, true);
        assert.equal(matricula.exists, true);

        assert.equal(
          perfil.data().numeroCadastro,
          '20269999'
        );

        assert.equal(
          matricula.data().uid,
          'aluno-novo'
        );

        assert.equal(
          perfil.data().eAdmin,
          false
        );
      }
    );

    await t.test(
      'Aluno não pode reservar matrícula isoladamente',
      async () => {
        await preparar();

        await assertFails(
          alunoNovo.doc(
            'matriculas/20269998'
          ).set({
            uid: 'aluno-novo',
            criadoEm: agora(),
          })
        );
      }
    );

    await t.test(
      'Aluno não pode criar perfil sem matrícula',
      async () => {
        await preparar();

        await assertFails(
          alunoNovo.doc(
            'usuarios/aluno-novo'
          ).set({
            nome: 'Aluno Novo',
            email: 'novo@teste.com',
            numeroCadastro: '20269997',
            tipo: 'usuario',
            eAdmin: false,
            dataCriacao: agora(),
          })
        );
      }
    );

    await t.test(
      'Matrícula duplicada é recusada',
      async () => {
        await preparar();

        await assertFails(
          criarCadastro(
            alunoDuplicado,
            'aluno-duplicado',
            'duplicado@teste.com',
            'Aluno Duplicado',
            '20260001'
          )
        );

        const perfilDuplicado = await alunoDuplicado.doc(
          'usuarios/aluno-duplicado'
        ).get();

        assert.equal(
          perfilDuplicado.exists,
          false
        );

        const matriculaOriginal = await aluno.doc(
          'matriculas/20260001'
        ).get();

        assert.equal(
          matriculaOriginal.data().uid,
          'aluno-teste'
        );
      }
    );

    await t.test(
      'Aluno não pode alterar própria matrícula',
      async () => {
        await preparar();

        await assertFails(
          aluno.doc('usuarios/aluno-teste').update({
            numeroCadastro: '20269996',
          })
        );

        const perfil = await aluno.doc(
          'usuarios/aluno-teste'
        ).get();

        assert.equal(
          perfil.data().numeroCadastro,
          '20260001'
        );
      }
    );

    await t.test(
      'Aluno não pode ler matrícula de terceiro',
      async () => {
        await preparar();

        await assertFails(
          outroAluno.doc(
            'matriculas/20260001'
          ).get()
        );

        await assertSucceeds(
          aluno.doc(
            'matriculas/20260001'
          ).get()
        );
      }
    );

  });
} finally {
  await ambiente.cleanup();
}


