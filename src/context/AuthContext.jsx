import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeSnapshot = null;

    // Escuta alterações no estado de autenticação do Firebase
    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const docRef = doc(db, 'usuarios', firebaseUser.uid);

        // Escuta atualizações do perfil no Firestore em tempo real
        unsubscribeSnapshot = onSnapshot(
          docRef,
          (docSnap) => {
            if (docSnap.exists()) {
              const dadosDoc = docSnap.data();
              setUsuario({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                ...dadosDoc
              });
            } else {
              setUsuario({
                uid: firebaseUser.uid,
                email: firebaseUser.email,
                tipo: 'usuario',
                eAdmin: false
              });
            }
            setLoading(false);
          },
          (error) => {
            console.error("Erro ao carregar dados do perfil em tempo real:", error);
            setUsuario({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              tipo: 'usuario',
              eAdmin: false
            });
            setLoading(false);
          }
        );
      } else {
        setUsuario(null);
        setLoading(false);
      }
    });

    // Limpa os listeners ao desmontar o componente
    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) unsubscribeSnapshot();
    };
  }, []);

  // Compatibilidade flexível para identificar administradores
  const eAdmin = usuario?.tipo === 'admin' || usuario?.eAdmin === true;

  return (
    <AuthContext.Provider value={{ usuario, loading, eAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};