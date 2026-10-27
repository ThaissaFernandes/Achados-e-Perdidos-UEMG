
import { alunos, admin, itens, registros } from './demo-data.mjs';

/**
 * Base fictícia para o TCC:
 * Achados e Perdidos UEMG — Campus Divinópolis.
 *
 * EXECUÇÃO EXCLUSIVA NOS EMULADORES LOCAIS:
 *
 * Firebase Authentication: 127.0.0.1:9099
 * Cloud Firestore:        127.0.0.1:8080
 *
 * Requisitos:
 * - Node.js 18 ou superior.
 * - Firebase Emulator Suite em execução.
 *
 * Não utiliza Firebase de produção,
 * Firebase Admin SDK ou Cloud Functions.
 */

// =====================================================
// CONFIGURAÇÕES DOS EMULADORES
// =====================================================

const PROJECT_ID = 'achados-e-perdidos-uemg';

const AUTH = 'http://127.0.0.1:9099';
const FIRESTORE = 'http://127.0.0.1:8080';

const ROOT =
  `${FIRESTORE}/v1/projects/${PROJECT_ID}` +
  '/databases/(default)/documents';

// Senha usada somente nas contas fictícias locais.
const SENHA = 'DemoTcc@2026!';

const emailDe = (slug) => `${slug}@demo.invalid`;

// =====================================================
// CONVERTER VALORES PARA O FORMATO FIRESTORE REST
// =====================================================

function fv(valor) {
  if (valor === null || valor === undefined) {
    return { nullValue: null };
  }

  if (valor instanceof Date) {
    return {
      timestampValue: valor.toISOString(),
    };
  }

  if (typeof valor === 'string') {
    return {
      stringValue: valor,
    };
  }

  if (typeof valor === 'boolean') {
    return {
      booleanValue: valor,
    };
  }

  if (typeof valor === 'number') {
    return Number.isInteger(valor)
      ? { integerValue: String(valor) }
      : { doubleValue: valor };
  }

  if (Array.isArray(valor)) {
    return {
      arrayValue: {
        values: valor.map(fv),
      },
    };
  }

  if (typeof valor === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(valor).map(
            ([chave, conteudo]) => [
              chave,
              fv(conteudo),
            ]
          )
        ),
      },
    };
  }

  throw new Error(
    `Tipo de dado não suportado: ${typeof valor}`
  );
}

// =====================================================
// REALIZAR REQUISIÇÕES HTTP
// =====================================================

async function request(url, configuracao = {}) {
  const resposta = await fetch(url, configuracao);
  const conteudo = await resposta.text();

  let dados;

  try {
    dados = JSON.parse(conteudo);
  } catch {
    dados = conteudo;
  }

  if (!resposta.ok) {
    throw new Error(
      `${resposta.status} ${url}: ` +
      JSON.stringify(dados).slice(0, 500)
    );
  }

  return dados;
}

// =====================================================
// GRAVAR DOCUMENTOS NO FIRESTORE EMULATOR
// =====================================================

async function gravar(caminho, dados) {
  const fields = Object.fromEntries(
    Object.entries(dados).map(
      ([chave, valor]) => [
        chave,
        fv(valor),
      ]
    )
  );

  return request(`${ROOT}/${caminho}`, {
    method: 'PATCH',

    headers: {
      'Content-Type': 'application/json',

      // Credencial especial do Firestore Emulator.
      // Nunca utilizar em uma aplicação pública.
      Authorization: 'Bearer owner',
    },

    body: JSON.stringify({ fields }),
  });
}

// =====================================================
// CRIAR OU REUTILIZAR CONTAS DE DEMONSTRAÇÃO
// =====================================================

async function autenticar(slug) {
  const email = emailDe(`tcc-${slug}`);

  try {
    return await request(
      `${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password: SENHA,
          returnSecureToken: true,
        }),
      }
    );
  } catch (erro) {
    if (!String(erro.message).includes('EMAIL_EXISTS')) {
      throw erro;
    }

    // Se a conta já existe, reutiliza seu UID.
    return request(
      `${AUTH}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=emulator`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password: SENHA,
          returnSecureToken: true,
        }),
      }
    );
  }
}

// =====================================================
// VERIFICAR DISPONIBILIDADE DOS EMULADORES
// =====================================================

async function verificarEmuladores() {
  const servicos = [
    ['Authentication', AUTH],
    ['Firestore', FIRESTORE],
  ];

  for (const [nome, endereco] of servicos) {
    try {
      await fetch(endereco, {
        signal: AbortSignal.timeout(2500),
      });
    } catch {
      throw new Error(
        `Emulador ${nome} indisponível em ${endereco}. ` +
        'Execute firebase emulators:start --only auth,firestore'
      );
    }
  }
}

// =====================================================
// DATAS FICTÍCIAS
// =====================================================

const quando = (dias) =>
  new Date(Date.now() - dias * 86400000);

// =====================================================
// FUNÇÃO PRINCIPAL
// =====================================================

async function main() {
  console.log(
    `Criando base fictícia SOMENTE nos emuladores de ${PROJECT_ID}`
  );

  await verificarEmuladores();

  const contas = {};

  // ===================================================
  // 1. CRIAR CONTAS E MATRÍCULAS
  // ===================================================

  for (const [slug, nome, matricula] of [
    ...alunos,
    admin,
  ]) {
    const conta = await autenticar(slug);
    const uid = conta.localId;

    contas[slug] = {
      uid,
      nome,
      matricula,
      email: emailDe(`tcc-${slug}`),
    };

    await gravar(`usuarios/${uid}`, {
      nome,
      email: contas[slug].email,
      numeroCadastro: matricula,
      tipo: 'usuario',
      eAdmin: false,
      dataCriacao: quando(15),
      demonstracaoTcc: true,
    });

    await gravar(`matriculas/${matricula}`, {
      uid,
      criadoEm: quando(15),
    });

    console.log(
      `Conta criada ou reutilizada: ${contas[slug].email}`
    );
  }

  // ===================================================
  // 2. CONFIGURAR ADMINISTRADOR
  // ===================================================

  await gravar(
    `administradores/${contas.admin.uid}`,
    {
      ativo: true,
      demonstracaoTcc: true,
    }
  );

  console.log(
    'Administrador demonstrativo configurado.'
  );

  // ===================================================
  // 3. CADASTRAR CATEGORIAS
  // ===================================================

  const categorias = [
    ...new Set(
      itens.map((item) => item[2])
    ),
  ];

  for (
    const [indice, nome] of categorias.entries()
  ) {
    await gravar(
      `categorias/tcc-demo-${indice + 1}`,
      {
        nome,
        ativo: true,
        demonstracaoTcc: true,
      }
    );
  }

  console.log(
    `${categorias.length} categorias cadastradas.`
  );

  // ===================================================
  // 4. CADASTRAR LOCAIS
  // ===================================================

  const locais = [
    ...new Set(
      itens.map((item) => item[3])
    ),
  ];

  for (
    const [indice, nome] of locais.entries()
  ) {
    await gravar(
      `locais/tcc-demo-${indice + 1}`,
      {
        nome,

        // Campo esperado pelo serviço de locais.
        status: true,

        // Mantido para compatibilidade com
        // outros pontos da aplicação.
        ativo: true,

        demonstracaoTcc: true,
      }
    );
  }

  console.log(
    `${locais.length} locais cadastrados e ativados.`
  );

  // ===================================================
  // 5. CADASTRAR OS 18 OBJETOS FICTÍCIOS
  // ===================================================

  for (const [
    indice,
    [
      slug,
      titulo,
      categoriaId,
      localEncontrado,
      descricao,
    ],
  ] of itens.entries()) {
    const registro = registros.find(
      (solicitacao) => solicitacao.slug === slug
    );

    const pedidoPendente =
      registro?.status === 'Pendente';

    const status = pedidoPendente
      ? 'em análise'
      : registro?.status === 'Concluído'
        ? 'devolvido'
        : 'disponível';

    await gravar(
      `itens/tcc-demo-${slug}`,
      {
        titulo,
        descricao,
        categoriaId,
        localEncontrado,
        fotoUrl: '',
        status,

        solicitacaoAtivaId: pedidoPendente
          ? `tcc-demo-${slug}`
          : null,

        dataCadastro: quando(indice + 1),
        criadoPor: contas.admin.uid,
        demonstracaoTcc: true,
      }
    );
  }

  console.log(
    `${itens.length} objetos fictícios cadastrados.`
  );

  // ===================================================
  // 6. CADASTRAR SOLICITAÇÕES FICTÍCIAS
  // ===================================================

  for (const [
    indice,
    registro,
  ] of registros.entries()) {
    const aluno = contas[registro.aluno];

    if (!aluno) {
      throw new Error(
        `Aluno fictício não encontrado: ${registro.aluno}`
      );
    }

    const item = itens.find(
      (objeto) => objeto[0] === registro.slug
    );

    if (!item) {
      throw new Error(
        `Item fictício não encontrado: ${registro.slug}`
      );
    }

    const codigo =
      `DEMO${String(indice + 1).padStart(4, '0')}`;

    const dados = {
      itemId: `tcc-demo-${registro.slug}`,
      itemTitulo: item[1],

      usuarioId: aluno.uid,
      nomeUsuario: aluno.nome,
      numeroCadastro: aluno.matricula,

      codigo,
      status: registro.status,

      dataSolicitacao: quando(registro.dias),
      demonstracaoTcc: true,
    };

    if (
      registro.status === 'Concluído' ||
      registro.status === 'Recusado'
    ) {
      dados.atendidoPor = contas.admin.uid;
      dados.dataAtendimento = quando(
        registro.dias - 1
      );
    }

    if (registro.status === 'Cancelado') {
      dados.dataCancelamento = quando(
        registro.dias - 1
      );
    }

    await gravar(
      `solicitacoesDevolucao/tcc-demo-${registro.slug}`,
      dados
    );
  }

  console.log(
    `${registros.length} solicitações fictícias cadastradas.`
  );

  // ===================================================
  // RESULTADO FINAL
  // ===================================================

  console.log(
    '\n============================================'
  );

  console.log(
    'BASE DEMONSTRATIVA CRIADA COM SUCESSO!'
  );

  console.log(
    '============================================'
  );

  console.log(`Objetos: ${itens.length}`);
  console.log(`Contas: ${alunos.length + 1}`);
  console.log(`Solicitações: ${registros.length}`);
  console.log(`Categorias: ${categorias.length}`);
  console.log(`Locais: ${locais.length}`);

  console.log(
    '\nSenha exclusiva dos usuários do emulador:',
    SENHA
  );

  console.log(
    '\nATENÇÃO: esta base é apenas para o ambiente local.'
  );

  console.log(
    'Não execute scripts administrativos no navegador.'
  );
}

// =====================================================
// EXECUTAR SCRIPT
// =====================================================

main().catch((erro) => {
  console.error(
    '\nFALHA:',
    erro.message
  );

  process.exitCode = 1;
});
