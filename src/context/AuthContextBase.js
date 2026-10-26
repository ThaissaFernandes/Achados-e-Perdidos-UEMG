
import { createContext } from 'react';

// Contexto compartilhado da autenticação.
// O provedor fica no AuthContext.jsx e o hook
// de acesso fica em src/hooks/useAuth.js.
export const AuthContext = createContext(null);
