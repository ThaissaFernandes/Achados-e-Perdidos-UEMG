import { db } from '../config/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  serverTimestamp 
} from 'firebase/firestore';

const itemCollectionRef = collection(db, 'itens');

// Tamanho máximo aceito para a foto escolhida (antes da compressão)
export const TAMANHO_MAXIMO_FOTO_MB = 10;

// Redimensiona e comprime a foto no próprio aparelho antes de salvar.
// Como a imagem é guardada em Base64 dentro do documento do Firestore (limite de 1 MiB por documento)
// e é baixada na listagem, fotos de celular (3 a 8 MB) deixariam o app lento ou falhariam ao salvar.
const LARGURA_MAXIMA = 900;
const QUALIDADE_JPEG = 0.72;

const lerComoDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const carregarImagem = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    img.src = src;
  });

export const uploadFotoItem = async (file) => {
  if (!file) return '';

  if (!file.type?.startsWith('image/')) {
    throw new Error('O arquivo escolhido não é uma imagem.');
  }
  if (file.size > TAMANHO_MAXIMO_FOTO_MB * 1024 * 1024) {
    throw new Error(`A foto é muito grande. Escolha uma imagem de até ${TAMANHO_MAXIMO_FOTO_MB} MB.`);
  }

  const original = await lerComoDataUrl(file);

  try {
    const img = await carregarImagem(original);
    const escala = Math.min(1, LARGURA_MAXIMA / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(img.width * escala);
    canvas.height = Math.round(img.height * escala);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; // evita fundo preto em PNG com transparência
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const comprimida = canvas.toDataURL('image/jpeg', QUALIDADE_JPEG);
    return comprimida.length < original.length ? comprimida : original;
  } catch (error) {
    console.error('Falha ao comprimir imagem, usando a original:', error);
    return original;
  }
};

// Mapeia o método cadastrar() do Diagrama de Classes
export const cadastrarItem = async (dadosItem) => {
  try {
    const docRef = await addDoc(itemCollectionRef, {
      titulo: dadosItem.titulo,
      descricao: dadosItem.descricao,
      localEncontrado: dadosItem.localEncontrado,
      categoriaId: dadosItem.categoriaId,
      fotoUrl: dadosItem.fotoUrl || '',
      status: (dadosItem.status || 'disponível').toLowerCase(),
      dataCadastro: serverTimestamp(),
      criadoPor: dadosItem.criadoPor || 'admin'
    });
    return docRef.id;
  } catch (error) {
    console.error("Erro ao cadastrar item:", error);
    throw error;
  }
};

// Alias para compatibilidade com o RegistrarItem.jsx
export const criarItem = cadastrarItem;

// Mapeia o método buscarPorFiltro() do Diagrama de Classes
export const listarItens = async (categoriaId = null) => {
  try {
    let q = itemCollectionRef;
    if (categoriaId) {
      q = query(itemCollectionRef, where('categoriaId', '==', categoriaId));
    }
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error("Erro ao buscar itens:", error);
    throw error;
  }
};

// Mapeia o método atualizarStatus() do Diagrama de Classes
export const atualizarStatusItem = async (itemId, novoStatus) => {
  try {
    const itemRef = doc(db, 'itens', itemId);
    await updateDoc(itemRef, { status: novoStatus.toLowerCase() });
  } catch (error) {
    console.error("Erro ao atualizar status do item:", error);
    throw error;
  }
};

// Mapeia a atualização completa de um item no Firestore
export const atualizarItem = async (itemId, dadosAtualizados) => {
  try {
    const itemRef = doc(db, 'itens', itemId);
    await updateDoc(itemRef, {
      ...dadosAtualizados,
      status: (dadosAtualizados.status || 'disponível').toLowerCase()
    });
  } catch (error) {
    console.error("Erro ao atualizar item:", error);
    throw error;
  }
};

// Mapeia o método excluir() do Diagrama de Classes
export const excluirItem = async (itemId) => {
  try {
    const itemRef = doc(db, 'itens', itemId);
    await deleteDoc(itemRef);
  } catch (error) {
    console.error("Erro ao excluir item:", error);
    throw error;
  }
};