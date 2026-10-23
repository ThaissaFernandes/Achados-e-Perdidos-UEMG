import { useEffect, useState } from 'react';
import { ouvirPedidosPendentes } from '../services/solicitacaoService';
import { useToast } from './useToast';

// Pedidos de retirada pendentes, em tempo real. Só a administração usa (ativo = eAdmin).
// Com avisarNovos, mostra um aviso na tela quando chega um pedido novo depois do carregamento inicial.
export function usePedidosPendentes({ ativo = true, avisarNovos = false } = {}) {
  const toast = useToast();
  const [pedidos, setPedidos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    if (!ativo) return undefined;

    let primeiraCarga = true;
    const parar = ouvirPedidosPendentes(
      (lista, novos) => {
        setPedidos(lista);
        setCarregando(false);
        setErro(false);

        if (avisarNovos && !primeiraCarga && novos.length > 0) {
          const nome = novos[0].nomeUsuario || 'Um aluno';
          toast.info(
            novos.length === 1
              ? `Novo pedido de retirada: ${nome} solicitou "${novos[0].itemTitulo || 'um pertence'}".`
              : `${novos.length} novos pedidos de retirada.`
          );
        }
        primeiraCarga = false;
      },
      (err) => {
        console.error('Erro ao ouvir pedidos pendentes:', err);
        setErro(true);
        setCarregando(false);
      }
    );

    return parar;
  }, [ativo, avisarNovos, toast]);

  return { pedidos, carregando: ativo && carregando, erro: ativo && erro };
}
