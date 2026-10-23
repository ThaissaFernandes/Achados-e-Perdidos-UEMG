import { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

// Campo de senha com opção de mostrar/ocultar, útil no celular, onde digitar
// senha às cegas gera muitos erros (Nielsen 5 - Prevenção de erros).
export default function CampoSenha({
  id,
  value,
  onChange,
  placeholder,
  autoComplete = 'current-password',
  minLength,
  describedBy,
}) {
  const [visivel, setVisivel] = useState(false);

  return (
    <div className="relative">
      <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
      <input
        id={id}
        type={visivel ? 'text' : 'password'}
        required
        minLength={minLength}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={onChange}
        aria-describedby={describedBy}
        className="w-full pl-10 pr-12 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-indigo-900 focus:ring-2 focus:ring-indigo-900/10 transition-all"
      />
      <button
        type="button"
        onClick={() => setVisivel((v) => !v)}
        aria-label={visivel ? 'Ocultar senha' : 'Mostrar senha'}
        aria-pressed={visivel}
        className="absolute right-1 top-1/2 -translate-y-1/2 p-2.5 text-gray-500 hover:text-indigo-900 rounded-lg"
      >
        {visivel ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  );
}
