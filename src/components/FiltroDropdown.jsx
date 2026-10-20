import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';

export default function FiltroDropdown({ 
  label, 
  icone: Icone, 
  opcoes = [], 
  selecionado, 
  onSelect 
}) {
  const [aberto, setAberto] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const dropdownRef = useRef(null);

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setAberto(false);
        setTermoBusca('');
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtra as opções pelo campo de pesquisa interno
  const opcoesFiltradas = opcoes.filter((item) => {
    const nomeExibicao = item.nome || item.label || '';
    return nomeExibicao.toLowerCase().includes(termoBusca.toLowerCase());
  });

  const opcaoAtual = opcoes.find((item) => item.id === selecionado) || opcoes[0];

  return (
    <div className="relative w-full sm:w-60 space-y-1.5" ref={dropdownRef}>
      {/* Rótulo com Ícone */}
      <label className="flex items-center gap-1.5 text-xs font-semibold text-gray-600">
        {Icone && <Icone size={14} className="text-indigo-900 shrink-0" />}
        <span>{label}</span>
      </label>

      {/* Botão de Abertura */}
      <button
        type="button"
        onClick={() => setAberto(!aberto)}
        className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 shadow-xs hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-900/10 transition-all cursor-pointer"
      >
        <span className="truncate font-medium">{opcaoAtual?.nome || opcaoAtual?.label}</span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {/* Popover Deslizável */}
      {aberto && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl p-2 space-y-2 text-xs">
          
          {/* Campo de Pesquisa Rápida (só exibe se houver mais de 5 opções) */}
          {opcoes.length > 5 && (
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={`Buscar ${label.toLowerCase()}...`}
                value={termoBusca}
                onChange={(e) => setTermoBusca(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:bg-white focus:border-indigo-900 transition-all"
                autoFocus
              />
            </div>
          )}

          {/* Lista de Opções com Scroll Limitado (max-h-52) */}
          <div className="max-h-52 overflow-y-auto space-y-0.5 scrollbar-thin pr-1">
            {opcoesFiltradas.length > 0 ? (
              opcoesFiltradas.map((opcao) => {
                const isSelected = opcao.id === selecionado;
                const nomeExibicao = opcao.nome || opcao.label;

                return (
                  <button
                    key={opcao.id}
                    type="button"
                    onClick={() => {
                      onSelect(opcao.id);
                      setAberto(false);
                      setTermoBusca('');
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-50 text-indigo-900 font-semibold'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <span className="truncate">{nomeExibicao}</span>
                    {isSelected && <Check size={14} className="text-indigo-900 shrink-0 ml-2" />}
                  </button>
                );
              })
            ) : (
              <div className="p-3 text-center text-gray-400 text-xs">
                Nenhum resultado encontrado
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}