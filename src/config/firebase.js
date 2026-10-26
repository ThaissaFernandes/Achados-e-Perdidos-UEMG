
import { initializeApp } from 'firebase/app';

import {
  getAuth,
  connectAuthEmulator
} from 'firebase/auth';

import {
  getFirestore,
  connectFirestoreEmulator
} from 'firebase/firestore';

import { getStorage } from 'firebase/storage';

import {
  initializeAppCheck,
  ReCaptchaV3Provider
} from 'firebase/app-check';

// Configurações do Firebase
export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Inicialização
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Modo de teste ativado explicitamente
const usarEmuladores =
  import.meta.env.DEV &&
  import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';

// Conecta aos emuladores locais
if (usarEmuladores) {
  if (firebaseConfig.projectId !== 'achados-e-perdidos-uemg') {
    throw new Error('Projeto Firebase inesperado no modo de teste.');
  }

  connectAuthEmulator(
    auth,
    'http://127.0.0.1:9099',
    { disableWarnings: true }
  );

  connectFirestoreEmulator(
    db,
    '127.0.0.1',
    8080
  );

  console.info(
    'Firebase em modo de teste: Authentication e Firestore locais.'
  );
}

// App Check para ambiente real
if (
  !usarEmuladores &&
  import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY
) {
  initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(
      import.meta.env.VITE_FIREBASE_APPCHECK_SITE_KEY
    ),
    isTokenAutoRefreshEnabled: true,
  });
}
