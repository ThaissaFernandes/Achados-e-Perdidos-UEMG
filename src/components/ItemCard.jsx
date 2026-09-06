import { useState } from 'react';
import { MapPin, Calendar, Tag, Package } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function ItemCard({ id, title, category, location, date, status, imageUrl }) {
  const [imgError, setImgError] = useState(false);

  // Trata os status do Firestore para definir a paleta visual (Nielsen - Visibilidade do Estado)
  const getStatusStyle = (st) => {
    const statusLower = (st || '').toLowerCase().trim();
    
    if (statusLower === 'disponível' || statusLower === 'disponivel') {
      return 'bg-emerald-100 text-emerald-700 border border-emerald-200';
    }
    if (statusLower === 'em análise' || statusLower === 'em analise') {
      return 'bg-amber-100 text-amber-700 border border-amber-200';
    }
    if (statusLower === 'devolvido') {
      return 'bg-rose-100 text-rose-700 border border-rose-200';
    }
    return 'bg-gray-100 text-gray-700 border border-gray-200';
  };

  return (
    <Link 
      to={`/item/${id}`}
      className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex gap-3 items-center hover:shadow-md transition-shadow cursor-pointer block"
    >
      {/* Imagem do Item com Fallback de foto quebrada/ausente */}
      <div className="w-20 h-20 rounded-xl bg-gray-50 shrink-0 overflow-hidden flex items-center justify-center border border-gray-100 relative">
        {imageUrl && !imgError ? (
          <img 
            src={imageUrl} 
            alt={title || 'Item'} 
            onError={() => setImgError(true)}
            className="w-full h-full object-cover" 
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-400 p-2">
            <Package size={26} className="text-indigo-900/40" />
          </div>
        )}
      </div>

      {/* Informações Principais */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-1 mb-1">
          <h3 className="text-sm font-semibold text-gray-900 truncate">
            {title || 'Sem título'}
          </h3>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${getStatusStyle(status)}`}>
            {status || 'Indefinido'}
          </span>
        </div>

        <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
          <Tag size={12} className="text-gray-400" /> 
          <span className="truncate">{category || 'Geral'}</span>
        </p>

        <div className="flex items-center gap-3 text-[11px] text-gray-500">
          <span className="flex items-center gap-1 truncate">
            <MapPin size={12} className="text-indigo-900 shrink-0" />
            <span className="truncate">{location || 'Local não informado'}</span>
          </span>
          <span className="flex items-center gap-1 shrink-0">
            <Calendar size={12} />
            {date || 'Recente'}
          </span>
        </div>
      </div>
    </Link>
  );
}