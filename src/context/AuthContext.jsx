
import { useEffect, useState } from 'react';

import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

import { auth, db } from '../config/firebase';
import { AuthContext } from './AuthContextBase';

// =====================================================
// MONTAR OS DADOS DO USUÁRIO
// =====================================================

function montarUsuario(firebaseUser, dadosDoc) {
  const base = {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName || '',
  };

  if (!dadosDoc) {
    return {
      ...base,
      tipo: 'usuario',
      eAdmin: false,
      perfilIncompleto: true,
    };
  }

  const temMatricula =
    String(
      dadosDoc.numeroCadastro ||
      dadosDoc.matricula ||
      ''
    ).trim() !== '';

  return {
    ...base,
    ...dadosDoc,
    // Preserva o UID autenticado como identidade
    // do usuário, independentemente do documento.
    uid: firebaseUser.uid,
    perfilIncompleto: !temMatricula,
  };
}

// =====================================================
// PROVEDOR DE AUTENTICAÇÃO
// =====================================================

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(null);
  const [eAdmin, setEAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribePerfil = null;
    let unsubscribeAdmin = null;

    // Identifica a sessão atual para evitar que
    // callbacks antigos atualizem a nova sessão.
    let numeroSessao = 0;
    let desmontado = false;

    // =================================================
    // REMOVER LISTENERS ANTERIORES
    // =================================================

    const limparListeners = () => {
      unsubscribePerfil?.();
      unsubscribeAdmin?.();

      unsubscribePerfil = null;
      unsubscribeAdmin = null;
    };

    // =================================================
    // OBSERVAR LOGIN E LOGOUT
    // =================================================

    const unsubscribeAuth = onAuthStateChanged(
      auth,

      (firebaseUser) => {
        limparListeners();

        numeroSessao += 1;
        const sessaoAtual = numeroSessao;

        const sessaoValida = () =>
          !desmontado && sessaoAtual === numeroSessao;

        // Limpa informações da sessão anterior.
        setUsuario(null);
        setEAdmin(false);
        setLoading(true);

        // Usuário desconectado.
        if (!firebaseUser) {
          setLoading(false);
          return;
        }

        let perfilCarregado = false;
        let adminCarregado = false;

        const verificarCarregamento = () => {
          if (
            sessaoValida() &&
            perfilCarregado &&
            adminCarregado
          ) {
            setLoading(false);
          }
        };

        // =============================================
        // ACOMPANHAR PERFIL DO USUÁRIO
        // =============================================

        const perfilRef = doc(
          db,
          'usuarios',
          firebaseUser.uid
        );

        unsubscribePerfil = onSnapshot(
          perfilRef,

          (snapshot) => {
            if (!sessaoValida()) {
              return;
            }

            const dadosPerfil = snapshot.exists()
              ? snapshot.data()
              : null;

            setUsuario(
              montarUsuario(firebaseUser, dadosPerfil)
            );

            perfilCarregado = true;
            verificarCarregamento();
          },

          (erro) => {
            if (!sessaoValida()) {
              return;
            }

            console.error(
              'Erro ao consultar perfil:',
              erro
            );

            setUsuario(
              montarUsuario(firebaseUser, null)
            );

            perfilCarregado = true;
            verificarCarregamento();
          }
        );

        // =============================================
        // VERIFICAR AUTORIZAÇÃO ADMINISTRATIVA
        // =============================================

        // A permissão administrativa é consultada
        // na coleção administradores/{uid}.
        //
        // Não confiamos no campo eAdmin do perfil
        // como confirmação de autorização.

        const adminRef = doc(
          db,
          'administradores',
          firebaseUser.uid
        );

        unsubscribeAdmin = onSnapshot(
          adminRef,

          (snapshot) => {
            if (!sessaoValida()) {
              return;
            }

            const autorizado =
              snapshot.exists() &&
              snapshot.data().ativo === true;

            setEAdmin(autorizado);

            adminCarregado = true;
            verificarCarregamento();
          },

          (erro) => {
            if (!sessaoValida()) {
              return;
            }

            console.error(
              'Erro ao verificar administrador:',
              erro
            );

            // Falha fechada:
            // erros de leitura não concedem acesso.
            setEAdmin(false);

            adminCarregado = true;
            verificarCarregamento();
          }
        );
      },

      (erro) => {
        if (desmontado) {
          return;
        }

        console.error(
          'Erro na autenticação:',
          erro
        );

        numeroSessao += 1;
        limparListeners();

        setUsuario(null);
        setEAdmin(false);
        setLoading(false);
      }
    );

    // =================================================
    // LIMPEZA DO EFEITO
    // =================================================

    return () => {
      desmontado = true;
      numeroSessao += 1;

      unsubscribeAuth();
      limparListeners();
    };
  }, []);

  // ===================================================
  // DADOS DISPONIBILIZADOS PELO CONTEXTO
  // ===================================================

  // Mantemos loading para componentes existentes.
  // carregandoAuth é um alias para as páginas
  // que utilizam esse nome.

  const valorContexto = {
    usuario,
    eAdmin,
    loading,
    carregandoAuth: loading,
  };

  return (
    <AuthContext.Provider value={valorContexto}>
      {children}
    </AuthContext.Provider>
  );
}
