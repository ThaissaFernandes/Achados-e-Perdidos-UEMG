
import { useState } from 'react';
import { MapPin, Calendar, Tag, Package, ImageOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import StatusBadge from './StatusBadge';

export default function ItemCard({
  id,
  title,
  category,
  location,
  date,
  status,
  imageUrl,
}) {
  const [failedUrl, setFailedUrl] = useState('');
  const temImagem = Boolean(imageUrl && failedUrl !== imageUrl);

  return (
    <Link
      to={`/item/${id}`}
      className="item-card bg-white rounded-2xl p-3 shadow-sm border border-gray-100 flex gap-3 items-center hover:shadow-md transition-shadow cursor-pointer"
    >
      <div className="item-card-image w-24 h-24 sm:w-28 sm:h-28 rounded-xl shrink-0 overflow-hidden flex items-center justify-center border border-gray-100 relative">
        {temImagem ? (
          <img
            src={imageUrl}
            alt={title ? `Imagem do item: ${title}` : 'Imagem do item'}
            loading="lazy"
            decoding="async"
            onError={() => setFailedUrl(imageUrl)}
            className="w-full h-full object-cover transition-transform duration-300"
          />
        ) : (
          <div
            className="item-image-placeholder w-full h-full flex flex-col items-center justify-center gap-1 p-2"
            aria-label="Item sem imagem cadastrada"
          >
            {imageUrl ? (
              <ImageOff size={25} aria-hidden="true" />
            ) : (
              <Package size={29} aria-hidden="true" />
            )}
            <span className="text-[10px] font-medium text-center">
              Sem imagem
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start gap-2 mb-1">
          <h3 className="text-sm font-semibold text-gray-900 line-clamp-2">
            {title || 'Sem título'}
          </h3>
          <StatusBadge status={status} />
        </div>

        <p className="text-xs text-gray-600 mb-2 flex items-center gap-1">
          <Tag size={12} className="text-gray-500 shrink-0" aria-hidden="true" />
          <span className="truncate">{category || 'Geral'}</span>
        </p>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-600">
          <span className="flex items-center gap-1 min-w-0">
            <MapPin size={12} className="text-indigo-900 shrink-0" aria-hidden="true" />
            <span className="truncate">
              {location || 'Local não informado'}
            </span>
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
