
import { auth, db } from '../config/firebase';

import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  deleteUser,
  signOut,
} from 'firebase/auth';

import {
  doc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';

// =====================================================
// 1. CONFIGURAÇÕES
// =====================================================

// Não exigimos validação institucional da UEMG.
// A restrição de domínio fica desativada por padrão.

export const DOMINIO_INSTITUCIONAL =
  /@([a-z0-9-]+\.)*uemg\.br$/i;

export const MODO_RESTRITO_UEMG =
  import.meta.env.VITE_RESTRINGIR_DOMINIO_UEMG === 'true';

// Limites da matrícula
export const MIN_DIGITOS_MATRICULA = 4;
export const MAX_DIGITOS_MATRICULA = 20;

// Apenas verifica o domínio se o modo restrito
// tiver sido explicitamente ativado no .env.

export const dominioPermitido = (email) => {
  if (!MODO_RESTRITO_UEMG) {
    return true;
  }

  return DOMINIO_INSTITUCIONAL.test(
    String(email || '').trim()
  );
};

// =====================================================
// 2. ERROS PERSONALIZADOS
// =====================================================

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

// =====================================================
// 3. VALIDAÇÃO E NORMALIZAÇÃO
// =====================================================

// Transforma a matrícula em uma chave padronizada.
//
// Exemplos:
// 00012345 -> 12345
// 1234567  -> 1234567
//
// Isso evita tratar números equivalentes como
// matrículas diferentes.

export const chaveMatricula = (numero) => {
  const digitos = String(numero ?? '')
    .replace(/\D/g, '');

  if (!digitos) {
    return '';
  }

  return digitos.replace(/^0+/, '') || '0';
};

// Verifica o formato aceito pelo sistema.

function validarMatricula(numero) {
  const chave = chaveMatricula(numero);

  const formatoValido =
    /^[1-9][0-9]{3,19}$/.test(chave);

  if (!formatoValido) {
    throw new Error('MATRICULA_INVALIDA');
  }

  return chave;
}

// Valida o nome do usuário.

function validarNome(nome) {
  const nomeNormalizado = String(nome ?? '').trim();

  if (
    nomeNormalizado.length === 0 ||
    nomeNormalizado.length > 160
  ) {
    throw new Error('NOME_INVALIDO');
  }

  return nomeNormalizado;
}

// Normaliza e-mail.

function normalizarEmail(email) {
  const valor = String(email ?? '')
    .trim()
    .toLowerCase();

  if (!valor || !valor.includes('@')) {
    throw new Error('EMAIL_INVALIDO');
  }

  return valor;
}

// =====================================================
// 4. LOGIN
// =====================================================

export const entrarComSenha = async (email, senha) => {
  const emailNormalizado = normalizarEmail(email);

  const credencial = await signInWithEmailAndPassword(
    auth,
    emailNormalizado,
    senha
  );

  return credencial.user;
};

// =====================================================
// 5. REDEFINIÇÃO DE SENHA
// =====================================================

export const enviarRedefinicaoSenha = async (email) => {
  const emailNormalizado = normalizarEmail(email);

  await sendPasswordResetEmail(
    auth,
    emailNormalizado
  );
};

// =====================================================
// 6. LOGOUT
// =====================================================

export const realizarLogout = async () => {
  await signOut(auth);
};

// =====================================================
// 7. CONSULTAR PERFIL
// =====================================================

export const buscarPerfilUsuario = async (uid) => {
  if (!uid) {
    throw new Error('UID_INVALIDO');
  }

  const usuarioRef = doc(
    db,
    'usuarios',
    uid
  );

  const snapshot = await getDoc(usuarioRef);

  if (!snapshot.exists()) {
    return null;
  }

  return {
    id: snapshot.id,
    ...snapshot.data(),
  };
};

// =====================================================
// 8. COMPLETAR CADASTRO
// =====================================================
//
// Responsável por criar:
// - usuarios/{uid}
// - matriculas/{numero}
//
// Os dois documentos são gravados na mesma
// transação do Firestore.
//
// Se qualquer operação for recusada, a transação
// não grava nenhum dos documentos.
//
// A matrícula de outra pessoa não é consultada.
//
// O Firestore deve permitir CREATE, mas negar
// UPDATE em matriculas/{numero}.
// Assim, uma matrícula já existente não pode
// ser sobrescrita.
//
// IMPORTANTE:
// O bloqueio real depende do firestore.rules.
// =====================================================

export const completarCadastro = async ({
  uid,
  email,
  nome,
  numeroCadastro,
}) => {
  const usuarioAutenticado = auth.currentUser;

  // -----------------------------------------------
  // Verificar autenticação
  // -----------------------------------------------

  if (
    !usuarioAutenticado ||
    usuarioAutenticado.uid !== uid
  ) {
    throw new Error('USUARIO_NAO_AUTENTICADO');
  }

  const emailAutenticado = normalizarEmail(
    usuarioAutenticado.email
  );

  const emailInformado = normalizarEmail(email);

  if (emailAutenticado !== emailInformado) {
    throw new Error('EMAIL_INVALIDO');
  }

  // -----------------------------------------------
  // Verificar domínio somente se configurado
  // -----------------------------------------------

  if (!dominioPermitido(emailAutenticado)) {
    throw new DominioNaoPermitidoError(
      emailAutenticado
    );
  }

  // -----------------------------------------------
  // Validar dados
  // -----------------------------------------------

  const nomeValidado = validarNome(nome);

  const matriculaValidada = validarMatricula(
    numeroCadastro
  );

  // -----------------------------------------------
  // Referências do Firestore
  // -----------------------------------------------

  const usuarioRef = doc(
    db,
    'usuarios',
    uid
  );

  const matriculaRef = doc(
    db,
    'matriculas',
    matriculaValidada
  );

  // -----------------------------------------------
  // Transação atômica
  // -----------------------------------------------

  await runTransaction(db, async (transacao) => {
    // Somente o próprio perfil é consultado.
    // Não precisamos consultar matrículas alheias.

    const usuarioSnap = await transacao.get(
      usuarioRef
    );

    // ---------------------------------------------
    // Caso 1: perfil já existe
    // ---------------------------------------------

    if (usuarioSnap.exists()) {
      const dadosAtuais = usuarioSnap.data();

      const matriculaAtual =
        dadosAtuais.numeroCadastro || '';

      // Não permitir alterar matrícula existente.
      if (matriculaAtual) {
        if (
          chaveMatricula(matriculaAtual) !==
          matriculaValidada
        ) {
          throw new Error(
            'MATRICULA_NAO_EDITAVEL'
          );
        }

        // Não reescreve a matrícula nem o perfil.
        // A integridade das reservas antigas
        // será verificada separadamente.
        return;
      }

      // -------------------------------------------
      // Perfil antigo sem matrícula
      // -------------------------------------------

      // O documento será criado somente se
      // a matrícula ainda não estiver reservada.
      //
      // Caso já exista, a regra do Firestore
      // negará a atualização.

      transacao.set(matriculaRef, {
        uid,
        criadoEm: serverTimestamp(),
      });

      transacao.update(usuarioRef, {
        nome: nomeValidado,
        numeroCadastro: matriculaValidada,
      });

      return;
    }

    // ---------------------------------------------
    // Caso 2: perfil novo
    // ---------------------------------------------

    // Reservar matrícula.

    transacao.set(matriculaRef, {
      uid,
      criadoEm: serverTimestamp(),
    });

    // Criar perfil do estudante.
    //
    // O papel administrativo não pode ser
    // concedido durante o cadastro.

    transacao.set(usuarioRef, {
      nome: nomeValidado,
      email: emailAutenticado,
      numeroCadastro: matriculaValidada,

      tipo: 'usuario',
      eAdmin: false,

      dataCriacao: serverTimestamp(),
    });
  });

  return true;
};

// =====================================================
// 9. CADASTRAR COM E-MAIL E SENHA
// =====================================================
//
// Primeiro cria a conta no Firebase Authentication.
//
// Depois cria o perfil e reserva a matrícula.
//
// Se a transação falhar, tenta desfazer a conta
// recém-criada no Authentication.
//
// Não são necessárias Cloud Functions.
// =====================================================

export const cadastrarComSenha = async ({
  email,
  senha,
  nome,
  numeroCadastro,
}) => {
  // -----------------------------------------------
  // Validar antes de criar a conta
  // -----------------------------------------------

  const emailNormalizado = normalizarEmail(email);

  const nomeValidado = validarNome(nome);

  const matriculaValidada = validarMatricula(
    numeroCadastro
  );

  if (!dominioPermitido(emailNormalizado)) {
    throw new DominioNaoPermitidoError(
      emailNormalizado
    );
  }

  if (
    typeof senha !== 'string' ||
    senha.length < 6
  ) {
    throw new Error('SENHA_INVALIDA');
  }

  // -----------------------------------------------
  // Criar conta no Authentication
  // -----------------------------------------------

  const credencial = await createUserWithEmailAndPassword(
    auth,
    emailNormalizado,
    senha
  );

  const usuarioCriado = credencial.user;

  // -----------------------------------------------
  // Criar perfil e matrícula
  // -----------------------------------------------

  try {
    await completarCadastro({
      uid: usuarioCriado.uid,
      email: usuarioCriado.email,
      nome: nomeValidado,
      numeroCadastro: matriculaValidada,
    });

    return usuarioCriado;

  } catch (erroCadastro) {
    console.error(
      'Falha ao criar perfil e reservar matrícula:',
      erroCadastro
    );

    // ---------------------------------------------
    // Desfazer conta incompleta
    // ---------------------------------------------

    try {
      await deleteUser(usuarioCriado);

    } catch (erroExclusao) {
      console.error(
        'Não foi possível desfazer a conta incompleta:',
        erroExclusao
      );

      // Evita manter a sessão de uma conta
      // que não possui perfil completo.
      try {
        await signOut(auth);
      } catch (erroLogout) {
        console.error(
          'Falha ao encerrar sessão incompleta:',
          erroLogout
        );
      }
    }

    // Não tratamos todo permission-denied como
    // matrícula duplicada, pois pode representar
    // uma falha diferente nas regras.

    throw erroCadastro;
  }
};

// =====================================================
// 10. EXCLUSÃO DE USUÁRIOS
// =====================================================
//
// Excluir apenas um documento do Firestore
// não remove a conta do Firebase Authentication.
//
// Por segurança, a operação fica bloqueada.
// =====================================================

export const excluirPerfilUsuario = async () => {
  throw new Error(
    'Exclusão de contas temporariamente desativada por segurança.'
  );
};

// =====================================================
// 11. SINCRONIZAÇÃO DE MATRÍCULAS
// =====================================================
//
// Não executamos migração automática de contas
// antigas pelo navegador.
//
// Esse processo precisa identificar conflitos
// antes de modificar o banco de dados.
// =====================================================

export const sincronizarMatriculas = async () => {
  throw new Error(
    'Sincronização automática de matrículas desativada. É necessária uma migração controlada.'
  );
};
