
import { db } from '../config/firebase';

import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  getDoc,
  deleteDoc,
  limit,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';

// =====================================================
// REFERÊNCIA DA COLEÇÃO
// =====================================================

const itemCollectionRef = collection(db, 'itens');

// =====================================================
// CONFIGURAÇÕES DAS FOTOGRAFIAS
// =====================================================

export const TAMANHO_MAXIMO_FOTO_MB = 10;

const LARGURA_MAXIMA = 900;
const QUALIDADE_JPEG = 0.72;
const MAX_DATA_URL_CHARS = 600000;

const CAMPOS_EDITAVEIS = [
  'titulo',
  'descricao',
  'categoriaId',
  'localEncontrado',
  'fotoUrl',
];

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

const lerComoDataUrl = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      resolve(reader.result);
    };

    reader.onerror = () => {
      reject(
        reader.error ||
        new Error('Não foi possível ler a fotografia.')
      );
    };

    reader.readAsDataURL(file);
  });
};

const carregarImagem = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => {
      resolve(img);
    };

    img.onerror = () => {
      reject(
        new Error('Não foi possível abrir a fotografia.')
      );
    };

    img.src = src;
  });
};

function validarFotoUrl(fotoUrl) {
  if (typeof fotoUrl !== 'string') {
    throw new Error('Formato da fotografia inválido.');
  }

  if (fotoUrl.length > MAX_DATA_URL_CHARS) {
    throw new Error(
      'A fotografia é muito grande para o Firestore.'
    );
  }

  if (
    fotoUrl &&
    !fotoUrl.startsWith('data:image/')
  ) {
    throw new Error(
      'O formato da fotografia não é permitido.'
    );
  }

  return fotoUrl;
}

function validarTexto(
  valor,
  nome,
  limite,
  obrigatorio = false
) {
  if (typeof valor !== 'string') {
    throw new Error(
      `${nome} deve ser um texto válido.`
    );
  }

  const texto = valor.trim();

  if (obrigatorio && !texto) {
    throw new Error(
      `${nome} é obrigatório.`
    );
  }

  if (texto.length > limite) {
    throw new Error(
      `${nome} deve ter no máximo ${limite} caracteres.`
    );
  }

  return texto;
}

// =====================================================
// COMPRIMIR FOTOGRAFIA
// =====================================================

export const uploadFotoItem = async (file) => {
  if (!file) {
    return '';
  }

  if (!file.type?.startsWith('image/')) {
    throw new Error(
      'O arquivo escolhido não é uma imagem.'
    );
  }

  if (
    file.size >
    TAMANHO_MAXIMO_FOTO_MB * 1024 * 1024
  ) {
    throw new Error(
      `A fotografia deve ter até ${TAMANHO_MAXIMO_FOTO_MB} MB.`
    );
  }

  const original = await lerComoDataUrl(file);

  let resultado;

  try {
    const img = await carregarImagem(original);

    const maiorDimensao = Math.max(
      img.width,
      img.height
    );

    const escala = Math.min(
      1,
      LARGURA_MAXIMA / maiorDimensao
    );

    const canvas = document.createElement('canvas');

    canvas.width = Math.max(
      1,
      Math.round(img.width * escala)
    );

    canvas.height = Math.max(
      1,
      Math.round(img.height * escala)
    );

    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error(
        'Não foi possível processar a imagem.'
      );
    }

    ctx.fillStyle = '#ffffff';

    ctx.fillRect(
      0,
      0,
      canvas.width,
      canvas.height
    );

    ctx.drawImage(
      img,
      0,
      0,
      canvas.width,
      canvas.height
    );

    const comprimida = canvas.toDataURL(
      'image/jpeg',
      QUALIDADE_JPEG
    );

    resultado =
      comprimida.length < original.length
        ? comprimida
        : original;

  } catch (error) {
    console.error(
      'Erro ao comprimir fotografia:',
      error
    );

    resultado = original;
  }

  validarFotoUrl(resultado);

  return resultado;
};

// =====================================================
// CADASTRAR ITEM
// =====================================================

export const cadastrarItem = async (dadosItem) => {
  try {
    const titulo = validarTexto(
      dadosItem.titulo,
      'Título',
      160,
      true
    );

    const descricao = validarTexto(
      dadosItem.descricao || '',
      'Descrição',
      3000
    );

    const categoriaId = validarTexto(
      dadosItem.categoriaId,
      'Categoria',
      200,
      true
    );

    const localEncontrado = validarTexto(
      dadosItem.localEncontrado,
      'Local encontrado',
      200,
      true
    );

    const fotoUrl = validarFotoUrl(
      dadosItem.fotoUrl || ''
    );

    const docRef = await addDoc(
      itemCollectionRef,
      {
        titulo,
        descricao,
        categoriaId,
        localEncontrado,
        fotoUrl,

        // Novos itens começam disponíveis
        // e sem histórico de solicitações.
        status: 'disponível',
        teveSolicitacoes: false,
        solicitacaoAtivaId: null,

        dataCadastro: serverTimestamp(),

        criadoPor:
          dadosItem.criadoPor || 'admin',
      }
    );

    return docRef.id;

  } catch (error) {
    console.error(
      'Erro ao cadastrar item:',
      error
    );

    throw error;
  }
};

// Alias utilizado pelo RegistrarItem.jsx.
export const criarItem = cadastrarItem;

// =====================================================
// LISTAR ITENS
// =====================================================

export const listarItens = async (
  categoriaId = null
) => {
  try {
    let consulta = itemCollectionRef;

    if (categoriaId) {
      consulta = query(
        itemCollectionRef,
        where('categoriaId', '==', categoriaId)
      );
    }

    const querySnapshot = await getDocs(
      consulta
    );

    return querySnapshot.docs.map(
      (documento) => ({
        id: documento.id,
        ...documento.data(),
      })
    );

  } catch (error) {
    console.error(
      'Erro ao buscar itens:',
      error
    );

    throw error;
  }
};

// =====================================================
// ATUALIZAR DADOS CADASTRAIS
// =====================================================

// Não altera status, solicitacaoAtivaId
// nem teveSolicitacoes.

export const atualizarItem = async (
  itemId,
  dadosAtualizados
) => {
  try {
    if (
      typeof itemId !== 'string' ||
      !itemId.trim()
    ) {
      throw new Error(
        'Identificação do item inválida.'
      );
    }

    if (
      !dadosAtualizados ||
      typeof dadosAtualizados !== 'object' ||
      Array.isArray(dadosAtualizados)
    ) {
      throw new Error(
        'Dados de atualização inválidos.'
      );
    }

    const camposRecebidos = Object.keys(
      dadosAtualizados
    );

    if (camposRecebidos.length === 0) {
      throw new Error(
        'Nenhuma alteração foi informada.'
      );
    }

    const camposInvalidos = camposRecebidos.filter(
      (campo) => !CAMPOS_EDITAVEIS.includes(campo)
    );

    if (camposInvalidos.length > 0) {
      throw new Error(
        `Campos não permitidos: ${camposInvalidos.join(', ')}`
      );
    }

    const alteracoes = {};

    if ('titulo' in dadosAtualizados) {
      alteracoes.titulo = validarTexto(
        dadosAtualizados.titulo,
        'Título',
        160,
        true
      );
    }

    if ('descricao' in dadosAtualizados) {
      alteracoes.descricao = validarTexto(
        dadosAtualizados.descricao,
        'Descrição',
        3000
      );
    }

    if ('categoriaId' in dadosAtualizados) {
      alteracoes.categoriaId = validarTexto(
        dadosAtualizados.categoriaId,
        'Categoria',
        200,
        true
      );
    }

    if ('localEncontrado' in dadosAtualizados) {
      alteracoes.localEncontrado = validarTexto(
        dadosAtualizados.localEncontrado,
        'Local encontrado',
        200,
        true
      );
    }

    if ('fotoUrl' in dadosAtualizados) {
      alteracoes.fotoUrl = validarFotoUrl(
        dadosAtualizados.fotoUrl
      );
    }

    const itemRef = doc(db, 'itens', itemId);

    await updateDoc(itemRef, alteracoes);

    return true;

  } catch (error) {
    console.error(
      'Erro ao atualizar item:',
      error
    );

    throw error;
  }
};

// =====================================================
// ATUALIZAÇÃO DE STATUS
// =====================================================

export const atualizarStatusItem = async () => {
  throw new Error(
    'Não é permitido alterar diretamente o status do item. Utilize o fluxo de solicitações.'
  );
};

// =====================================================
// EXCLUSÃO PERMANENTE COM DIAGNÓSTICO
// =====================================================

export const excluirItem = async (itemId) => {
  console.log(
    '[EXCLUSÃO] Iniciando exclusão do item:',
    itemId
  );

  if (
    typeof itemId !== 'string' ||
    !itemId.trim()
  ) {
    throw new Error(
      'Identificação do pertence inválida.'
    );
  }

  const itemRef = doc(db, 'itens', itemId);

  try {
    // -----------------------------------------------
    // ETAPA 1 — CONSULTAR ITEM
    // -----------------------------------------------

    console.log(
      '[EXCLUSÃO] 1. Buscando documento do item...'
    );

    const itemSnap = await getDoc(itemRef);

    if (!itemSnap.exists()) {
      throw new Error(
        'O pertence não foi encontrado.'
      );
    }

    const item = itemSnap.data();

    console.log(
      '[EXCLUSÃO] Dados do documento:',
      {
        status: item.status,
        solicitacaoAtivaId:
          item.solicitacaoAtivaId,
        teveSolicitacoes:
          item.teveSolicitacoes,
      }
    );

    // -----------------------------------------------
    // ETAPA 2 — VALIDAR DISPONIBILIDADE
    // -----------------------------------------------

    if (
      item.status !== 'disponível' ||
      item.solicitacaoAtivaId != null
    ) {
      throw new Error(
        'Somente itens disponíveis e sem reserva ativa podem ser excluídos.'
      );
    }

    console.log(
      '[EXCLUSÃO] Disponibilidade validada.'
    );

    // -----------------------------------------------
    // ETAPA 3 — VALIDAR HISTÓRICO
    // -----------------------------------------------

    if (item.teveSolicitacoes !== false) {
      throw new Error(
        'Este item possui histórico de solicitações ou ainda não teve seu histórico verificado.'
      );
    }

    console.log(
      '[EXCLUSÃO] Campo teveSolicitacoes validado.'
    );

    // -----------------------------------------------
    // ETAPA 4 — CONSULTAR SOLICITAÇÕES
    // -----------------------------------------------

    console.log(
      '[EXCLUSÃO] 2. Consultando solicitações vinculadas...'
    );

    const pedidosSnapshot = await getDocs(
      query(
        collection(db, 'solicitacoesDevolucao'),
        where('itemId', '==', itemId),
        limit(1)
      )
    );

    console.log(
      '[EXCLUSÃO] Consulta concluída.',
      {
        possuiSolicitacoes:
          !pedidosSnapshot.empty,
        quantidadeRetornada:
          pedidosSnapshot.size,
      }
    );

    if (!pedidosSnapshot.empty) {
      throw new Error(
        'Este pertence possui solicitações registradas e não pode ser excluído permanentemente.'
      );
    }

    // -----------------------------------------------
    // ETAPA 5 — EXCLUIR DO FIRESTORE
    // -----------------------------------------------

    console.log(
      '[EXCLUSÃO] 3. Executando deleteDoc...'
    );

    await deleteDoc(itemRef);

    // -----------------------------------------------
    // ETAPA 6 — CONFIRMAÇÃO
    // -----------------------------------------------

    console.log(
      '[EXCLUSÃO] 4. Documento excluído com sucesso.'
    );

    return true;

  } catch (error) {
    console.error(
      '[EXCLUSÃO] Falha durante a operação:',
      {
        code: error?.code,
        message: error?.message,
        error,
      }
    );

    throw error;
  }
};
