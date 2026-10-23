import { useState, useRef, useEffect, useId } from 'react';
import { ChevronDown, Check, Search } from 'lucide-react';
import { normalizar } from '../utils/texto';

// Lista suspensa acessível: funciona com teclado (setas, Enter, Esc), anuncia estado
// para leitores de tela e tem alvos de toque de pelo menos 44px.
export default function FiltroDropdown({
  label,
  icone: Icone,
  opcoes = [],
  selecionado,
  onSelect,
  className = 'w-full sm:w-60',
}) {
  const [aberto, setAberto] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const [indiceAtivo, setIndiceAtivo] = useState(0);
  const raizRef = useRef(null);
  const botaoRef = useRef(null);
  const listaId = useId();
  const rotuloId = useId();

  const fechar = (devolverFoco = false) => {
    setAberto(false);
    setTermoBusca('');
    if (devolverFoco) botaoRef.current?.focus();
  };

  // Fecha ao tocar/clicar fora (pointerdown cobre mouse e toque)
  useEffect(() => {
    function aoTocarFora(event) {
      if (raizRef.current && !raizRef.current.contains(event.target)) {
        setAberto(false);
        setTermoBusca('');
      }
    }
    document.addEventListener('pointerdown', aoTocarFora);
    return () => document.removeEventListener('pointerdown', aoTocarFora);
  }, []);

  // Busca sem diferenciar acentos nem maiúsculas
  const opcoesFiltradas = opcoes.filter((item) =>
    normalizar(item.nome || item.label).includes(normalizar(termoBusca))
  );

  const opcaoAtual = opcoes.find((item) => item.id === selecionado) || opcoes[0];
  const mostrarBusca = opcoes.length > 5;
  // Só foca o campo de busca com mouse/teclado: no celular isso abriria o teclado por cima da lista.
  const podeAutoFocar = typeof window !== 'undefined' && window.matchMedia?.('(pointer: fine)').matches;

  const escolher = (opcao) => {
    onSelect(opcao.id);
    fechar(true);
  };

  const aoTeclarNaLista = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      fechar(true);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIndiceAtivo((i) => Math.min(i + 1, opcoesFiltradas.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIndiceAtivo((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && opcoesFiltradas[indiceAtivo]) {
      e.preventDefault();
      escolher(opcoesFiltradas[indiceAtivo]);
    }
  };

  const abrir = () => {
    const idx = opcoes.findIndex((o) => o.id === selecionado);
    setIndiceAtivo(Math.max(idx, 0));
    setAberto(true);
  };

  return (
    <div
      className={`relative space-y-1.5 ${className}`}
      ref={raizRef}
      onKeyDown={aberto ? aoTeclarNaLista : undefined}
    >
      {/* Rótulo com Ícone */}
      <span id={rotuloId} className="flex items-center gap-1.5 text-xs font-semibold text-gray-700">
        {Icone && <Icone size={14} className="text-indigo-900 shrink-0" aria-hidden="true" />}
        <span>{label}</span>
      </span>

      {/* Botão de Abertura */}
      <button
        ref={botaoRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={aberto ? listaId : undefined}
        aria-labelledby={`${rotuloId} ${rotuloId}-valor`}
        onClick={() => (aberto ? fechar() : abrir())}
        className="w-full min-h-11 flex items-center justify-between bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-sm text-gray-800 shadow-xs hover:border-gray-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-700 transition-all cursor-pointer"
      >
        <span id={`${rotuloId}-valor`} className="truncate font-medium">
          {opcaoAtual?.nome || opcaoAtual?.label}
        </span>
        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`text-gray-500 transition-transform duration-200 ${aberto ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Popover */}
      {aberto && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl p-2 space-y-2 text-sm">
          {mostrarBusca && (
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
              <input
                type="text"
                aria-label={`Buscar em ${label.toLowerCase()}`}
                placeholder={`Buscar ${label.toLowerCase()}...`}
                value={termoBusca}
                onChange={(e) => {
                  setTermoBusca(e.target.value);
                  setIndiceAtivo(0);
                }}
                className="w-full pl-8 pr-3 py-2 min-h-10 bg-gray-50 border border-gray-200 rounded-lg outline-none focus:bg-white focus:border-indigo-900 transition-all"
                autoFocus={podeAutoFocar}
              />
            </div>
          )}

          <div
            id={listaId}
            role="listbox"
            aria-labelledby={rotuloId}
            className="max-h-56 overflow-y-auto space-y-0.5 pr-1"
          >
            {opcoesFiltradas.length > 0 ? (
              opcoesFiltradas.map((opcao, i) => {
                const isSelected = opcao.id === selecionado;
                const nomeExibicao = opcao.nome || opcao.label;

                return (
                  <div
                    key={opcao.id}
                    role="option"
                    aria-selected={isSelected}
                    tabIndex={-1}
                    onClick={() => escolher(opcao)}
                    onMouseEnter={() => setIndiceAtivo(i)}
                    className={`w-full min-h-11 flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors cursor-pointer ${
                      isSelected ? 'bg-indigo-50 text-indigo-900 font-semibold' : 'text-gray-700'
                    } ${i === indiceAtivo ? 'bg-gray-100' : ''}`}
                  >
                    <span className="truncate">{nomeExibicao}</span>
                    {isSelected && <Check size={16} className="text-indigo-900 shrink-0 ml-2" aria-hidden="true" />}
                  </div>
                );
              })
            ) : (
              <div className="p-3 text-center text-gray-600">Nenhum resultado encontrado</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
