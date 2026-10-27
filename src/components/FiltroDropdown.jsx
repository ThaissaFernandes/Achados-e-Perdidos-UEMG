
import {
  useState,
  useRef,
  useEffect,
  useId,
  useCallback,
} from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Search } from 'lucide-react';
import { normalizar } from '../utils/texto';

const ALTURA_MAXIMA = 300;
const MARGEM = 12;

export default function FiltroDropdown({
  label,
  icone: Icone,
  opcoes = [],
  selecionado,
  onSelect,
  className = 'w-full',
}) {
  const [aberto, setAberto] = useState(false);
  const [termoBusca, setTermoBusca] = useState('');
  const [indiceAtivo, setIndiceAtivo] = useState(0);
  const [posicao, setPosicao] = useState(null);

  const raizRef = useRef(null);
  const botaoRef = useRef(null);
  const painelRef = useRef(null);
  const buscaRef = useRef(null);
  const opcoesRef = useRef(null);

  const listaId = useId();
  const rotuloId = useId();

  const opcoesFiltradas = opcoes.filter((opcao) =>
    normalizar(opcao.nome || opcao.label || '').includes(
      normalizar(termoBusca)
    )
  );

  const opcaoAtual =
    opcoes.find((opcao) => opcao.id === selecionado) ||
    opcoes[0];

  const mostrarBusca = opcoes.length > 5;

  const fechar = useCallback((devolverFoco = false) => {
    setAberto(false);
    setTermoBusca('');
    setIndiceAtivo(0);
    setPosicao(null);

    if (devolverFoco) {
      botaoRef.current?.focus();
    }
  }, []);

  const calcularPosicao = useCallback(() => {
    const botao = botaoRef.current;

    if (!botao) return null;

    const retangulo = botao.getBoundingClientRect();

    const espacoAbaixo =
      window.innerHeight - retangulo.bottom - MARGEM;

    const espacoAcima =
      retangulo.top - MARGEM;

    const abrirAcima =
      espacoAbaixo < 220 &&
      espacoAcima > espacoAbaixo;

    const espacoDisponivel = abrirAcima
      ? espacoAcima
      : espacoAbaixo;

    const altura = Math.max(
      100,
      Math.min(ALTURA_MAXIMA, espacoDisponivel)
    );

    const largura = Math.min(
      retangulo.width,
      window.innerWidth - MARGEM * 2
    );

    const esquerda = Math.max(
      MARGEM,
      Math.min(
        retangulo.left,
        window.innerWidth - largura - MARGEM
      )
    );

    return {
      position: 'fixed',
      left: esquerda,
      top: abrirAcima
        ? undefined
        : retangulo.bottom + 8,
      bottom: abrirAcima
        ? window.innerHeight - retangulo.top + 8
        : undefined,
      width: largura,
      maxHeight: altura,
      zIndex: 9999,
    };
  }, []);

  const abrir = () => {
    const indice = opcoes.findIndex(
      (opcao) => opcao.id === selecionado
    );

    setIndiceAtivo(Math.max(indice, 0));
    setTermoBusca('');
    setPosicao(calcularPosicao());
    setAberto(true);
  };

  const escolher = (opcao) => {
    onSelect(opcao.id);
    fechar(true);
  };

  // Fecha ao clicar fora, redimensionar ou rolar a página.
  useEffect(() => {
    if (!aberto) return;

    function aoClicarFora(evento) {
      const clicouNoBotao =
        raizRef.current?.contains(evento.target);

      const clicouNoPainel =
        painelRef.current?.contains(evento.target);

      if (!clicouNoBotao && !clicouNoPainel) {
        fechar();
      }
    }

    function aoRedimensionar() {
      fechar();
    }

    function aoRolar(evento) {
      if (painelRef.current?.contains(evento.target)) {
        return;
      }

      fechar();
    }

    document.addEventListener('pointerdown', aoClicarFora);
    window.addEventListener('resize', aoRedimensionar);
    window.addEventListener('scroll', aoRolar, true);

    return () => {
      document.removeEventListener(
        'pointerdown',
        aoClicarFora
      );

      window.removeEventListener(
        'resize',
        aoRedimensionar
      );

      window.removeEventListener(
        'scroll',
        aoRolar,
        true
      );
    };
  }, [aberto, fechar]);

  // Foca a busca ao abrir no computador.
  useEffect(() => {
    if (!aberto || !mostrarBusca) return;

    const podeFocar =
      window.matchMedia?.('(pointer: fine)').matches;

    if (podeFocar) {
      buscaRef.current?.focus();
    }
  }, [aberto, mostrarBusca]);

  // Navegação por teclado.
  const aoTeclar = (evento) => {
    if (!aberto) {
      if (
        evento.key === 'ArrowDown' ||
        evento.key === 'Enter' ||
        evento.key === ' '
      ) {
        evento.preventDefault();
        abrir();
      }

      return;
    }

    if (evento.key === 'Escape') {
      evento.preventDefault();
      fechar(true);
      return;
    }

    if (evento.key === 'ArrowDown') {
      evento.preventDefault();

      const proximo = Math.min(
        indiceAtivo + 1,
        Math.max(opcoesFiltradas.length - 1, 0)
      );

      setIndiceAtivo(proximo);

      opcoesRef.current
        ?.querySelectorAll('[role="option"]')[proximo]
        ?.scrollIntoView({ block: 'nearest' });

      return;
    }

    if (evento.key === 'ArrowUp') {
      evento.preventDefault();

      const proximo = Math.max(indiceAtivo - 1, 0);

      setIndiceAtivo(proximo);

      opcoesRef.current
        ?.querySelectorAll('[role="option"]')[proximo]
        ?.scrollIntoView({ block: 'nearest' });

      return;
    }

    if (
      evento.key === 'Enter' &&
      opcoesFiltradas[indiceAtivo]
    ) {
      evento.preventDefault();
      escolher(opcoesFiltradas[indiceAtivo]);
    }
  };

  return (
    <div
      ref={raizRef}
      className={`relative space-y-1.5 ${className}`}
      onKeyDown={aoTeclar}
    >
      {/* Rótulo */}
      <span
        id={rotuloId}
        className="flex items-center gap-1.5 text-xs font-semibold text-gray-700"
      >
        {Icone && (
          <Icone
            size={14}
            className="text-indigo-900 shrink-0"
            aria-hidden="true"
          />
        )}

        <span>{label}</span>
      </span>

      {/* Botão principal */}
      <button
        ref={botaoRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={aberto ? listaId : undefined}
        aria-labelledby={`${rotuloId} ${rotuloId}-valor`}
        onClick={() => {
          if (aberto) {
            fechar();
          } else {
            abrir();
          }
        }}
        className="catalog-dropdown-trigger w-full min-h-12 flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-left text-sm font-semibold shadow-xs transition-all cursor-pointer"
      >
        <span
          id={`${rotuloId}-valor`}
          className="truncate"
        >
          {opcaoAtual?.nome ||
            opcaoAtual?.label ||
            'Selecione uma opção'}
        </span>

        <ChevronDown
          size={18}
          aria-hidden="true"
          className={`shrink-0 transition-transform duration-200 ${
            aberto ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Menu flutuante com posicionamento adaptativo */}
      {aberto &&
        posicao &&
        createPortal(
          <div
            ref={painelRef}
            style={posicao}
            className="catalog-dropdown-panel flex flex-col rounded-2xl border p-2 shadow-xl"
            onKeyDown={aoTeclar}
          >
            {mostrarBusca && (
              <div className="relative mb-2 shrink-0">
                <Search
                  size={16}
                  className="catalog-dropdown-search-icon absolute left-3 top-1/2 -translate-y-1/2"
                  aria-hidden="true"
                />

                <input
                  ref={buscaRef}
                  type="text"
                  aria-label={`Buscar em ${label.toLowerCase()}`}
                  placeholder={`Buscar ${label.toLowerCase()}...`}
                  value={termoBusca}
                  onChange={(evento) => {
                    setTermoBusca(evento.target.value);
                    setIndiceAtivo(0);
                  }}
                  className="catalog-dropdown-search w-full min-h-11 rounded-xl border pl-10 pr-3 text-sm outline-none"
                />
              </div>
            )}

            {/* Opções */}
            <div
              ref={opcoesRef}
              id={listaId}
              role="listbox"
              aria-labelledby={rotuloId}
              className="catalog-dropdown-scroll min-h-0 flex-1 overflow-y-auto space-y-1 pr-1"
            >
              {opcoesFiltradas.length > 0 ? (
                opcoesFiltradas.map((opcao, indice) => {
                  const selecionada =
                    opcao.id === selecionado;

                  const destacada =
                    indice === indiceAtivo;

                  return (
                    <button
                      key={opcao.id}
                      type="button"
                      role="option"
                      aria-selected={selecionada}
                      onClick={() => escolher(opcao)}
                      onMouseEnter={() =>
                        setIndiceAtivo(indice)
                      }
                      className={`catalog-dropdown-option w-full min-h-11 flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition-colors cursor-pointer ${
                        selecionada
                          ? 'catalog-dropdown-selected font-semibold'
                          : destacada
                            ? 'catalog-dropdown-highlighted'
                            : ''
                      }`}
                    >
                      <span className="truncate">
                        {opcao.nome || opcao.label}
                      </span>

                      {selecionada && (
                        <Check
                          size={16}
                          className="shrink-0"
                          aria-hidden="true"
                        />
                      )}
                    </button>
                  );
                })
              ) : (
                <p className="px-3 py-4 text-center text-sm">
                  Nenhum resultado encontrado.
                </p>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
