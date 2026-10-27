
/**
 * BASE DEMONSTRATIVA DO TCC
 * Achados e Perdidos UEMG — Campus Divinópolis
 *
 * Projeto Firebase real:
 * achados-e-perdidos-uemg
 *
 * MODOS:
 * --dry-run  Verifica conflitos sem modificar dados.
 * --aplicar  Cria somente registros demonstrativos novos.
 *
 * SEGURANÇA:
 * - Não sobrescreve documentos existentes.
 * - Não reutiliza contas comuns como contas de teste.
 * - Não assume matrículas de outros usuários.
 * - Não promove contas reais a administradores.
 * - Não utiliza os emuladores.
 * - Exige confirmação explícita para aplicar.
 * - Utiliza senhas diferentes para estudantes e admin.
 *
 * Execute somente em um computador confiável.
 * Nunca importe este script no código React.
 */

import {
  initializeApp,
  cert,
} from 'firebase-admin/app';

import {
  getAuth,
} from 'firebase-admin/auth';

import {
  getFirestore,
  Timestamp,
} from 'firebase-admin/firestore';

import {
  readFile,
} from 'node:fs/promises';

import {
  resolve,
} from 'node:path';

import {
  alunos,
  admin,
  itens,
  registros,
} from './demo-data.mjs';

// =====================================================
// 1. CONFIGURAÇÕES
// =====================================================

const PROJETO_PERMITIDO = 'achados-e-perdidos-uemg';

const DOMINIO_DEMONSTRACAO = 'example.com';

const PREFIXO = 'tcc-demo-';

const argumentos = process.argv.slice(2);

const dryRun = argumentos.includes('--dry-run');
const aplicar = argumentos.includes('--aplicar');

const projetoInformado =
  process.env.DEMO_TCC_PROJECT_ID?.trim();

const caminhoCredencial =
  process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();

const senhaAluno =
  process.env.DEMO_TCC_PASSWORD;

const senhaAdmin =
  process.env.DEMO_TCC_ADMIN_PASSWORD;

// =====================================================
// 2. FUNÇÕES DE SEGURANÇA
// =====================================================

function abortar(mensagem) {
  throw new Error(mensagem);
}

function garantir(condicao, mensagem) {
  if (!condicao) {
    abortar(mensagem);
  }
}

function validarSenha(senha, descricao) {
  garantir(
    typeof senha === 'string' &&
      senha.length >= 14,
    `${descricao} deve possuir pelo menos 14 caracteres.`
  );
}

function idSeguro(id) {
  garantir(
    typeof id === 'string' &&
      id.length > 0 &&
      !id.includes('/'),
    `Identificador de documento inválido: ${id}`
  );

  return id;
}

// =====================================================
// 3. VALIDAR ARGUMENTOS
// =====================================================

garantir(
  dryRun !== aplicar,
  'Informe exatamente um modo: --dry-run ou --aplicar.'
);

garantir(
  projetoInformado === PROJETO_PERMITIDO,
  `Projeto incorreto. Este script aceita somente ${PROJETO_PERMITIDO}.`
);

garantir(
  Boolean(caminhoCredencial),
  'Configure GOOGLE_APPLICATION_CREDENTIALS.'
);

garantir(
  !process.env.FIRESTORE_EMULATOR_HOST &&
    !process.env.FIREBASE_AUTH_EMULATOR_HOST,
  'Variáveis de emulador detectadas. Este script acessa somente o Firebase real.'
);

if (aplicar) {
  garantir(
    argumentos.includes(
      `--confirmar-projeto=${PROJETO_PERMITIDO}`
    ),
    'Confirmação do projeto ausente.'
  );

  garantir(
    argumentos.includes('--confirmar-base-ficticia'),
    'Confirmação da base fictícia ausente.'
  );

  garantir(
    argumentos.includes(
      '--aceito-dados-no-projeto-existente'
    ),
    'É necessário confirmar o uso do Firebase original.'
  );

  validarSenha(
    senhaAluno,
    'DEMO_TCC_PASSWORD'
  );

  validarSenha(
    senhaAdmin,
    'DEMO_TCC_ADMIN_PASSWORD'
  );

  garantir(
    senhaAluno !== senhaAdmin,
    'As senhas dos estudantes e do administrador devem ser diferentes.'
  );
}

// =====================================================
// 4. INICIALIZAR FIREBASE ADMIN
// =====================================================

const credencial = JSON.parse(
  await readFile(
    resolve(caminhoCredencial),
    'utf8'
  )
);

garantir(
  credencial.project_id === PROJETO_PERMITIDO,
  'A chave JSON pertence a outro projeto Firebase.'
);

garantir(
  Boolean(
    credencial.client_email &&
    credencial.private_key
  ),
  'A credencial administrativa é inválida.'
);

const app = initializeApp({
  credential: cert(credencial),
  projectId: PROJETO_PERMITIDO,
});

const auth = getAuth(app);
const db = getFirestore(app);

// =====================================================
// 5. DATAS FICTÍCIAS
// =====================================================

function quando(dias) {
  return Timestamp.fromDate(
    new Date(Date.now() - dias * 86400000)
  );
}

// =====================================================
// 6. GERAR E-MAILS
// =====================================================

function emailDe(slug, matricula) {
  if (slug === admin[0]) {
    return `admin.tcc@${DOMINIO_DEMONSTRACAO}`;
  }

  garantir(
    /^[0-9]+$/.test(String(matricula)),
    `Matrícula inválida para o usuário ${slug}.`
  );

  return (
    `aluno.${matricula}@${DOMINIO_DEMONSTRACAO}`
  );
}

// =====================================================
// 7. VERIFICAR DOCUMENTOS EXISTENTES
// =====================================================

async function verificarDocumento(
  colecao,
  identificador,
  camposEsperados = {}
) {
  const ref = db
    .collection(colecao)
    .doc(idSeguro(String(identificador)));

  const snapshot = await ref.get();

  if (!snapshot.exists) {
    return false;
  }

  const dados = snapshot.data();

  garantir(
    dados.demonstracaoTcc === true,
    `CONFLITO: ${colecao}/${identificador} já existe e não pertence à demonstração.`
  );

  for (const [campo, esperado] of Object.entries(
    camposEsperados
  )) {
    garantir(
      dados[campo] === esperado,
      `CONFLITO: ${colecao}/${identificador} possui ${campo} diferente do esperado.`
    );
  }

  return true;
}

// Criação exclusiva: nunca substitui documentos.
async function criarDocumento(
  colecao,
  identificador,
  dados
) {
  const ref = db
    .collection(colecao)
    .doc(idSeguro(String(identificador)));

  await ref.create({
    ...dados,
    demonstracaoTcc: true,
  });
}

// =====================================================
// 8. VERIFICAR CONTAS DE DEMONSTRAÇÃO
// =====================================================

async function consultarConta(
  slug,
  nome,
  matricula
) {
  const email = emailDe(slug, matricula);

  let contaAuth = null;

  try {
    contaAuth = await auth.getUserByEmail(email);
  } catch (erro) {
    if (erro.code !== 'auth/user-not-found') {
      throw erro;
    }
  }

  if (contaAuth) {
    const uid = contaAuth.uid;

    // Uma conta existente só é aceita se estiver
    // vinculada a um perfil demonstrativo válido.
    const perfilValido = await verificarDocumento(
      'usuarios',
      uid,
      {
        nome,
        email,
        numeroCadastro: matricula,
      }
    );

    garantir(
      perfilValido,
      `A conta ${email} existe, mas não possui perfil demonstrativo válido.`
    );

    const reservaValida = await verificarDocumento(
      'matriculas',
      matricula,
      { uid }
    );

    garantir(
      reservaValida,
      `A matrícula ${matricula} não possui reserva demonstrativa válida.`
    );
  } else {
    // Verificar se a matrícula já pertence a alguém.
    const reserva = await db
      .collection('matriculas')
      .doc(String(matricula))
      .get();

    garantir(
      !reserva.exists,
      `A matrícula ${matricula} já está reservada.`
    );
  }

  return {
    slug,
    nome,
    matricula,
    email,
    uid: contaAuth?.uid ?? null,
    existente: Boolean(contaAuth),
  };
}

// =====================================================
// 9. PREPARAR AS SEIS CONTAS
// =====================================================

const contasPlanejadas = [];

for (const [slug, nome, matricula] of [
  ...alunos,
  admin,
]) {
  const conta = await consultarConta(
    slug,
    nome,
    matricula
  );

  contasPlanejadas.push(conta);
}

garantir(
  new Set(
    contasPlanejadas.map((conta) => conta.email)
  ).size === contasPlanejadas.length,
  'Foram identificados e-mails duplicados.'
);

garantir(
  new Set(
    contasPlanejadas.map(
      (conta) => String(conta.matricula)
    )
  ).size === contasPlanejadas.length,
  'Foram identificadas matrículas duplicadas.'
);

const contaAdmin = contasPlanejadas.find(
  (conta) => conta.slug === admin[0]
);

garantir(
  Boolean(contaAdmin),
  'Conta administrativa não encontrada nos dados fictícios.'
);

// Nunca conceder autorização administrativa
// automaticamente a uma conta preexistente.
if (contaAdmin.existente) {
  const adminValido = await verificarDocumento(
    'administradores',
    contaAdmin.uid,
    { ativo: true }
  );

  garantir(
    adminValido,
    'A conta administrativa existente não possui autorização demonstrativa válida.'
  );
}

// =====================================================
// 10. PREPARAR CATEGORIAS E LOCAIS
// =====================================================

const categorias = [
  ...new Set(
    itens.map((item) => item[2])
  ),
];

const locais = [
  ...new Set(
    itens.map((item) => item[3])
  ),
];

const documentos = [];

function adicionarDocumento(
  colecao,
  identificador,
  dados,
  camposEsperados = {}
) {
  documentos.push({
    colecao,
    identificador,
    dados,
    camposEsperados,
    existente: false,
  });
}

for (const [indice, nome] of categorias.entries()) {
  adicionarDocumento(
    'categorias',
    `${PREFIXO}${indice + 1}`,
    {
      nome,
      ativo: true,
    },
    { nome }
  );
}

for (const [indice, nome] of locais.entries()) {
  adicionarDocumento(
    'locais',
    `${PREFIXO}${indice + 1}`,
    {
      nome,
      ativo: true,
      status: true,
    },
    {
      nome,
      status: true,
    }
  );
}

// =====================================================
// 11. PREPARAR OS OBJETOS
// =====================================================

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
    (r) => r.slug === slug
  );

  const pendente =
    registro?.status === 'Pendente';

  const status = pendente
    ? 'em análise'
    : registro?.status === 'Concluído'
      ? 'devolvido'
      : 'disponível';

  adicionarDocumento(
    'itens',
    `${PREFIXO}${slug}`,
    {
      titulo,
      descricao,
      categoriaId,
      localEncontrado,
      fotoUrl: '',
      status,
      solicitacaoAtivaId: pendente
        ? `${PREFIXO}${slug}`
        : null,
      dataCadastro: quando(indice + 1),
    },
    {
      titulo,
      categoriaId,
      localEncontrado,
    }
  );
}

// =====================================================
// 12. VERIFICAR REFERÊNCIAS DOS PEDIDOS
// =====================================================

for (const registro of registros) {
  garantir(
    contasPlanejadas.some(
      (conta) => conta.slug === registro.aluno
    ),
    `Aluno não encontrado: ${registro.aluno}`
  );

  garantir(
    itens.some(
      (item) => item[0] === registro.slug
    ),
    `Objeto não encontrado: ${registro.slug}`
  );
}

// =====================================================
// 13. PRÉ-VERIFICAR DOCUMENTOS
// =====================================================

console.log(
  `\nProjeto Firebase: ${PROJETO_PERMITIDO}`
);

console.log(
  `Modo: ${dryRun ? 'PRÉ-VERIFICAÇÃO' : 'APLICAÇÃO'}`
);

console.log(
  '\nVerificando conflitos e documentos existentes...'
);

for (const documento of documentos) {
  documento.existente = await verificarDocumento(
    documento.colecao,
    documento.identificador,
    documento.camposEsperados
  );
}

// Verificar os pedidos existentes.
const pedidosPlanejados = [];

for (const registro of registros) {
  const aluno = contasPlanejadas.find(
    (conta) => conta.slug === registro.aluno
  );

  const id = `${PREFIXO}${registro.slug}`;

  const camposEsperados = {
    itemId: id,
    numeroCadastro: aluno.matricula,
  };

  if (aluno.uid) {
    camposEsperados.usuarioId = aluno.uid;
  }

  const existente = await verificarDocumento(
    'solicitacoesDevolucao',
    id,
    camposEsperados
  );

  pedidosPlanejados.push({
    id,
    registro,
    existente,
  });
}

// =====================================================
// 14. EXIBIR RELATÓRIO
// =====================================================

console.log('\nCONTAS DE DEMONSTRAÇÃO');

for (const conta of contasPlanejadas) {
  const situacao = conta.existente
    ? 'EXISTENTE'
    : 'CRIAR';

  console.log(
    `${situacao} - ${conta.email}`
  );
}

const documentosExistentes =
  documentos.filter(
    (documento) => documento.existente
  ).length +
  pedidosPlanejados.filter(
    (pedido) => pedido.existente
  ).length;

const totalDocumentos =
  documentos.length + pedidosPlanejados.length;

console.log('\nRESUMO');

console.log(
  `Contas: ${contasPlanejadas.length}`
);

console.log(
  `Objetos: ${itens.length}`
);

console.log(
  `Solicitações: ${registros.length}`
);

console.log(
  `Categorias: ${categorias.length}`
);

console.log(
  `Locais: ${locais.length}`
);

console.log(
  `Documentos existentes: ${documentosExistentes}`
);

console.log(
  `Documentos novos: ${totalDocumentos - documentosExistentes}`
);

// =====================================================
// 15. ENCERRAR DRY-RUN
// =====================================================

if (dryRun) {
  console.log(
    '\nPRÉ-VERIFICAÇÃO CONCLUÍDA.'
  );

  console.log(
    'Nenhuma conta ou documento foi criado ou alterado.'
  );

  console.log(
    'Revise os resultados antes de executar --aplicar.'
  );

  process.exit(0);
}

// =====================================================
// 16. CRIAR CONTAS NO AUTHENTICATION
// =====================================================

console.log(
  '\nConfirmações recebidas. Iniciando cadastro real...'
);

const usuariosCriados = new Map();

for (const conta of contasPlanejadas) {
  let uid = conta.uid;

  if (!conta.existente) {
    const senha =
      conta.slug === admin[0]
        ? senhaAdmin
        : senhaAluno;

    const novoUsuario = await auth.createUser({
      email: conta.email,
      password: senha,
      displayName: conta.nome,
      emailVerified: false,
    });

    uid = novoUsuario.uid;

    const reservaRef = db
      .collection('matriculas')
      .doc(String(conta.matricula));

    const perfilRef = db
      .collection('usuarios')
      .doc(uid);

    // Reserva matrícula e cria perfil na
    // mesma transação do Firestore.
    await db.runTransaction(async (transacao) => {
      const [reserva, perfil] = await Promise.all([
        transacao.get(reservaRef),
        transacao.get(perfilRef),
      ]);

      garantir(
        !reserva.exists && !perfil.exists,
        `Conflito durante a criação da conta ${conta.email}.`
      );

      transacao.create(reservaRef, {
        uid,
        criadoEm: quando(15),
        demonstracaoTcc: true,
      });

      transacao.create(perfilRef, {
        nome: conta.nome,
        email: conta.email,
        numeroCadastro: conta.matricula,
        tipo: 'usuario',
        eAdmin: false,
        dataCriacao: quando(15),
        demonstracaoTcc: true,
      });
    });
  }

  usuariosCriados.set(conta.slug, {
    ...conta,
    uid,
  });

  console.log(
    `Conta preparada: ${conta.email}`
  );
}

// =====================================================
// 17. CONFIGURAR ADMINISTRADOR
// =====================================================

const administrador = usuariosCriados.get(
  admin[0]
);

garantir(
  Boolean(administrador?.uid),
  'UID do administrador não encontrado.'
);

const adminRef = db
  .collection('administradores')
  .doc(administrador.uid);

const adminSnapshot = await adminRef.get();

if (!adminSnapshot.exists) {
  await criarDocumento(
    'administradores',
    administrador.uid,
    { ativo: true }
  );
} else {
  await verificarDocumento(
    'administradores',
    administrador.uid,
    { ativo: true }
  );
}

// =====================================================
// 18. CADASTRAR CATEGORIAS, LOCAIS E OBJETOS
// =====================================================

for (const documento of documentos) {
  if (documento.existente) {
    continue;
  }

  const dados = {
    ...documento.dados,
  };

  if (documento.colecao === 'itens') {
    dados.criadoPor = administrador.uid;
  }

  await criarDocumento(
    documento.colecao,
    documento.identificador,
    dados
  );
}

// =====================================================
// 19. CADASTRAR SOLICITAÇÕES
// =====================================================

for (const [
  indice,
  pedido,
] of pedidosPlanejados.entries()) {
  if (pedido.existente) {
    continue;
  }

  const registro = pedido.registro;

  const aluno = usuariosCriados.get(
    registro.aluno
  );

  const item = itens.find(
    (objeto) => objeto[0] === registro.slug
  );

  const dados = {
    itemId: pedido.id,
    itemTitulo: item[1],

    usuarioId: aluno.uid,
    nomeUsuario: aluno.nome,
    numeroCadastro: aluno.matricula,

    codigo:
      `DEMO${String(indice + 1).padStart(4, '0')}`,

    status: registro.status,
    dataSolicitacao: quando(registro.dias),
  };

  if (
    registro.status === 'Concluído' ||
    registro.status === 'Recusado'
  ) {
    dados.atendidoPor = administrador.uid;
    dados.dataAtendimento = quando(
      registro.dias - 1
    );
  }

  if (registro.status === 'Cancelado') {
    dados.dataCancelamento = quando(
      registro.dias - 1
    );
  }

  await criarDocumento(
    'solicitacoesDevolucao',
    pedido.id,
    dados
  );
}

// =====================================================
// 20. FINALIZAÇÃO
// =====================================================

console.log(
  '\n=========================================='
);

console.log(
  'BASE DEMONSTRATIVA PREPARADA!'
);

console.log(
  '=========================================='
);

console.log(
  `Projeto: ${PROJETO_PERMITIDO}`
);

console.log(
  `Contas planejadas: ${contasPlanejadas.length}`
);

console.log(
  `Objetos planejados: ${itens.length}`
);

console.log(
  `Solicitações planejadas: ${registros.length}`
);

console.log(
  '\nNenhum documento anterior foi intencionalmente sobrescrito.'
);

console.log(
  'Confira as contas e documentos no Firebase Console.'
);

console.log(
  'Não divulgue as credenciais administrativas.'
);
