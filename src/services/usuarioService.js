import { auth, db } from '../config/firebase';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';

// Cadastro de usuário
export const cadastrarUsuario = async ({ email, senha, nome, numeroCadastro, tipo = 'usuario' }) => {
  const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
  const uid = userCredential.user.uid;

  await setDoc(doc(db, 'usuarios', uid), {
    nome,
    email,
    numeroCadastro: String(numeroCadastro).trim(),
    tipo,
    dataCriacao: new Date()
  });

  return userCredential.user;
};

// Login (Ajustado para retornar o perfil completo do Firestore com o "tipo")
export const realizarLogin = async (email, senha) => {
  const userCredential = await signInWithEmailAndPassword(auth, email, senha);
  const uid = userCredential.user.uid;

  // Busca os dados cadastrados na coleção 'usuarios' (incluindo tipo, nome, etc)
  const perfil = await buscarPerfilUsuario(uid);

  return {
    uid,
    email: userCredential.user.email,
    ...perfil
  };
};

// Logout
export const realizarLogout = async () => {
  await signOut(auth);
};

// Buscar Perfil do Usuário
export const buscarPerfilUsuario = async (uid) => {
  const docRef = doc(db, 'usuarios', uid);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null;
};

// Envia e-mail de redefinição de senha (Nielsen 3 e 10 - o usuário precisa de uma saída quando esquece a senha)
export const enviarRedefinicaoSenha = async (email) => {
  await sendPasswordResetEmail(auth, email);
};
