
import {
  useEffect,
  useRef,
  useState,
  useId,
  useCallback,
} from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpDown, ChevronDown, Check } from 'lucide-react';

const OPCOES = [
  { id: 'recentes', nome: 'Mais recentes' },
  { id: 'antigos', nome: 'Mais antigos' },
  { id: 'az', nome: 'Nome (A-Z)' },
];

export default function OrdenacaoDropdown({ valor, onChange }) {
  const [aberto, setAberto] = useState(false);
  const [posicao, setPosicao] = useState(null);

  const raizRef = useRef(null);
  const botaoRef = useRef(null);
  const painelRef = useRef(null);
  const listaId = useId();

  const selecionada =
    OPCOES.find((opcao) => opcao.id === valor) || OPCOES[0];

  const fechar = useCallback(() => {
    setAberto(false);
    setPosicao(null);
  }, []);

  const calcularPosicao = () => {
    const botao = botaoRef.current;
    if (!botao) return null;

    const retangulo = botao.getBoundingClientRect();

    const largura = Math.min(
      220,
      window.innerWidth - 24
    );

    const alturaEstimada = 160;
    const espacoAbaixo =
      window.innerHeight - retangulo.bottom;

    const abrirAcima =
      espacoAbaixo < alturaEstimada + 16 &&
      retangulo.top > espacoAbaixo;

    const esquerda = Math.max(
      12,
      Math.min(
        retangulo.right - largura,
        window.innerWidth - largura - 12
      )
    );

    return {
      position: 'fixed',
      left: esquerda,
      top: abrirAcima
        ? Math.max(12, retangulo.top - alturaEstimada - 8)
        : retangulo.bottom + 8,
      width: largura,
      zIndex: 9999,
    };
  };

  const abrir = () => {
    setPosicao(calcularPosicao());
    setAberto(true);
  };

  const selecionar = (id) => {
    onChange(id);
    fechar();
    botaoRef.current?.focus();
  };

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

    function aoMoverPagina(evento) {
      if (painelRef.current?.contains(evento.target)) {
        return;
      }
      fechar();
    }

    document.addEventListener('pointerdown', aoClicarFora);
    window.addEventListener('scroll', aoMoverPagina, true);
    window.addEventListener('resize', fechar);

    return () => {
      document.removeEventListener(
        'pointerdown',
        aoClicarFora
      );
      window.removeEventListener('scroll', aoMoverPagina, true);
      window.removeEventListener('resize', fechar);
    };
  }, [aberto, fechar]);

  const aoTeclar = (evento) => {
    if (evento.key === 'Escape' && aberto) {
      evento.preventDefault();
      fechar();
      botaoRef.current?.focus();
    }

    if (
      aberto &&
      (evento.key === 'ArrowDown' ||
        evento.key === 'ArrowUp')
    ) {
      evento.preventDefault();

      const indice = OPCOES.findIndex(
        (opcao) => opcao.id === valor
      );

      const proximo =
        evento.key === 'ArrowDown'
          ? (indice + 1) % OPCOES.length
          : (indice - 1 + OPCOES.length) % OPCOES.length;

      onChange(OPCOES[proximo].id);
    }
  };

  return (
    <div
      ref={raizRef}
      className="catalog-order relative w-[220px] max-w-full shrink-0"
      onKeyDown={aoTeclar}
    >
      <button
        ref={botaoRef}
        type="button"
        aria-label={`Ordenar resultados: ${selecionada.nome}`}
        aria-haspopup="listbox"
        aria-expanded={aberto}
        aria-controls={aberto ? listaId : undefined}
        onClick={() => (aberto ? fechar() : abrir())}
        className="catalog-order-trigger flex w-full min-h-12 items-center justify-between gap-2 rounded-xl border px-3.5 text-sm font-semibold cursor-pointer"
      >
        <ArrowUpDown
          size={17}
          className="shrink-0"
          aria-hidden="true"
        />

        <span className="flex-1 whitespace-nowrap text-left">
          {selecionada.nome}
        </span>

        <ChevronDown
          size={16}
          aria-hidden="true"
          className={`shrink-0 transition-transform duration-200 ${
            aberto ? 'rotate-180' : ''
          }`}
        />
      </button>

      {aberto &&
        posicao &&
        createPortal(
          <div
            ref={painelRef}
            id={listaId}
            role="listbox"
            aria-label="Ordenar resultados"
            style={posicao}
            className="catalog-order-menu rounded-xl border p-1.5 shadow-xl"
          >
            {OPCOES.map((opcao) => {
              const ativa = opcao.id === selecionada.id;

              return (
                <button
                  key={opcao.id}
                  type="button"
                  role="option"
                  aria-selected={ativa}
                  onClick={() => selecionar(opcao.id)}
                  className={`catalog-order-option flex w-full min-h-11 items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm cursor-pointer ${
                    ativa ? 'catalog-order-active' : ''
                  }`}
                >
                  <span>{opcao.nome}</span>

                  {ativa && (
                    <Check size={16} aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}
