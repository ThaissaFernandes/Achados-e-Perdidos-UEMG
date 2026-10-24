import { auth, db } from '../config/firebase';
import {
  OAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  deleteUser,
  signOut,
} from 'firebase/auth';
import { doc, getDoc, runTransaction } from 'firebase/firestore';

// E-mails aceitos quando a restrição está ligada: @uemg.br, @discente.uemg.br e outros subdomínios da UEMG
export const DOMINIO_INSTITUCIONAL = /@([a-z0-9-]+\.)*uemg\.br$/i;

// MODO DE SIMULAÇÃO (padrão): qualquer conta Microsoft pode entrar, para demonstrar o fluxo sem contas da UEMG.
// Para exigir conta da UEMG (versão final), coloque VITE_RESTRINGIR_DOMINIO_UEMG=true no .env e reinicie o servidor.
export const MODO_RESTRITO_UEMG = import.meta.env.VITE_RESTRINGIR_DOMINIO_UEMG === 'true';

// Método de login: 'senha' (e-mail e senha, padrão por enquanto) ou 'microsoft'.
// A regra de matrícula única é a mesma nos dois. Troque em VITE_METODO_LOGIN no .env e reinicie o servidor.
export const METODO_LOGIN = import.meta.env.VITE_METODO_LOGIN === 'microsoft' ? 'microsoft' : 'senha';

// Mínimo de números aceito em matrícula/registro funcional
export const MIN_DIGITOS_MATRICULA = 4;

export const dominioPermitido = (email) => !MODO_RESTRITO_UEMG || DOMINIO_INSTITUCIONAL.test(email || '');

export class DominioNaoPermitidoError extends Error {
  constructor(email) {
    super('DOMINIO_NAO_PERMITIDO');
    this.name = 'DominioNaoPermitidoError';
    this.email = email;
  }
}

export class MatriculaEmUsoError extends Error {
  constructor() {
    super('MATRICULA_EM_USO');
    this.name = 'MatriculaEmUsoError';
  }
}

// "tenant" define quais contas Microsoft podem entrar. Simulação: 'common' (pessoais e de trabalho/escola).
// Restrito à UEMG: 'organizations' ou o ID do tenant da UEMG. Pode ser trocado em VITE_MICROSOFT_TENANT no .env.
const criarProvedorMicrosoft = () => {
  const provider = new OAuthProvider('microsoft.com');
  provider.setCustomParameters({
    prompt: 'select_account',
    tenant: import.meta.env.VITE_MICROSOFT_TENANT || (MODO_RESTRITO_UEMG ? 'organizations' : 'common'),
  });
  return provider;
};

// Login ÚNICO do sistema: conta Microsoft.
// Com a restrição ligada, confere o domínio do e-mail. Se não for da UEMG, encerra a sessão na hora.
// (A mesma regra deve existir nas Regras do Firestore, pois a checagem no navegador pode ser contornada.)
export const loginComMicrosoft = async () => {
  const resultado = await signInWithPopup(auth, criarProvedorMicrosoft());
  const user = resultado.user;
  const email =
    user.email || user.providerData?.find((p) => p.providerId === 'microsoft.com')?.email || '';

  if (!dominioPermitido(email)) {
    await signOut(auth);
    throw new DominioNaoPermitidoError(email);
  }
  return user;
};

// Login por e-mail e senha (método usado enquanto a Microsoft não está configurada)
export const entrarComSenha = async (email, senha) => {
  const credencial = await signInWithEmailAndPassword(auth, email, senha);
  return credencial.user;
};

export const enviarRedefinicaoSenha = async (email) => {
  await sendPasswordResetEmail(auth, email);
};

// Cria a conta e já reserva a matrícula. Se o número já estiver em uso, a conta recém-criada é
// apagada na hora, para não sobrar um login sem perfil (e o erro é mostrado ao usuário).
export const cadastrarComSenha = async ({ email, senha, nome, numeroCadastro }) => {
  if (!dominioPermitido(email)) throw new DominioNaoPermitidoError(email);

  const credencial = await createUserWithEmailAndPassword(auth, email, senha);
  try {
    await completarCadastro({ uid: credencial.user.uid, email, nome, numeroCadastro });
  } catch (err) {
    try {
      await deleteUser(credencial.user);
    } catch (erroAoApagar) {
      console.error('Não foi possível desfazer a conta criada:', erroAoApagar);
      await signOut(auth);
    }
    throw err;
  }
  return credencial.user;
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

// ---------------------------------------------------------------------------
// Matrícula / registro funcional ÚNICO
// ---------------------------------------------------------------------------
// O Firestore não tem "campo único". Por isso, cada número vira o ID de um documento na coleção
// "matriculas" (matriculas/{numero} -> { uid }). Dois cadastros com o mesmo número disputam o mesmo
// documento, e a transação garante que só um deles vence.

// Chave canônica: só dígitos e sem zeros à esquerda ("0012345" e "12345" contam como o mesmo número).
export const chaveMatricula = (numero) => {
  const digitos = String(numero ?? '').replace(/\D/g, '');
  if (!digitos) return '';
  return digitos.replace(/^0+/, '') || '0';
};

// Conclui o cadastro depois do primeiro login Microsoft: grava o perfil e reserva a matrícula.
export const completarCadastro = async ({ uid, email, nome, numeroCadastro }) => {
  const digitos = String(numeroCadastro ?? '').replace(/\D/g, '');
  const chave = chaveMatricula(digitos);
  if (!chave) throw new Error('MATRICULA_INVALIDA');

  const matriculaRef = doc(db, 'matriculas', chave);
  const usuarioRef = doc(db, 'usuarios', uid);

  await runTransaction(db, async (transacao) => {
    const matriculaSnap = await transacao.get(matriculaRef);
    const usuarioSnap = await transacao.get(usuarioRef);

    if (matriculaSnap.exists() && matriculaSnap.data().uid !== uid) {
      throw new MatriculaEmUsoError();
    }

    if (!matriculaSnap.exists()) {
      transacao.set(matriculaRef, { uid, criadoEm: new Date() });
    }

    if (usuarioSnap.exists()) {
      // Não mexe em tipo/eAdmin: um administrador não pode perder o acesso ao concluir o cadastro
      transacao.update(usuarioRef, { nome, email, numeroCadastro: digitos });
    } else {
      transacao.set(usuarioRef, {
        nome,
        email,
        numeroCadastro: digitos,
        tipo: 'usuario',
        eAdmin: false,
        dataCriacao: new Date(),
      });
    }
  });
};

// Exclui o perfil e libera a matrícula para uso futuro (só libera se ela pertencia mesmo a esse usuário).
export const excluirPerfilUsuario = async ({ id, numeroCadastro }) => {
  const chave = chaveMatricula(numeroCadastro);
  const usuarioRef = doc(db, 'usuarios', id);
  const matriculaRef = chave ? doc(db, 'matriculas', chave) : null;

  await runTransaction(db, async (transacao) => {
    const matriculaSnap = matriculaRef ? await transacao.get(matriculaRef) : null;
    transacao.delete(usuarioRef);
    if (matriculaSnap?.exists() && matriculaSnap.data().uid === id) {
      transacao.delete(matriculaRef);
    }
  });
};

// Registra na coleção "matriculas" as matrículas de contas criadas ANTES da regra de unicidade
// e aponta números repetidos. Uso da administração, uma vez (pode repetir sem problema).
export const sincronizarMatriculas = async (usuarios) => {
  const resultado = { registradas: 0, jaRegistradas: 0, semNumero: [], conflitos: [] };

  for (const u of usuarios) {
    const chave = chaveMatricula(u.numeroCadastro || u.matricula);
    if (!chave) {
      resultado.semNumero.push(u.id);
      continue;
    }

    const ref = doc(db, 'matriculas', chave);
    const situacao = await runTransaction(db, async (transacao) => {
      const snap = await transacao.get(ref);
      if (!snap.exists()) {
        transacao.set(ref, { uid: u.id, criadoEm: new Date() });
        return { tipo: 'nova' };
      }
      if (snap.data().uid === u.id) return { tipo: 'ja' };
      return { tipo: 'conflito', donoId: snap.data().uid };
    });

    if (situacao.tipo === 'nova') resultado.registradas += 1;
    else if (situacao.tipo === 'ja') resultado.jaRegistradas += 1;
    else resultado.conflitos.push({ chave, usuarioId: u.id, donoId: situacao.donoId });
  }

  return resultado;
};
