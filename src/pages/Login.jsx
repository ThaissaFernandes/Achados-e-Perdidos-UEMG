import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { realizarLogin } from '../services/usuarioService';
import { Mail, Lock, LogIn, AlertCircle, Loader2, Building2 } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      // Autentica no Firebase e carrega o perfil do Firestore
      await realizarLogin(email.trim(), senha);
      
      // Direciona para a Home unificada
      navigate('/');
    } catch (err) {
      console.error("Erro ao autenticar:", err);
      setErro('E-mail ou senha incorretos. Verifique suas credenciais.');
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/80 p-4 md:p-6">
      {/* Container Principal: Card Centrado com Visual Responsivo (2 Colunas no Desktop) */}
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xs border border-gray-100 overflow-hidden grid grid-cols-1 md:grid-cols-2">
        
        {/* Coluna Esquerda: Painel Institucional da UEMG (Exclusivo para Tablet / Notebook) */}
        <div className="hidden md:flex flex-col justify-between p-8 bg-gradient-to-br from-indigo-900 via-indigo-900 to-indigo-800 text-white relative overflow-hidden">
          <div className="relative z-10 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/20 flex items-center justify-center font-black text-indigo-200 text-lg">
                U
              </div>
              <div>
                <h1 className="text-base font-bold tracking-tight leading-tight">Achados e Perdidos</h1>
                <p className="text-xs text-indigo-200">UEMG — Campus Divinópolis</p>
              </div>
            </div>

            <div className="pt-6 space-y-2">
              <h2 className="text-xl font-bold leading-tight">
                Plataforma de Gestão de Pertences
              </h2>
              <p className="text-xs text-indigo-100/90 leading-relaxed">
                Acesse com suas credenciais para consultar o catálogo, realizar reivindicações de objetos ou gerenciar o setor presencial.
              </p>
            </div>
          </div>

          {/* Badge de Rodapé no Painel Lateral */}
          <div className="relative z-10 pt-8 border-t border-indigo-800/80 flex items-center gap-2 text-xs text-indigo-200">
            <Building2 size={16} className="text-indigo-300 shrink-0" />
            <span>Sistema Acadêmico Integrado — TCC</span>
          </div>

          {/* Círculos decorativos de fundo */}
          <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-white/5 rounded-full pointer-events-none" />
        </div>

        {/* Coluna Direita: Formulário de Login */}
        <div className="p-6 md:p-10 flex flex-col justify-center space-y-6">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">Entrar no Sistema</h2>
            <p className="text-xs text-gray-500 mt-1">
              Informe seu e-mail cadastrado e senha para continuar
            </p>
          </div>

          {/* Alerta de Erro */}
          {erro && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-medium flex items-center gap-2.5">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              <span>{erro}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4 text-xs">
            {/* Campo E-mail */}
            <div className="space-y-1.5">
              <label className="block text-gray-700 font-semibold">E-mail Institucional</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  placeholder="seu.nome@discente.uemg.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-indigo-900 focus:ring-2 focus:ring-indigo-900/10 transition-all"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div className="space-y-1.5">
              <label className="block text-gray-700 font-semibold">Senha</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  required
                  placeholder="Digite sua senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-indigo-900 focus:ring-2 focus:ring-indigo-900/10 transition-all"
                />
              </div>
            </div>

            {/* Botão Submeter */}
            <button
              type="submit"
              disabled={carregando}
              className="w-full py-3 bg-indigo-900 text-white rounded-xl font-semibold text-xs md:text-sm hover:bg-indigo-800 transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-50 active:scale-[0.98] mt-2"
            >
              {carregando ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Autenticando...</span>
                </>
              ) : (
                <>
                  <LogIn size={16} />
                  <span>Entrar</span>
                </>
              )}
            </button>
          </form>

          {/* Link para Cadastro */}
          <div className="pt-2 border-t border-gray-100 text-center text-xs text-gray-500">
            Não possui uma conta registrada?{' '}
            <Link to="/cadastro" className="text-indigo-900 font-bold hover:underline">
              Cadastre-se aqui
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}