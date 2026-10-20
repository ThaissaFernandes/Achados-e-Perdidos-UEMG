import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Configuração do Firebase (com export para a instância secundária do modal)
export const firebaseConfig = {
  apiKey: "AIzaSyATywq1q2moGJFdCkiPUTLuxA09040iGfA",
  authDomain: "achados-e-perdidos-uemg.firebaseapp.com",
  projectId: "achados-e-perdidos-uemg",
  storageBucket: "achados-e-perdidos-uemg.firebasestorage.app",
  messagingSenderId: "839167316208",
  appId: "1:839167316208:web:5f68a9b3b61b264938b235"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);