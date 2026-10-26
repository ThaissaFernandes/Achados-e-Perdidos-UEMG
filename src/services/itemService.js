
import { db } from '../config/firebase';

import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
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

// Limite do arquivo escolhido, antes da compressão.
export const TAMANHO_MAXIMO_FOTO_MB = 10;

// As fotografias continuam armazenadas em Base64
// dentro dos documentos do Firestore.
//
// Não utilizamos Firebase Storage nem Cloud Functions.

const LARGURA_MAXIMA = 900;
const QUALIDADE_JPEG = 0.72;

// Limite de caracteres do Base64.
// Deixa espaço para os outros campos do documento.
const MAX_DATA_URL_CHARS = 600000;

// Campos que podem ser editados pelo administrador.
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

function validarTexto(valor, nome, limite, obrigatorio = false) {
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

    // Preenche o fundo antes de converter PNG para JPEG.
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

    // Evita aumentar a imagem caso a original
    // já esteja suficientemente otimizada.
    resultado =
      comprimida.length < original.length
        ? comprimida
        : original;

  } catch (error) {
    console.error(
      'Erro ao comprimir fotografia:',
      error
    );

    // Não salva a imagem original sem verificar
    // o tamanho final.
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

        // Novo item sempre começa disponível.
        status: 'disponível',

        // Nenhuma solicitação ativa no cadastro.
        solicitacaoAtivaId: null,

        dataCadastro: serverTimestamp(),

        // Mantido por compatibilidade com
        // os cadastros existentes.
        criadoPor: dadosItem.criadoPor || 'admin',
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
// ATUALIZAR DADOS DO ITEM
// =====================================================
//
// Somente campos cadastrais podem ser editados.
//
// Não permitir que esta função altere:
// - status
// - solicitacaoAtivaId
//
// Esses campos pertencem às transações do
// solicitacaoService.js.
//
// As regras do Firestore também devem verificar
// a permissão do administrador.
// =====================================================

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

    // Impede atualização de campos não autorizados.
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

    const itemRef = doc(
      db,
      'itens',
      itemId
    );

    await updateDoc(
      itemRef,
      alteracoes
    );

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
//
// O status deve ser alterado somente pelas
// transações seguras do solicitacaoService.js.
//
// Esta função permanece exportada para manter
// compatibilidade com imports antigos, mas não
// realiza alterações no Firestore.
// =====================================================

export const atualizarStatusItem = async () => {
  throw new Error(
    'Não é permitido alterar diretamente o status do item. Utilize o fluxo de solicitações.'
  );
};

// =====================================================
// EXCLUSÃO DE ITEM
// =====================================================
//
// Não apagar um item que possa fazer parte
// do histórico de solicitações.
//
// A exclusão permanente permanece desativada.
// Futuramente poderá ser implementado um
// arquivamento com regras específicas.
// =====================================================

export const excluirItem = async () => {
  throw new Error(
    'A exclusão permanente está desativada para preservar o histórico de solicitações.'
  );
};
