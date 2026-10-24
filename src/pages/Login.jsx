import { useEffect, useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  loginComMicrosoft,
  entrarComSenha,
  enviarRedefinicaoSenha,
  DominioNaoPermitidoError,
  dominioPermitido,
  MODO_RESTRITO_UEMG,
  METODO_LOGIN,
} from '../services/usuarioService';
import CampoSenha from '../components/CampoSenha';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, CheckCircle2, Loader2, Building2, ArrowLeft, ShieldCheck, FlaskConical, Mail, LogIn } from 'lucide-react';

// Logotipo da Microsoft (quatro quadrados), desenhado em SVG para não depender de arquivo externo
const LogoMicrosoft = () => (
  <svg width="20" height="20" viewBox="0 0 21 21" aria-hidden="true">
    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
  </svg>
);

const mensagemDeErro = (err) => {
  if (err instanceof DominioNaoPermitidoError) {
    return err.email
      ? `A conta ${err.email} não é institucional. Entre com o e-mail da UEMG (terminado em @discente.uemg.br ou @uemg.br).`
      : 'Não foi possível identificar o e-mail da conta. Entre com sua conta institucional da UEMG.';
  }
  switch (err?.code) {
    case 'auth/popup-closed-by-user':
    case 'auth/cancelled-popup-request':
      return 'O login foi cancelado antes de terminar. Toque em "Entrar com Microsoft" para tentar de novo.';
    case 'auth/popup-blocked':
      return 'O navegador bloqueou a janela de login. Permita pop-ups para este site e tente de novo.';
    case 'auth/network-request-failed':
      return 'Sem conexão com a internet. Verifique sua rede e tente novamente.';
    case 'auth/account-exists-with-different-credential':
      return 'Já existe uma conta antiga com este e-mail. Procure a administração para migrar seu acesso.';
    case 'auth/operation-not-allowed':
      return 'Este método de login ainda não foi ativado no sistema. Avise a administração.';
    case 'auth/invalid-credential':
    case 'auth/invalid-email':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'E-mail ou senha incorretos. Confira os dados ou use "Esqueci minha senha".';
    case 'auth/too-many-requests':
      return 'Muitas tentativas seguidas. Aguarde alguns minutos ou use "Esqueci minha senha".';
    default:
      return 'Não foi possível entrar agora. Tente novamente em instantes.';
  }
};

export default function Login() {
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');
  const [carregando, setCarregando] = useState(false);
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [enviandoReset, setEnviandoReset] = useState(false);
  const porSenha = METODO_LOGIN === 'senha';

  const navigate = useNavigate();
  const location = useLocation();
  const { usuario, loading } = useAuth();
  // Volta para a tela que a pessoa queria acessar antes de ser enviada ao login
  const destino = location.state?.from || '/';

  // Assim que a sessão existe (ou já existia), segue para o destino.
  // Quem ainda não informou a matrícula vai primeiro para "Completar cadastro".
  useEffect(() => {
    if (loading || !usuario || !dominioPermitido(usuario.email)) return;
    navigate(usuario.perfilIncompleto ? '/completar-cadastro' : destino, {
      replace: true,
      state: { from: destino },
    });
  }, [loading, usuario, destino, navigate]);

  const handleEsqueciSenha = async () => {
    setErro('');
    setAviso('');
    if (!email.trim()) {
      setErro('Digite seu e-mail no campo acima para receber o link de redefinição.');
      return;
    }
    setEnviandoReset(true);
    try {
      await enviarRedefinicaoSenha(email.trim());
    } catch (err) {
      // Não revelamos se o e-mail existe; só tratamos falhas de formato e de rede
      if (err.code === 'auth/invalid-email' || err.code === 'auth/network-request-failed') {
        setErro(mensagemDeErro(err));
        setEnviandoReset(false);
        return;
      }
      console.error('Erro ao enviar redefinição:', err);
    }
    setAviso('Se este e-mail estiver cadastrado, você receberá um link para criar uma nova senha. Confira também a caixa de spam.');
    setEnviandoReset(false);
  };

  const handleLogin = async (e) => {
    e?.preventDefault?.();
    setErro('');
    setAviso('');
    setCarregando(true);
    try {
      if (porSenha) await entrarComSenha(email.trim(), senha);
      else await loginComMicrosoft();
      // O redirecionamento acontece no useEffect acima, quando o perfil terminar de carregar
    } catch (err) {
      console.error('Erro ao autenticar:', err);
      setErro(mensagemDeErro(err));
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/80 p-4 md:p-6">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xs border border-gray-100 overflow-hidden grid grid-cols-1 md:grid-cols-2">
        {/* Coluna Esquerda: Painel Institucional (Tablet / Notebook) */}
        <div className="hidden md:flex flex-col justify-between p-8 bg-gradient-to-br from-indigo-900 via-indigo-900 to-indigo-800 text-white relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-black text-indigo-200 text-lg" aria-hidden="true">
                U
              </div>
              <div>
                <p className="text-base font-bold tracking-tight leading-tight">Achados e Perdidos</p>
                <p className="text-xs text-indigo-100">UEMG — Campus Divinópolis</p>
              </div>
            </div>

            <div className="pt-6 space-y-2">
              <h2 className="text-xl font-bold leading-tight">Plataforma de Gestão de Pertences</h2>
              <p className="text-sm text-indigo-100 leading-relaxed">
                Acesse com sua conta institucional para solicitar a retirada de objetos ou gerenciar o setor presencial.
              </p>
            </div>
          </div>

          <div className="relative z-10 pt-8 border-t border-indigo-800/80 flex items-center gap-2 text-xs text-indigo-100">
            <Building2 size={16} className="text-indigo-200 shrink-0" aria-hidden="true" />
            <span>Sistema Acadêmico Integrado — TCC</span>
          </div>

          <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-white/5 rounded-full pointer-events-none" />
        </div>

        {/* Coluna Direita: Login */}
        <div className="p-6 md:p-10 flex flex-col justify-center space-y-6">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-indigo-900 min-h-11 -mt-2 w-fit">
            <ArrowLeft size={16} aria-hidden="true" /> Voltar ao catálogo
          </Link>

          <div>
            <h1 className="text-xl font-bold text-gray-900">Entrar no Sistema</h1>
            <p className="text-sm text-gray-600 mt-1">
              {location.state?.from
                ? 'Entre na sua conta para continuar. Você voltará para a página que estava vendo.'
                : porSenha
                ? 'Informe seu e-mail e senha para continuar.'
                : MODO_RESTRITO_UEMG
                ? 'Use sua conta Microsoft institucional da UEMG. Não é preciso criar nem lembrar uma senha nova.'
                : 'Use sua conta Microsoft. Não é preciso criar nem lembrar uma senha nova.'}
            </p>
          </div>

          {erro && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-sm font-medium flex items-start gap-2.5" role="alert">
              <AlertCircle size={18} className="shrink-0 text-rose-600 mt-0.5" aria-hidden="true" />
              <span>{erro}</span>
            </div>
          )}

          {aviso && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-sm font-medium flex items-start gap-2.5" role="status">
              <CheckCircle2 size={18} className="shrink-0 text-emerald-600 mt-0.5" aria-hidden="true" />
              <span>{aviso}</span>
            </div>
          )}

          {porSenha ? (
            <>
              <form onSubmit={handleLogin} className="space-y-4 text-sm">
                <div className="space-y-1.5">
                  <label htmlFor="login-email" className="block text-gray-800 font-semibold">E-mail</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
                    <input
                      id="login-email"
                      type="email"
                      required
                      autoComplete="email"
                      inputMode="email"
                      placeholder="seu.email@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-indigo-900 focus:ring-2 focus:ring-indigo-900/10 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <label htmlFor="login-senha" className="block text-gray-800 font-semibold">Senha</label>
                    <button
                      type="button"
                      onClick={handleEsqueciSenha}
                      disabled={enviandoReset}
                      className="text-indigo-900 font-semibold hover:underline min-h-11 px-1 disabled:opacity-50"
                    >
                      {enviandoReset ? 'Enviando...' : 'Esqueci minha senha'}
                    </button>
                  </div>
                  <CampoSenha id="login-senha" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Digite sua senha" autoComplete="current-password" />
                </div>

                <button
                  type="submit"
                  disabled={carregando}
                  className="w-full min-h-12 py-3 bg-indigo-900 text-white rounded-xl font-semibold text-sm hover:bg-indigo-800 transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] mt-2"
                >
                  {carregando ? (
                    <>
                      <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                      <span>Autenticando...</span>
                    </>
                  ) : (
                    <>
                      <LogIn size={16} aria-hidden="true" />
                      <span>Entrar</span>
                    </>
                  )}
                </button>
              </form>

              <div className="pt-2 border-t border-gray-100 text-center text-sm text-gray-600">
                Não possui uma conta?{' '}
                <Link to="/cadastro" state={location.state} className="text-indigo-900 font-bold hover:underline inline-block py-2">
                  Cadastre-se aqui
                </Link>
              </div>
            </>
          ) : (
            <>
            <button
              type="button"
              onClick={handleLogin}
              disabled={carregando}
              className="w-full min-h-12 py-3 bg-white text-gray-900 border border-gray-300 rounded-xl font-semibold text-sm hover:bg-gray-50 transition-all shadow-xs flex items-center justify-center gap-3 disabled:opacity-60 active:scale-[0.98]"
            >
              {carregando ? (
                <>
                  <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                  <span>Aguardando a Microsoft...</span>
                </>
              ) : (
                <>
                  <LogoMicrosoft />
                  <span>Entrar com Microsoft</span>
                </>
              )}
            </button>

            {MODO_RESTRITO_UEMG ? (
              <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-3.5 flex gap-3 text-sm text-indigo-900">
                <ShieldCheck size={20} className="shrink-0 text-indigo-800 mt-0.5" aria-hidden="true" />
                <p className="text-indigo-800 leading-relaxed">
                  Só contas da UEMG (<strong>@discente.uemg.br</strong> ou <strong>@uemg.br</strong>) podem entrar. No primeiro
                  acesso você informará sua matrícula ou registro funcional.
                </p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex gap-3 text-sm text-amber-900" role="note">
                <FlaskConical size={20} className="shrink-0 text-amber-700 mt-0.5" aria-hidden="true" />
                <p className="leading-relaxed">
                  <strong>Modo de simulação.</strong> Qualquer conta Microsoft pode entrar, para demonstrar o fluxo. Na versão final,
                  só contas da UEMG (<strong>@discente.uemg.br</strong> ou <strong>@uemg.br</strong>) poderão entrar. No primeiro
                  acesso você informa uma matrícula ou registro funcional.
                </p>
              </div>
            )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
