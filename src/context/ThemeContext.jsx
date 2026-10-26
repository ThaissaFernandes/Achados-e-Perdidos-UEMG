
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { ThemeContext } from './ThemeContextBase';

// =====================================================
// CONFIGURAÇÕES
// =====================================================

const KEY = 'achados-perdidos-tema';

// =====================================================
// IDENTIFICAR O TEMA INICIAL
// =====================================================

function obterTemaInicial() {
  try {
    // Verifica se o usuário já escolheu um tema.
    const temaSalvo = window.localStorage.getItem(KEY);

    if (temaSalvo === 'dark' || temaSalvo === 'light') {
      return temaSalvo;
    }

    // Caso não exista preferência salva,
    // identifica a preferência do sistema.
    if (typeof window.matchMedia === 'function') {
      const prefereEscuro = window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches;

      return prefereEscuro ? 'dark' : 'light';
    }

    return 'light';
  } catch {
    return 'light';
  }
}

// =====================================================
// PROVEDOR DO TEMA
// =====================================================

export function ThemeProvider({ children }) {
  const [tema, setTema] = useState(obterTemaInicial);

  // ===================================================
  // APLICAR O TEMA E SALVAR A PREFERÊNCIA
  // ===================================================

  useEffect(() => {
    const modoEscuro = tema === 'dark';

    // Aplica o modo escuro ao elemento HTML.
    document.documentElement.classList.toggle(
      'dark',
      modoEscuro
    );

    // Ajusta o tema dos elementos nativos.
    document.documentElement.style.colorScheme = tema;

    // Salva a escolha do usuário.
    try {
      window.localStorage.setItem(KEY, tema);
    } catch {
      // O armazenamento pode estar indisponível.
    }
  }, [tema]);

  // ===================================================
  // ALTERNAR ENTRE CLARO E ESCURO
  // ===================================================

  const alternarTema = useCallback(() => {
    setTema((temaAtual) =>
      temaAtual === 'dark' ? 'light' : 'dark'
    );
  }, []);

  // ===================================================
  // DISPONIBILIZAR O CONTEXTO
  // ===================================================

  const valorContexto = useMemo(
    () => ({
      tema,
      alternarTema,
    }),
    [tema, alternarTema]
  );

  return (
    <ThemeContext.Provider value={valorContexto}>
      {children}
    </ThemeContext.Provider>
  );
}
