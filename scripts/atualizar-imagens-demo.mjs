
/*
 * ACHADOS E PERDIDOS UEMG
 * Atualização de fotografias demonstrativas.
 *
 * Associa 18 imagens PNG aos 18 itens fictícios
 * já cadastrados no Firebase Firestore.
 *
 * NÃO cria usuários, itens ou solicitações.
 * NÃO altera títulos, descrições ou status.
 *
 * Comandos:
 *
 * Verificar:
 * node scripts/atualizar-imagens-demo.mjs --verificar
 *
 * Aplicar:
 * node scripts/atualizar-imagens-demo.mjs --aplicar --confirmar-projeto=achados-e-perdidos-uemg
 */

import {
  readFileSync,
  existsSync,
} from 'node:fs';

import {
  resolve,
  join,
} from 'node:path';

import {
  applicationDefault,
  initializeApp,
} from 'firebase-admin/app';

import {
  getFirestore,
} from 'firebase-admin/firestore';

import {
  itens,
} from './demo-data.mjs';

// ============================================================
// CONFIGURAÇÕES
// ============================================================

const PROJETO = 'achados-e-perdidos-uemg';

const PREFIXO =
  'https://achados-e-perdidos-uemg.web.app/imagens-demo';

const PASTA_IMAGENS = resolve(
  'public',
  'imagens-demo'
);

// ============================================================
// MAPEAMENTO DAS 18 FOTOGRAFIAS PNG
// ============================================================

const IMAGENS = {
  mochila: 'mochila.png',
  garrafa: 'garrafa.png',
  estojo: 'estojo.png',
  chaves: 'chaves.png',
  oculos: 'oculos.png',
  caderno: 'caderno.png',
  fone: 'fone.png',
  umbrella: 'guardaChuva.png',
  casaco: 'jaqueta.png',
  carregador: 'carregador.png',
  'pen-drive': 'penDrive.png',
  agenda: 'agenda.png',
  necessaire: 'bolsinhaBege.png',
  bola: 'bola.png',
  relogio: 'relogioPulso.png',
  livro: 'livroAzul.png',
  calculadora: 'calculadoraCientifica.png',
  bolsa: 'bolsaOmbro.png',
};

// ============================================================
// VALIDAÇÕES
// ============================================================

function validarDados() {
  if (itens.length !== 18) {
    throw new Error(
      'Esperados exatamente 18 itens em demo-data.mjs.'
    );
  }

  const slugs = itens.map(([slug]) => slug);

  if (new Set(slugs).size !== 18) {
    throw new Error(
      'Existem identificadores de itens duplicados.'
    );
  }

  for (const [slug, titulo] of itens) {
    if (!slug || !titulo) {
      throw new Error(
        'Encontrado item com identificador ou título vazio.'
      );
    }

    if (!/^[a-z0-9-]+$/.test(slug)) {
      throw new Error(
        `Identificador inválido: ${slug}`
      );
    }

    if (!Object.hasOwn(IMAGENS, slug)) {
      throw new Error(
        `Não existe imagem configurada para: ${slug}`
      );
    }
  }

  if (Object.keys(IMAGENS).length !== 18) {
    throw new Error(
      'O mapeamento precisa conter exatamente 18 imagens.'
    );
  }
}

function validarArquivos() {
  for (const [slug] of itens) {
    const nomeArquivo = IMAGENS[slug];

    const caminho = join(
      PASTA_IMAGENS,
      nomeArquivo
    );

    if (!existsSync(caminho)) {
      throw new Error(
        `Arquivo não encontrado para "${slug}": ${caminho}`
      );
    }

    console.log(
      `OK: ${slug} -> ${nomeArquivo}`
    );
  }

  console.log(
    '\nTodas as 18 fotografias foram encontradas.'
  );
}

function validarCredenciais() {
  const caminho =
    process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!caminho || !existsSync(caminho)) {
    throw new Error(
      'Arquivo GOOGLE_APPLICATION_CREDENTIALS não encontrado.'
    );
  }

  const credencial = JSON.parse(
    readFileSync(caminho, 'utf8')
  );

  if (credencial.project_id !== PROJETO) {
    throw new Error(
      'A chave administrativa pertence a outro projeto Firebase.'
    );
  }

  if (
    process.env.DEMO_TCC_PROJECT_ID !== PROJETO
  ) {
    throw new Error(
      `Defina DEMO_TCC_PROJECT_ID=${PROJETO}.`
    );
  }
}

// ============================================================
// IDENTIFICADORES DOS DOCUMENTOS FICTÍCIOS
// ============================================================

function idEsperado(id, slug) {
  return (
    id === `tcc-demo-${slug}` ||
    id === `tcc-demo-item-${slug}`
  );
}

// ============================================================
// ENDEREÇOS DAS IMAGENS
// ============================================================

function obterUrlImagem(slug) {
  const arquivo = IMAGENS[slug];

  return `${PREFIXO}/${encodeURIComponent(arquivo)}`;
}

function urlSvgDemonstrativa(url, slug) {
  return (
    typeof url === 'string' &&
    url === `${PREFIXO}/${encodeURIComponent(slug)}.svg`
  );
}

// ============================================================
// VERIFICAR OU ATUALIZAR FIRESTORE
// ============================================================

async function atualizar(aplicar) {
  validarDados();
  validarArquivos();
  validarCredenciais();

  if (
    aplicar &&
    !process.argv.includes(
      `--confirmar-projeto=${PROJETO}`
    )
  ) {
    throw new Error(
      'Falta confirmar explicitamente o projeto Firebase.'
    );
  }

  const app = initializeApp({
    credential: applicationDefault(),
    projectId: PROJETO,
  });

  try {
    const db = getFirestore(app);

    console.log('\n========================================');
    console.log('ATUALIZAÇÃO DE IMAGENS DEMONSTRATIVAS');
    console.log('========================================');

    console.log(`Projeto: ${PROJETO}`);

    console.log(
      aplicar
        ? 'Modo: APLICAR ALTERAÇÕES'
        : 'Modo: SOMENTE VERIFICAR'
    );

    const snapshot = await db
      .collection('itens')
      .get();

    const pendentes = [];

    let jaAtualizados = 0;
    let preservados = 0;

    for (const [slug, titulo] of itens) {
      const candidatos = snapshot.docs.filter(
        (documento) => {
          const dados = documento.data();

          return (
            idEsperado(documento.id, slug) &&
            (dados.titulo || dados.title) === titulo
          );
        }
      );

      if (candidatos.length !== 1) {
        throw new Error(
          `Item "${slug}": encontrados ` +
          `${candidatos.length} documentos correspondentes. ` +
          'Nenhuma atualização foi iniciada.'
        );
      }

      const documento = candidatos[0];
      const dados = documento.data();

      const urlNova = obterUrlImagem(slug);

      const fotoAtual =
        dados.fotoUrl || dados.imageUrl || '';

      // Caso a imagem PNG já esteja cadastrada.
      if (fotoAtual === urlNova) {
        jaAtualizados++;

        console.log(
          `OK: ${documento.id} já usa a fotografia PNG.`
        );

        continue;
      }

      // Só substituímos fotos ausentes ou o SVG
      // que nosso próprio script criou anteriormente.
      const semImagem = !fotoAtual;

      const usaSvgAntigo =
        urlSvgDemonstrativa(fotoAtual, slug) &&
        dados.imagemIlustrativa === true;

      if (!semImagem && !usaSvgAntigo) {
        preservados++;

        console.log(
          `PRESERVAR: ${documento.id} possui outra imagem.`
        );

        continue;
      }

      pendentes.push({
        referencia: documento.ref,
        slug,
        titulo,
        urlNova,
        fotoAnterior: fotoAtual,
      });

      console.log(
        `${aplicar ? 'PREPARAR' : 'PREVISTO'}: ` +
        `${documento.id}\n` +
        `  Nova imagem: ${urlNova}`
      );
    }

    console.log('\n========================================');
    console.log('RESUMO');
    console.log('========================================');

    console.log(
      `Documentos lidos: ${snapshot.size}`
    );

    console.log(
      `Itens fictícios esperados: ${itens.length}`
    );

    console.log(
      `Imagens a atualizar: ${pendentes.length}`
    );

    console.log(
      `Já possuem PNG correto: ${jaAtualizados}`
    );

    console.log(
      `Imagens preservadas: ${preservados}`
    );

    if (!aplicar) {
      console.log(
        '\nVerificação concluída. Nenhuma alteração realizada.'
      );

      return;
    }

    // ========================================================
    // TRANSAÇÃO: LEITURAS ANTES DAS GRAVAÇÕES
    // ========================================================

    const atualizados = await db.runTransaction(
      async (transacao) => {
        const leituras = [];

        for (const pendente of pendentes) {
          const documento = await transacao.get(
            pendente.referencia
          );

          if (!documento.exists) {
            throw new Error(
              `Documento não encontrado: ${pendente.referencia.id}`
            );
          }

          const dados = documento.data();

          if (
            (dados.titulo || dados.title) !== pendente.titulo
          ) {
            throw new Error(
              `Título alterado: ${pendente.referencia.id}. ` +
              'Transação cancelada.'
            );
          }

          const fotoAtual =
            dados.fotoUrl || dados.imageUrl || '';

          if (
            fotoAtual !== pendente.fotoAnterior
          ) {
            throw new Error(
              `Imagem modificada: ${pendente.referencia.id}. ` +
              'Transação cancelada.'
            );
          }

          leituras.push(pendente);
        }

        for (const pendente of leituras) {
          transacao.update(
            pendente.referencia,
            {
              fotoUrl: pendente.urlNova,
              imagemIlustrativa: true,
            }
          );
        }

        return leituras.length;
      }
    );

    console.log('\n========================================');
    console.log('ATUALIZAÇÃO CONCLUÍDA');
    console.log('========================================');

    console.log(
      `Fotografias associadas: ${atualizados}`
    );

    console.log(
      'Nenhum título, descrição, status ou solicitação foi alterado.'
    );
  } finally {
    await app.delete();
  }
}

// ============================================================
// EXECUÇÃO
// ============================================================

const opcoes = process.argv.slice(2);

if (opcoes.includes('--verificar')) {
  await atualizar(false);
} else if (opcoes.includes('--aplicar')) {
  await atualizar(true);
} else {
  console.log(`
Uso:

1. Verificar:
node scripts/atualizar-imagens-demo.mjs --verificar

2. Aplicar:
node scripts/atualizar-imagens-demo.mjs --aplicar --confirmar-projeto=${PROJETO}
  `);
}
