import { useContext } from 'react';
import { ToastContext } from '../context/toastContext';

export const useToast = () => useContext(ToastContext);
