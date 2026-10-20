import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { cadastrarUsuario } from '../services/usuarioService';
import { User, Mail, IdCard, Lock, UserPlus, AlertCircle, Loader2, Building2 } from 'lucide-react';

export default function Cadastro() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [numeroCadastro, setNumeroCadastro] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  const navigate = useNavigate();

  const handleCadastro = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    try {
      // Força o perfil público padrão de estudante ('usuario')
      await cadastrarUsuario({
        email: email.trim(),
        senha,
        nome: nome.trim(),
        numeroCadastro: numeroCadastro.trim(),
        tipo: 'usuario',
        eAdmin: false
      });
      navigate('/');
    } catch (err) {
      console.error("Erro detalhado do Firebase:", err);

      if (err.code === 'auth/email-already-in-use') {
        setErro('Este e-mail já está cadastrado. Tente realizar o login.');
      } else if (err.code === 'auth/weak-password') {
        setErro('A senha deve conter no mínimo 6 caracteres.');
      } else if (err.code === 'auth/invalid-email') {
        setErro('O formato do e-mail informado é inválido.');
      } else if (err.code === 'permission-denied') {
        setErro('Sem permissão no Firestore. Verifique as Regras de Segurança.');
      } else {
        setErro(err.message || 'Erro ao realizar cadastro. Verifique os dados e tente novamente.');
      }
    } finally {
      setCarregando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50/80 p-4 md:p-6">
      {/* Container Principal: Responsivo para Desktop (2 Colunas) */}
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
                Crie sua Conta Acadêmica
              </h2>
              <p className="text-xs text-indigo-100/90 leading-relaxed">
                Cadastre-se com suas informações institucionais para reivindicar pertences perdidos no campus e acompanhar suas solicitações.
              </p>
            </div>
          </div>

          {/* Badge de Rodapé */}
          <div className="relative z-10 pt-8 border-t border-indigo-800/80 flex items-center gap-2 text-xs text-indigo-200">
            <Building2 size={16} className="text-indigo-300 shrink-0" />
            <span>Sistema Acadêmico Integrado — TCC</span>
          </div>

          <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-white/5 rounded-full pointer-events-none" />
        </div>

        {/* Coluna Direita: Formulário de Cadastro */}
        <div className="p-6 md:p-10 flex flex-col justify-center space-y-5">
          <div>
            <h2 className="text-lg md:text-xl font-bold text-gray-900">Criar Nova Conta</h2>
            <p className="text-xs text-gray-500 mt-1">
              Preencha seus dados acadêmicos para se registrar no sistema
            </p>
          </div>

          {/* Alerta de Erro */}
          {erro && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-medium flex items-center gap-2.5">
              <AlertCircle size={16} className="shrink-0 text-rose-600" />
              <span>{erro}</span>
            </div>
          )}

          <form onSubmit={handleCadastro} className="space-y-3.5 text-xs">
            {/* Campo Nome Completo */}
            <div className="space-y-1">
              <label className="block text-gray-700 font-semibold">Nome Completo</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  placeholder="Digite seu nome completo"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-indigo-900 focus:ring-2 focus:ring-indigo-900/10 transition-all"
                />
              </div>
            </div>

            {/* Campo E-mail Institucional */}
            <div className="space-y-1">
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

            {/* Campo Matrícula */}
            <div className="space-y-1">
              <label className="block text-gray-700 font-semibold">Matrícula / Registro Funcional</label>
              <div className="relative">
                <IdCard size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  inputMode="numeric"
                  required
                  placeholder="Digite apenas números"
                  value={numeroCadastro}
                  onChange={(e) => setNumeroCadastro(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-indigo-900 focus:ring-2 focus:ring-indigo-900/10 transition-all"
                />
              </div>
            </div>

            {/* Campo Senha */}
            <div className="space-y-1">
              <label className="block text-gray-700 font-semibold">Senha de Acesso</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  required
                  placeholder="Mínimo de 6 caracteres"
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
                  <span>Cadastrando...</span>
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  <span>Criar Conta</span>
                </>
              )}
            </button>
          </form>

          {/* Link para Login */}
          <div className="pt-2 border-t border-gray-100 text-center text-xs text-gray-500">
            Já tem uma conta registrada?{' '}
            <Link to="/login" className="text-indigo-900 font-bold hover:underline">
              Faça login
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}