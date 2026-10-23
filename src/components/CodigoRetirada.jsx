import { Copy, KeyRound } from 'lucide-react';
import { useToast } from '../hooks/useToast';

// Mostra o código de retirada em destaque, com botão de copiar.
// Fonte monoespaçada e grande para ser lido e ditado sem confusão no balcão.
export default function CodigoRetirada({ codigo, className = '' }) {
  const toast = useToast();
  if (!codigo) return null;

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(codigo);
      toast.sucesso('Código copiado.');
    } catch {
      toast.info('Não foi possível copiar. Anote o código mostrado na tela.');
    }
  };

  return (
    <div className={`bg-white border-2 border-dashed border-indigo-300 rounded-2xl p-3.5 text-center ${className}`}>
      <p className="text-xs font-semibold text-indigo-900 uppercase tracking-wider flex items-center justify-center gap-1.5">
        <KeyRound size={14} aria-hidden="true" /> Código de retirada
      </p>
      <p
        className="text-3xl font-black font-mono tracking-widest text-indigo-900 my-1.5 select-all"
        aria-label={`Código de retirada: ${codigo.split('').join(' ')}`}
      >
        {codigo}
      </p>
      <button
        type="button"
        onClick={copiar}
        className="inline-flex items-center gap-1.5 min-h-11 px-3 text-sm font-semibold text-indigo-900 hover:bg-indigo-50 rounded-xl transition"
      >
        <Copy size={14} aria-hidden="true" /> Copiar código
      </button>
    </div>
  );
}
