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

// Converte a imagem localmente para Base64 (100% gratuito, sem precisar do Firebase Storage / plano Blaze)
export const uploadFotoItem = async (file) => {
  if (!file) return '';
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = (error) => {
      console.error("Erro ao converter imagem para Base64:", error);
      reject(error);
    };
  });
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
export const listarItens = async (categoriaId = null, local = null) => {
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