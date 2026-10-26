import { useState } from 'react';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../config/firebase';
import { useAuth } from '../hooks/useAuth';
import { completarCadastro, MatriculaEmUsoError, realizarLogout, MIN_DIGITOS_MATRICULA as MIN_DIGITOS } from '../services/usuarioService';
import { User, Mail, IdCard, CheckCircle2, AlertCircle, Loader2, LogOut } from 'lucide-react';

// Etapa para quem entrou, mas ainda não tem matrícula ou registro funcional no perfil
// (por exemplo, contas criadas antes da regra de matrícula única). O número precisa ser único.
export default function CompletarCadastro() {
  const { usuario, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const destino = location.state?.from || '/';

  const [nome, setNome] = useState('');
  const [numero, setNumero] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" role="status">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-900" aria-label="Carregando" />
      </div>
    );
  }
  if (!usuario) return <Navigate to="/login" replace state={{ from: destino }} />;
  if (!usuario.perfilIncompleto) return <Navigate to={destino} replace />;

  const nomeExibido = nome || usuario.nome || usuario.displayName || auth.currentUser?.displayName || '';
  const numeroCurto = numero.length > 0 && numero.length < MIN_DIGITOS;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErro('');

    if (!nomeExibido.trim()) {
      setErro('Informe seu nome completo.');
      return;
    }
    if (numero.length < MIN_DIGITOS) {
      setErro(`A matrícula ou registro precisa ter pelo menos ${MIN_DIGITOS} números.`);
      return;
    }

    setSalvando(true);
    try {
      await completarCadastro({
        uid: usuario.uid,
        email: usuario.email,
        nome: nomeExibido.trim(),
        numeroCadastro: numero,
      });
      navigate(destino, { replace: true });
    } catch (err) {
      console.error('Erro ao completar cadastro:', err);
      if (err instanceof MatriculaEmUsoError) {
        setErro(
          'Esta matrícula ou registro já está cadastrada em outra conta. Confira o número digitado. Se estiver correto, procure a administração.'
        );
      } else if (err?.code === 'unavailable' || err?.code === 'network-request-failed') {
        setErro('Sem conexão com a internet. Verifique sua rede e tente novamente.');
      } else if (err?.code === 'permission-denied') {
        setErro('Sua conta não tem permissão para concluir o cadastro. Procure a administração.');
      } else {
        setErro('Não foi possível concluir o cadastro. Tente novamente.');
      }
    } finally {
      setSalvando(false);
    }
  };

  const sair = async () => {
    await realizarLogout();
    navigate('/login', { replace: true });
  };

  const classeCampo =
    'w-full pl-10 pr-4 py-2.5 min-h-11 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-indigo-900 focus:ring-2 focus:ring-indigo-900/10 transition-all';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/80 p-4 md:p-6">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xs border border-gray-100 p-6 md:p-8 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Complete seu cadastro</h1>
          <p className="text-sm text-gray-600 mt-1">
            Falta só uma informação. A administração usa a matrícula ou o registro para conferir a retirada dos pertences.
          </p>
        </div>

        {erro && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-sm font-medium flex items-start gap-2.5" role="alert">
            <AlertCircle size={18} className="shrink-0 text-rose-600 mt-0.5" aria-hidden="true" />
            <span>{erro}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-sm">
          <div className="space-y-1.5">
            <label htmlFor="cc-email" className="block text-gray-800 font-semibold">E-mail da sua conta</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
              <input id="cc-email" type="email" value={usuario.email || ''} readOnly className={`${classeCampo} text-gray-600 cursor-not-allowed`} />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="cc-nome" className="block text-gray-800 font-semibold">Nome completo</label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
              <input
                id="cc-nome"
                type="text"
                required
                autoComplete="name"
                value={nomeExibido}
                onChange={(e) => setNome(e.target.value)}
                className={classeCampo}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label htmlFor="cc-numero" className="block text-gray-800 font-semibold">Matrícula ou registro funcional</label>
            <div className="relative">
              <IdCard size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
              <input
                id="cc-numero"
                type="text"
                inputMode="numeric"
                required
                autoComplete="off"
                placeholder="Digite apenas números"
                value={numero}
                onChange={(e) => setNumero(e.target.value.replace(/\D/g, ''))}
                aria-describedby="cc-numero-dica"
                className={classeCampo}
              />
            </div>
            <p id="cc-numero-dica" className={`text-xs ${numeroCurto ? 'text-rose-700 font-medium' : 'text-gray-600'}`}>
              {numeroCurto
                ? `Faltam ${MIN_DIGITOS - numero.length} número(s) para o mínimo de ${MIN_DIGITOS}.`
                : 'Cada número pode ser usado por uma única conta. Confira antes de salvar.'}
            </p>
          </div>

          <button
            type="submit"
            disabled={salvando}
            className="w-full min-h-12 py-3 bg-indigo-900 text-white rounded-xl font-semibold text-sm hover:bg-indigo-800 transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98]"
          >
            {salvando ? (
              <>
                <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                <span>Salvando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 size={16} aria-hidden="true" />
                <span>Concluir cadastro</span>
              </>
            )}
          </button>
        </form>

        <button
          type="button"
          onClick={sair}
          className="w-full min-h-11 text-sm text-gray-700 hover:text-indigo-900 font-semibold flex items-center justify-center gap-1.5"
        >
          <LogOut size={16} aria-hidden="true" /> Entrar com outra conta
        </button>
      </div>
    </div>
  );
}
