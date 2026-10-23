import { useEffect, useRef } from 'react';

const FOCAVEIS =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

// Modal acessível: role="dialog", aria-modal, fecha com Esc e clique fora,
// mantém o foco dentro do diálogo e devolve o foco ao elemento que o abriu
// (Nielsen 3 - Controle e liberdade do usuário).
export default function Modal({ aberto, onFechar, titulo, descricaoId, children, travarFechamento = false, larguraMax = 'max-w-sm' }) {
  const caixaRef = useRef(null);
  const tituloId = 'modal-titulo';

  useEffect(() => {
    if (!aberto) return;

    const anterior = document.activeElement;
    const caixa = caixaRef.current;
    const primeiro = caixa?.querySelector(FOCAVEIS);
    primeiro?.focus();

    const overflowOriginal = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const aoTeclar = (e) => {
      if (e.key === 'Escape' && !travarFechamento) {
        onFechar();
        return;
      }
      if (e.key !== 'Tab' || !caixa) return;
      const itens = Array.from(caixa.querySelectorAll(FOCAVEIS));
      if (itens.length === 0) return;
      const ini = itens[0];
      const fim = itens[itens.length - 1];
      if (e.shiftKey && document.activeElement === ini) {
        e.preventDefault();
        fim.focus();
      } else if (!e.shiftKey && document.activeElement === fim) {
        e.preventDefault();
        ini.focus();
      }
    };

    document.addEventListener('keydown', aoTeclar);
    return () => {
      document.removeEventListener('keydown', aoTeclar);
      document.body.style.overflow = overflowOriginal;
      anterior?.focus?.();
    };
  }, [aberto, onFechar, travarFechamento]);

  if (!aberto) return null;

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !travarFechamento) onFechar();
      }}
    >
      <div
        ref={caixaRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={tituloId}
        aria-describedby={descricaoId}
        className={`bg-white rounded-2xl p-6 w-full ${larguraMax} shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto`}
      >
        <h3 id={tituloId} className="text-base font-bold text-gray-900">
          {titulo}
        </h3>
        {children}
      </div>
    </div>
  );
}