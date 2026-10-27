import { ListSkeleton } from '../components/skeletons';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  IdCard,
  KeyRound,
  User,
  Calendar,
  Inbox,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import { usePedidosPendentes } from '../hooks/usePedidosPendentes';
import { confirmarDevolucao, recusarPedido } from '../services/solicitacaoService';
import { normalizar } from '../utils/texto';
import Modal from '../components/Modal';

const formatarDataHora = (pedido) => {
  const s = pedido.dataSolicitacao?.seconds;
  if (!s) return 'Data não registrada';
  return new Date(s * 1000).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
};

export default function Pedidos() {
  const { usuario } = useAuth();
  const toast = useToast();
  const { pedidos, carregando, erro } = usePedidosPendentes();

  const [busca, setBusca] = useState('');
  // { pedido, acao: 'confirmar' | 'recusar' }
  const [emConfirmacao, setEmConfirmacao] = useState(null);
  const [processando, setProcessando] = useState(false);

  // Busca por código, nome, matrícula ou nome do item (sem diferenciar acentos, maiúsculas ou o hífen do código)
  const filtrados = useMemo(() => {
    const termo = normalizar(busca).replace(/-/g, '');
    if (!termo) return pedidos;
    return pedidos.filter((p) =>
      [p.codigo, p.nomeUsuario, p.numeroCadastro, p.itemTitulo].some((campo) =>
        normalizar(campo).replace(/-/g, '').includes(termo)
      )
    );
  }, [pedidos, busca]);

  const fecharConfirmacao = () => {
    if (!processando) setEmConfirmacao(null);
  };

  const executar = async () => {
    if (!emConfirmacao) return;
    const { pedido, acao } = emConfirmacao;
    setProcessando(true);
    try {
      if (acao === 'confirmar') {
        await confirmarDevolucao(pedido, usuario?.uid);
        toast.sucesso(`Devolução confirmada: "${pedido.itemTitulo}" entregue a ${pedido.nomeUsuario}.`);
      } else {
        await recusarPedido(pedido, usuario?.uid);
        toast.info(`Pedido recusado. "${pedido.itemTitulo}" voltou a ficar disponível.`);
      }
      setEmConfirmacao(null);
    } catch (err) {
      console.error('Erro ao atender pedido:', err);
      toast.erro('Não foi possível concluir a ação. Verifique a conexão e tente novamente.');
    } finally {
      setProcessando(false);
    }
  };

  const confirmando = emConfirmacao?.acao === 'confirmar';

  return (
    <div className="space-y-5 pb-24 sm:pb-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Pedidos de retirada</h1>
        <p className="text-sm text-gray-600 mt-0.5">
          Confira o <strong>código</strong> e a <strong>matrícula</strong> que o aluno apresentar no balcão antes de entregar o pertence.
          A lista atualiza sozinha quando chega um pedido novo.
        </p>
      </div>

      <div role="search" className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" size={18} aria-hidden="true" />
        <input
          type="search"
          aria-label="Buscar pedido por código, nome, matrícula ou item"
          placeholder="Buscar por código, nome, matrícula ou item..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="w-full min-h-12 pl-10 pr-12 py-3 bg-white border border-gray-200 rounded-2xl text-sm outline-hidden focus:border-indigo-900 focus:ring-2 focus:ring-indigo-900/10 transition-all [&::-webkit-search-cancel-button]:hidden"
        />
        {busca && (
          <button
            onClick={() => setBusca('')}
            aria-label="Limpar pesquisa"
            className="absolute right-1 top-1/2 -translate-y-1/2 p-3 text-gray-500 hover:text-gray-700"
          >
            <X size={18} aria-hidden="true" />
          </button>
        )}
      </div>

      <p className="text-sm font-bold text-gray-800" role="status" aria-live="polite">
        {carregando
          ? 'Carregando pedidos...'
          : `${filtrados.length} ${filtrados.length === 1 ? 'pedido aguardando conferência' : 'pedidos aguardando conferência'}`}
      </p>

      {carregando ? (
        <ListSkeleton count={4} />
      ) : erro ? (
        <div className="bg-rose-50 border border-rose-100 text-rose-800 rounded-3xl p-8 text-center space-y-2" role="alert">
          <AlertCircle className="w-8 h-8 mx-auto text-rose-500" aria-hidden="true" />
          <p className="font-bold">Não foi possível carregar os pedidos.</p>
          <p className="text-sm text-rose-700">
            Verifique a conexão. Se o problema continuar, confira se as Regras do Firestore permitem que administradores leiam
            a coleção de solicitações.
          </p>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs p-10 text-center space-y-2">
          <Inbox size={36} className="mx-auto text-gray-400" aria-hidden="true" />
          <p className="font-semibold text-gray-800">
            {busca ? 'Nenhum pedido encontrado para essa busca.' : 'Nenhum pedido aguardando conferência.'}
          </p>
          <p className="text-sm text-gray-600">Quando um aluno solicitar a retirada de um item, o pedido aparece aqui.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {filtrados.map((pedido) => (
            <li key={pedido.id} className="bg-white rounded-3xl border border-gray-100 shadow-xs p-4 space-y-3 flex flex-col">
              <div className="flex items-start justify-between gap-2">
                <Link
                  to={`/item/${pedido.itemId}`}
                  className="text-sm font-bold text-gray-900 hover:text-indigo-900 hover:underline line-clamp-2"
                >
                  {pedido.itemTitulo || 'Pertence'}
                </Link>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-md uppercase shrink-0 bg-amber-100 text-amber-900">
                  Pendente
                </span>
              </div>

              {/* Código e matrícula: os dois dados que o aluno precisa apresentar */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-2.5 text-center">
                  <p className="text-xs font-semibold text-indigo-900 flex items-center justify-center gap-1">
                    <KeyRound size={12} aria-hidden="true" /> Código
                  </p>
                  <p className="text-lg font-black font-mono tracking-widest text-indigo-900 select-all">
                    {pedido.codigo || '—'}
                  </p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-2.5 text-center">
                  <p className="text-xs font-semibold text-gray-700 flex items-center justify-center gap-1">
                    <IdCard size={12} aria-hidden="true" /> Matrícula
                  </p>
                  <p className="text-lg font-black font-mono text-gray-900 select-all">
                    {pedido.numeroCadastro || '—'}
                  </p>
                </div>
              </div>

              <div className="text-sm text-gray-700 space-y-1">
                <p className="flex items-center gap-1.5">
                  <User size={14} className="text-gray-500 shrink-0" aria-hidden="true" />
                  <span className="truncate">{pedido.nomeUsuario || 'Aluno'}</span>
                </p>
                <p className="flex items-center gap-1.5 text-gray-600">
                  <Calendar size={14} className="text-gray-500 shrink-0" aria-hidden="true" />
                  Pedido em {formatarDataHora(pedido)}
                </p>
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-100 mt-auto text-sm font-semibold">
                <button
                  onClick={() => setEmConfirmacao({ pedido, acao: 'recusar' })}
                  className="admin-reject-button flex-1 min-h-12 px-3 rounded-xl border font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <XCircle size={16} aria-hidden="true" /> Recusar
                </button>
                <button
                  onClick={() => setEmConfirmacao({ pedido, acao: 'confirmar' })}
                  className="flex-1 min-h-12 px-3 bg-emerald-700 text-white rounded-xl hover:bg-emerald-800 transition flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <CheckCircle2 size={16} aria-hidden="true" /> Confirmar devolução
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Modal
        aberto={Boolean(emConfirmacao)}
        onFechar={fecharConfirmacao}
        titulo={confirmando ? 'Confirmar devolução?' : 'Recusar este pedido?'}
        descricaoId="pedido-descricao"
        travarFechamento={processando}
      >
        {emConfirmacao && (
          <div id="pedido-descricao" className="space-y-2 text-sm text-gray-700">
            <p className="font-semibold text-gray-900">{emConfirmacao.pedido.itemTitulo}</p>
            {confirmando ? (
              <p className="bg-gray-50 border border-gray-100 rounded-xl p-3 leading-relaxed">
                Confirme que <strong>{emConfirmacao.pedido.nomeUsuario}</strong> (matrícula{' '}
                <strong>{emConfirmacao.pedido.numeroCadastro}</strong>) apresentou o código{' '}
                <strong className="font-mono">{emConfirmacao.pedido.codigo || '—'}</strong>. O item será marcado como{' '}
                <strong>devolvido</strong>.
              </p>
            ) : (
              <p className="bg-gray-50 border border-gray-100 rounded-xl p-3 leading-relaxed">
                O pedido será encerrado e o item voltará a ficar <strong>disponível</strong> no catálogo.
              </p>
            )}
          </div>
        )}
        <div className="flex gap-2 text-sm font-semibold pt-1">
          <button
            onClick={fecharConfirmacao}
            disabled={processando}
            className="admin-modal-back-button flex-1 min-h-12 px-4 py-2.5 rounded-xl border font-semibold transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Voltar
          </button>
          <button
            onClick={executar}
            disabled={processando}
            className={`flex-1 min-h-12 py-2.5 rounded-xl text-white flex justify-center items-center gap-1.5 shadow-xs transition disabled:opacity-60 ${
              confirmando ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-rose-700 hover:bg-rose-800'
            }`}
          >
            {processando ? (
              <Loader2 size={16} className="animate-spin" aria-label="Processando" />
            ) : confirmando ? (
              'Confirmar'
            ) : (
              'Recusar pedido'
            )}
          </button>
        </div>
      </Modal>
    </div>
  );
}
