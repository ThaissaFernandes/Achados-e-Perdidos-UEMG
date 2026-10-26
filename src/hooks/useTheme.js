
import { useContext } from 'react';

import { ThemeContext } from '../context/ThemeContextBase';

export function useTheme() {
  const contexto = useContext(ThemeContext);

  if (contexto === null) {
    throw new Error(
      'useTheme deve ser utilizado dentro de ThemeProvider.'
    );
  }

  return contexto;
}
