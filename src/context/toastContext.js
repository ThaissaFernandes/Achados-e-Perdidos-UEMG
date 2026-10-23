import { createContext } from 'react';

export const ToastContext = createContext({
  sucesso: () => {},
  erro: () => {},
  info: () => {},
});
