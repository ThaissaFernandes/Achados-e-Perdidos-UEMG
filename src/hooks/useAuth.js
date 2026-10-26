
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContextBase';

export function useAuth() {
  const contexto = useContext(AuthContext);

  if (contexto === null) {
    throw new Error(
      'useAuth deve ser utilizado dentro de AuthProvider.'
    );
  }

  return contexto;
}
