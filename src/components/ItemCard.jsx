import { useState } from 'react';
import { MapPin, Calendar, Tag, Package } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';

export default function ItemCard({ id, title, category, location, date, status, imageUrl }) {
  const [imgError, setImgError] = useState(false);

  return (
    <Link
      to={`/item/${id}`}
      className="bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex gap-3 items-center hover:shadow-md transition-shadow cursor-pointer"
    >
      {/* Imagem do Item com Fallback de foto quebrada/ausente */}
      <div className="w-20 h-20 rounded-xl bg-gray-50 shrink-0 overflow-hidden flex items-center justify-center border border-gray-100 relative">
        {imageUrl && !imgError ? (
          <img
            src={imageUrl}
            alt={title ? `Foto de ${title}` : 'Foto do item'}
            loading="lazy"
            decoding="async"
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="flex flex-col items-center justify-center text-gray-500 p-2" aria-label="Item sem foto">
            <Package size={26} className="text-indigo-900/50" aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Informações Principais */}
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-1 mb-1">
          <h3 className="text-sm font-semibold text-gray-900 truncate">{title || 'Sem título'}</h3>
          <StatusBadge status={status} />
        </div>

        <p className="text-xs text-gray-600 mb-2 flex items-center gap-1">
          <Tag size={12} className="text-gray-500" aria-hidden="true" />
          <span className="truncate">{category || 'Geral'}</span>
        </p>

        <div className="flex items-center gap-3 text-xs text-gray-600">
          <span className="flex items-center gap-1 truncate">
            <MapPin size={12} className="text-indigo-900 shrink-0" aria-hidden="true" />
            <span className="truncate">{location || 'Local não informado'}</span>
          </span>
          <span className="flex items-center gap-1 shrink-0">
            <Calendar size={12} aria-hidden="true" />
            {date || 'Recente'}
          </span>
        </div>
      </div>
    </Link>
  );
}
