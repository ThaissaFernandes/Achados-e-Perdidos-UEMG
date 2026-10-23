import { useCallback, useMemo, useRef, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { ToastContext } from './toastContext';

const ESTILOS = {
  sucesso: { caixa: 'bg-emerald-50 border-emerald-200 text-emerald-900', Icone: CheckCircle2, cor: 'text-emerald-600' },
  erro: { caixa: 'bg-rose-50 border-rose-200 text-rose-900', Icone: AlertCircle, cor: 'text-rose-600' },
  info: { caixa: 'bg-indigo-50 border-indigo-200 text-indigo-900', Icone: Info, cor: 'text-indigo-700' },
};

// Substitui os alert() nativos por mensagens não bloqueantes, no padrão visual do sistema
// (Nielsen 1 - feedback claro e Nielsen 9 - mensagens de erro em linguagem simples).
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const contador = useRef(0);

  const remover = useCallback((id) => {
    setToasts((atual) => atual.filter((t) => t.id !== id));
  }, []);

  const adicionar = useCallback(
    (tipo, mensagem) => {
      const id = ++contador.current;
      setToasts((atual) => [...atual, { id, tipo, mensagem }]);
      setTimeout(() => remover(id), tipo === 'erro' ? 7000 : 4500);
    },
    [remover]
  );

  const valor = useMemo(
    () => ({
      sucesso: (m) => adicionar('sucesso', m),
      erro: (m) => adicionar('erro', m),
      info: (m) => adicionar('info', m),
    }),
    [adicionar]
  );

  return (
    <ToastContext.Provider value={valor}>
      {children}
      <div
        className="fixed z-[60] inset-x-0 bottom-24 md:bottom-6 flex flex-col items-center gap-2 px-4 pointer-events-none"
        role="status"
        aria-live="polite"
      >
        {toasts.map(({ id, tipo, mensagem }) => {
          const { caixa, Icone, cor } = ESTILOS[tipo];
          return (
            <div
              key={id}
              className={`pointer-events-auto w-full max-w-md flex items-start gap-3 border rounded-2xl px-4 py-3 text-sm shadow-lg ${caixa}`}
            >
              <Icone size={18} className={`${cor} shrink-0 mt-0.5`} aria-hidden="true" />
              <p className="flex-1 leading-snug">{mensagem}</p>
              <button
                type="button"
                onClick={() => remover(id)}
                aria-label="Fechar mensagem"
                className="shrink-0 -m-1 p-2 rounded-lg hover:bg-black/5"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
