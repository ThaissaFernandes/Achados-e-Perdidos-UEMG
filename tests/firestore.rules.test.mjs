
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

// Projeto fictício, separado do Firebase real.
// Os testes usam apenas o Firestore Emulator.

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

// Usuários adicionais para testar matrículas.
const alunoNovo = ambiente.authenticatedContext(
  'aluno-novo',
  { email: 'novo@teste.com' }
).firestore();

const alunoDuplicado = ambiente.authenticatedContext(
  'aluno-duplicado',
  { email: 'duplicado@teste.com' }
).firestore();

// =====================================================
// 3. FUNÇÕES AUXILIARES
// =====================================================

const agora = () =>
  firebase.firestore.FieldValue.serverTimestamp();

// =====================================================
// PREPARAR DADOS DE TESTE
// =====================================================

async function preparar() {
  await ambiente.clearFirestore();

  await ambiente.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();

    await Promise.all([
      db.doc('administradores/admin-teste').set({
        ativo: true,
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
      }),

      db.doc('solicitacoesDevolucao/pedido-aluno').set({
        usuarioId: 'aluno-teste',
        itemId: 'item-teste',
        status: 'Pendente',
      }),

      // Matrículas fictícias já reservadas.
      db.doc('matriculas/20260001').set({
        uid: 'aluno-teste',
        criadoEm: firebase.firestore.Timestamp.now(),
      }),

      db.doc('matriculas/20260002').set({
        uid: 'outro-aluno',
        criadoEm: firebase.firestore.Timestamp.now(),
      }),
    ]);
  });
}

// =====================================================
// CRIAR RESERVA FICTÍCIA
// =====================================================

async function prepararReserva(
  id,
  donoUid = 'aluno-teste'
) {
  await ambiente.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();

    const nomeUsuario =
      donoUid === 'aluno-teste'
        ? 'Aluno Teste'
        : 'Outro Aluno';

    const numeroCadastro =
      donoUid === 'aluno-teste'
        ? '20260001'
        : '20260002';

    await Promise.all([
      db.doc(`itens/item-${id}`).set({
        titulo: `Objeto ${id}`,
        descricao: 'Objeto usado no teste',
        categoriaId: 'Objetos pessoais',
        localEncontrado: 'Biblioteca',
        fotoUrl: '',
        status: 'em análise',
        solicitacaoAtivaId: `pedido-${id}`,
      }),

      db.doc(`solicitacoesDevolucao/pedido-${id}`).set({
        itemId: `item-${id}`,
        itemTitulo: `Objeto ${id}`,
        usuarioId: donoUid,
        nomeUsuario,
        numeroCadastro,
        codigo: '123456',
        status: 'Pendente',
        dataSolicitacao: firebase.firestore.Timestamp.now(),
      }),
    ]);
  });
}

// =====================================================
// CRIAR SOLICITAÇÃO DE DEVOLUÇÃO
// =====================================================

async function criarPedido(
  db,
  itemId,
  pedidoId,
  uid = 'aluno-teste',
  nome = 'Aluno Teste',
  matricula = '20260001'
) {
  return db.runTransaction(async (tx) => {
    const itemRef = db.doc(`itens/${itemId}`);
    const usuarioRef = db.doc(`usuarios/${uid}`);

    const pedidoRef = db.doc(
      `solicitacoesDevolucao/${pedidoId}`
    );

    const perfil = await tx.get(usuarioRef);
    const item = await tx.get(itemRef);

    if (
      !perfil.exists ||
      !item.exists ||
      item.data().status !== 'disponível' ||
      item.data().solicitacaoAtivaId != null
    ) {
      throw new Error('ITEM_INDISPONIVEL');
    }

    tx.set(pedidoRef, {
      itemId,
      itemTitulo: item.data().titulo,
      usuarioId: uid,
      nomeUsuario: nome,
      numeroCadastro: matricula,
      codigo: '123456',
      status: 'Pendente',
      dataSolicitacao: agora(),
    });

    tx.update(itemRef, {
      status: 'em análise',
      solicitacaoAtivaId: pedidoId,
    });
  });
}

// =====================================================
// FINALIZAR SOLICITAÇÃO
// =====================================================

async function finalizar(
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
// CADASTRAR PERFIL E MATRÍCULA JUNTOS
// =====================================================

// Utiliza um batch para testar as regras de
// criação atômica.
//
// O usuarioService.js utiliza uma transação,
// mas as regras getAfter() também devem funcionar
// quando os dois documentos são gravados juntos.

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
// 4. TESTES AUTOMATIZADOS
// =====================================================

try {
  await test('Segurança do Firestore', async (t) => {
    await preparar();

    // =================================================
    // GRUPO 1: TESTES DE ACESSO
    // =================================================

    await t.test(
      'Visitante pode consultar itens',
      async () => {
        await assertSucceeds(
          visitante.doc('itens/item-teste').get()
        );
      }
    );

    await t.test(
      'Visitante não pode cadastrar itens',
      async () => {
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
        await assertSucceeds(
          admin.doc('itens/item-admin').set({
            titulo: 'Objeto do administrador',
            status: 'disponível',
          })
        );
      }
    );

    await t.test(
      'Aluno não pode modificar status diretamente',
      async () => {
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
        await assertFails(
          aluno.doc('administradores/aluno-teste').set({
            ativo: true,
          })
        );
      }
    );

    await t.test(
      'Outro usuário não pode consultar pedido privado',
      async () => {
        await assertFails(
          outroAluno
            .doc('solicitacoesDevolucao/pedido-aluno')
            .get()
        );
      }
    );

    await t.test(
      'Administrador pode consultar solicitações',
      async () => {
        await assertSucceeds(
          admin
            .doc('solicitacoesDevolucao/pedido-aluno')
            .get()
        );
      }
    );

    // =================================================
    // GRUPO 2: TESTES DAS SOLICITAÇÕES
    // =================================================

    await t.test(
      'Aluno solicita item e reserva na mesma transação',
      async () => {
        await assertSucceeds(
          criarPedido(
            aluno,
            'item-teste',
            'pedido-novo'
          )
        );

        const item = await aluno
          .doc('itens/item-teste')
          .get();

        const pedido = await aluno
          .doc('solicitacoesDevolucao/pedido-novo')
          .get();

        assert.equal(
          item.data().status,
          'em análise'
        );

        assert.equal(
          item.data().solicitacaoAtivaId,
          'pedido-novo'
        );

        assert.equal(
          pedido.data().status,
          'Pendente'
        );
      }
    );

    await t.test(
      'Reserva sem criar pedido correspondente é negada',
      async () => {
        await ambiente.withSecurityRulesDisabled(
          async (ctx) => {
            await ctx.firestore()
              .doc('itens/item-sozinho')
              .set({
                titulo: 'Item sozinho',
                status: 'disponível',
              });
          }
        );

        await assertFails(
          aluno.doc('itens/item-sozinho').update({
            status: 'em análise',
            solicitacaoAtivaId: 'pedido-inexistente',
          })
        );
      }
    );

    await t.test(
      'Criar pedido sem atualizar item é negado',
      async () => {
        await ambiente.withSecurityRulesDisabled(
          async (ctx) => {
            await ctx.firestore()
              .doc('itens/item-isolado')
              .set({
                titulo: 'Item isolado',
                status: 'disponível',
              });
          }
        );

        await assertFails(
          aluno
            .doc('solicitacoesDevolucao/pedido-isolado')
            .set({
              itemId: 'item-isolado',
              itemTitulo: 'Item isolado',
              usuarioId: 'aluno-teste',
              nomeUsuario: 'Aluno Teste',
              numeroCadastro: '20260001',
              codigo: '123456',
              status: 'Pendente',
              dataSolicitacao: agora(),
            })
        );
      }
    );

    await t.test(
      'Outro aluno não consegue cancelar pedido de terceiro',
      async () => {
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
      'Dono cancela pedido pendente e libera item',
      async () => {
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

        const item = await aluno
          .doc('itens/item-cancelamento')
          .get();

        const pedido = await aluno
          .doc('solicitacoesDevolucao/pedido-cancelamento')
          .get();

        assert.equal(
          item.data().status,
          'disponível'
        );

        assert.equal(
          item.data().solicitacaoAtivaId,
          null
        );

        assert.equal(
          pedido.data().status,
          'Cancelado'
        );
      }
    );

    await t.test(
      'Aluno não consegue confirmar retirada',
      async () => {
        await prepararReserva('nao-confirmar');

        await assertFails(
          finalizar(
            aluno,
            'nao-confirmar',
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
      'Admin confirma e finaliza a entrega',
      async () => {
        await prepararReserva('confirmar');

        await assertSucceeds(
          finalizar(
            admin,
            'confirmar',
            'Concluído',
            'devolvido',
            {
              dataAtendimento: agora(),
              atendidoPor: 'admin-teste',
            }
          )
        );

        const item = await admin
          .doc('itens/item-confirmar')
          .get();

        assert.equal(
          item.data().status,
          'devolvido'
        );

        assert.equal(
          item.data().solicitacaoAtivaId,
          null
        );
      }
    );

    await t.test(
      'Admin recusa e devolve item ao catálogo',
      async () => {
        await prepararReserva('recusar');

        await assertSucceeds(
          finalizar(
            admin,
            'recusar',
            'Recusado',
            'disponível',
            {
              dataAtendimento: agora(),
              atendidoPor: 'admin-teste',
            }
          )
        );

        const item = await admin
          .doc('itens/item-recusar')
          .get();

        assert.equal(
          item.data().status,
          'disponível'
        );

        assert.equal(
          item.data().solicitacaoAtivaId,
          null
        );
      }
    );

    await t.test(
      'Segundo pedido pelo mesmo item é rejeitado',
      async () => {
        await ambiente.withSecurityRulesDisabled(
          async (ctx) => {
            await ctx.firestore()
              .doc('itens/item-concorrente')
              .set({
                titulo: 'Item concorrente',
                status: 'disponível',
              });
          }
        );

        const resultados = await Promise.allSettled([
          criarPedido(
            aluno,
            'item-concorrente',
            'pedido-concorrente-1'
          ),

          criarPedido(
            outroAluno,
            'item-concorrente',
            'pedido-concorrente-2',
            'outro-aluno',
            'Outro Aluno',
            '20260002'
          ),
        ]);

        const sucessos = resultados.filter(
          (resultado) =>
            resultado.status === 'fulfilled'
        );

        assert.equal(
          sucessos.length,
          1,
          'Somente uma solicitação deve ser aceita.'
        );
      }
    );

    // =================================================
    // GRUPO 3: EDIÇÃO ADMINISTRATIVA
    // =================================================

    await t.test(
      'Admin pode editar título e descrição do item',
      async () => {
        await preparar();

        await assertSucceeds(
          admin.doc('itens/item-teste').update({
            titulo: 'Garrafa azul',
            descricao: 'Encontrada na biblioteca',
          })
        );

        const item = await admin
          .doc('itens/item-teste')
          .get();

        assert.equal(
          item.data().titulo,
          'Garrafa azul'
        );

        assert.equal(
          item.data().descricao,
          'Encontrada na biblioteca'
        );

        assert.equal(
          item.data().status,
          'disponível'
        );

        assert.equal(
          item.data().solicitacaoAtivaId,
          null
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
    // GRUPO 4: MATRÍCULAS E DADOS PESSOAIS
    // ETAPA 3 DE 6
    // =================================================

    // -------------------------------------------------
    // TESTE 1: CADASTRO VÁLIDO
    // -------------------------------------------------

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

        const perfil = await alunoNovo
          .doc('usuarios/aluno-novo')
          .get();

        const matricula = await alunoNovo
          .doc('matriculas/20269999')
          .get();

        assert.equal(
          perfil.exists,
          true
        );

        assert.equal(
          matricula.exists,
          true
        );

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

    // -------------------------------------------------
    // TESTE 2: MATRÍCULA SEM PERFIL
    // -------------------------------------------------

    await t.test(
      'Aluno não pode reservar matrícula sem perfil correspondente',
      async () => {
        await preparar();

        await assertFails(
          alunoNovo
            .doc('matriculas/20269998')
            .set({
              uid: 'aluno-novo',
              criadoEm: agora(),
            })
        );
      }
    );

    // -------------------------------------------------
    // TESTE 3: PERFIL SEM MATRÍCULA
    // -------------------------------------------------

    await t.test(
      'Aluno não pode criar perfil sem reserva da matrícula',
      async () => {
        await preparar();

        await assertFails(
          alunoNovo
            .doc('usuarios/aluno-novo')
            .set({
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

    // -------------------------------------------------
    // TESTE 4: MATRÍCULA DUPLICADA
    // -------------------------------------------------

    await t.test(
      'Matrícula duplicada é recusada sem criar outro perfil',
      async () => {
        await preparar();

        // A matrícula 20260001 já pertence
        // a aluno-teste.

        await assertFails(
          criarCadastro(
            alunoDuplicado,
            'aluno-duplicado',
            'duplicado@teste.com',
            'Aluno Duplicado',
            '20260001'
          )
        );

        // A tentativa recusada não pode criar
        // um segundo perfil.

        const perfilDuplicado = await alunoDuplicado
          .doc('usuarios/aluno-duplicado')
          .get();

        assert.equal(
          perfilDuplicado.exists,
          false
        );

        // Confere que a matrícula continua
        // pertencendo ao dono original.

        const matriculaOriginal = await aluno
          .doc('matriculas/20260001')
          .get();

        assert.equal(
          matriculaOriginal.data().uid,
          'aluno-teste'
        );
      }
    );

    // -------------------------------------------------
    // TESTE 5: ALTERAÇÃO DE MATRÍCULA
    // -------------------------------------------------

    await t.test(
      'Aluno não pode alterar matrícula do próprio perfil',
      async () => {
        await preparar();

        await assertFails(
          aluno
            .doc('usuarios/aluno-teste')
            .update({
              numeroCadastro: '20269996',
            })
        );

        const perfil = await aluno
          .doc('usuarios/aluno-teste')
          .get();

        assert.equal(
          perfil.data().numeroCadastro,
          '20260001'
        );
      }
    );

    // -------------------------------------------------
    // TESTE 6: PRIVACIDADE DA MATRÍCULA
    // -------------------------------------------------

    await t.test(
      'Aluno não pode ler matrícula pertencente a outro usuário',
      async () => {
        await preparar();

        await assertFails(
          outroAluno
            .doc('matriculas/20260001')
            .get()
        );

        // O proprietário continua podendo
        // consultar sua própria matrícula.

        await assertSucceeds(
          aluno
            .doc('matriculas/20260001')
            .get()
        );
      }
    );

  });
} finally {
  await ambiente.cleanup();
}
