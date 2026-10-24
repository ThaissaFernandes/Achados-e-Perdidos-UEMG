import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import {
  cadastrarComSenha,
  MatriculaEmUsoError,
  DominioNaoPermitidoError,
  MIN_DIGITOS_MATRICULA,
  MODO_RESTRITO_UEMG,
} from '../services/usuarioService';
import CampoSenha from '../components/CampoSenha';
import { User, Mail, IdCard, UserPlus, AlertCircle, Loader2, Building2, ArrowLeft } from 'lucide-react';

export default function Cadastro() {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [numeroCadastro, setNumeroCadastro] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [erro, setErro] = useState('');
  const [erroMatricula, setErroMatricula] = useState('');
  const [carregando, setCarregando] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const destino = location.state?.from || '/';

  // Validações em tempo real: a pessoa descobre o problema enquanto digita (Nielsen 5)
  const matriculaCurta = numeroCadastro.length > 0 && numeroCadastro.length < MIN_DIGITOS_MATRICULA;
  const senhaCurta = senha.length > 0 && senha.length < 6;
  const senhasDiferentes = confirmarSenha.length > 0 && senha !== confirmarSenha;

  const handleCadastro = async (e) => {
    e.preventDefault();
    setErro('');
    setErroMatricula('');

    if (numeroCadastro.length < MIN_DIGITOS_MATRICULA) {
      setErroMatricula(`A matrícula ou registro precisa ter pelo menos ${MIN_DIGITOS_MATRICULA} números.`);
      return;
    }
    if (senha.length < 6) {
      setErro('A senha precisa ter pelo menos 6 caracteres.');
      return;
    }
    if (senha !== confirmarSenha) {
      setErro('As senhas digitadas não são iguais. Digite novamente.');
      return;
    }

    setCarregando(true);
    try {
      await cadastrarComSenha({
        email: email.trim(),
        senha,
        nome: nome.trim(),
        numeroCadastro,
      });
      navigate(destino, { replace: true });
    } catch (err) {
      console.error('Erro ao cadastrar:', err);

      if (err instanceof MatriculaEmUsoError) {
        setErroMatricula('Esta matrícula ou registro já está cadastrada em outra conta. Confira o número digitado.');
        setErro('Seu cadastro não foi concluído. Se o número estiver correto, procure a administração.');
      } else if (err instanceof DominioNaoPermitidoError) {
        setErro('Use o e-mail institucional da UEMG (terminado em @discente.uemg.br ou @uemg.br).');
      } else if (err.code === 'auth/email-already-in-use') {
        setErro('Este e-mail já está cadastrado. Volte e entre com ele.');
      } else if (err.code === 'auth/weak-password') {
        setErro('A senha é muito fraca. Use pelo menos 6 caracteres.');
      } else if (err.code === 'auth/invalid-email') {
        setErro('O formato do e-mail informado é inválido.');
      } else if (err.code === 'auth/network-request-failed') {
        setErro('Sem conexão com a internet. Verifique sua rede e tente novamente.');
      } else if (err.code === 'permission-denied') {
        setErro('Não foi possível concluir o cadastro agora. Avise a administração (regras de acesso do sistema).');
      } else {
        setErro('Não foi possível criar a conta. Confira os dados e tente novamente.');
      }
    } finally {
      setCarregando(false);
    }
  };

  const classeCampo =
    'w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-indigo-900 focus:ring-2 focus:ring-indigo-900/10 transition-all';

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
              <h2 className="text-xl font-bold leading-tight">Crie sua Conta Acadêmica</h2>
              <p className="text-sm text-indigo-100 leading-relaxed">
                Sua matrícula ou registro funcional identifica você no balcão de atendimento e não pode ser usada por mais de uma conta.
              </p>
            </div>
          </div>

          <div className="relative z-10 pt-8 border-t border-indigo-800/80 flex items-center gap-2 text-xs text-indigo-100">
            <Building2 size={16} className="text-indigo-200 shrink-0" aria-hidden="true" />
            <span>Sistema Acadêmico Integrado — TCC</span>
          </div>

          <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-white/5 rounded-full pointer-events-none" />
        </div>

        {/* Coluna Direita: Formulário de Cadastro */}
        <div className="p-6 md:p-10 flex flex-col justify-center space-y-5">
          <Link to="/login" state={location.state} className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-indigo-900 min-h-11 -mt-2 w-fit">
            <ArrowLeft size={16} aria-hidden="true" /> Voltar ao login
          </Link>

          <div>
            <h1 className="text-xl font-bold text-gray-900">Criar Nova Conta</h1>
            <p className="text-sm text-gray-600 mt-1">Preencha seus dados para se registrar no sistema.</p>
          </div>

          {erro && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-sm font-medium flex items-start gap-2.5" role="alert">
              <AlertCircle size={18} className="shrink-0 text-rose-600 mt-0.5" aria-hidden="true" />
              <span>{erro}</span>
            </div>
          )}

          <form onSubmit={handleCadastro} className="space-y-3.5 text-sm">
            <div className="space-y-1">
              <label htmlFor="cad-nome" className="block text-gray-800 font-semibold">Nome completo</label>
              <div className="relative">
                <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
                <input id="cad-nome" type="text" required autoComplete="name" placeholder="Digite seu nome completo" value={nome} onChange={(e) => setNome(e.target.value)} className={classeCampo} />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="cad-email" className="block text-gray-800 font-semibold">
                {MODO_RESTRITO_UEMG ? 'E-mail institucional' : 'E-mail'}
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
                <input
                  id="cad-email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  placeholder={MODO_RESTRITO_UEMG ? 'seu.nome@discente.uemg.br' : 'seu.email@exemplo.com'}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={classeCampo}
                />
              </div>
            </div>

            <div className="space-y-1">
              <label htmlFor="cad-matricula" className="block text-gray-800 font-semibold">Matrícula / Registro funcional</label>
              <div className="relative">
                <IdCard size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" aria-hidden="true" />
                <input
                  id="cad-matricula"
                  type="text"
                  inputMode="numeric"
                  required
                  autoComplete="off"
                  placeholder="Digite apenas números"
                  value={numeroCadastro}
                  onChange={(e) => {
                    setNumeroCadastro(e.target.value.replace(/\D/g, ''));
                    setErroMatricula('');
                  }}
                  aria-invalid={Boolean(erroMatricula)}
                  aria-describedby="cad-matricula-dica"
                  className={`${classeCampo} ${erroMatricula ? 'border-rose-400 bg-rose-50/40' : ''}`}
                />
              </div>
              <p
                id="cad-matricula-dica"
                role={erroMatricula ? 'alert' : undefined}
                className={`text-xs ${erroMatricula || matriculaCurta ? 'text-rose-700 font-medium' : 'text-gray-600'}`}
              >
                {erroMatricula ||
                  (matriculaCurta
                    ? `Faltam ${MIN_DIGITOS_MATRICULA - numeroCadastro.length} número(s) para o mínimo de ${MIN_DIGITOS_MATRICULA}.`
                    : 'Cada número pode ser usado por uma única conta.')}
              </p>
            </div>

            <div className="space-y-1">
              <label htmlFor="cad-senha" className="block text-gray-800 font-semibold">Senha de acesso</label>
              <CampoSenha id="cad-senha" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo de 6 caracteres" autoComplete="new-password" minLength={6} describedBy="cad-senha-dica" />
              <p id="cad-senha-dica" className={`text-xs ${senhaCurta ? 'text-rose-700 font-medium' : 'text-gray-600'}`}>
                {senhaCurta ? `Faltam ${6 - senha.length} caractere(s) para o mínimo de 6.` : 'Use pelo menos 6 caracteres.'}
              </p>
            </div>

            <div className="space-y-1">
              <label htmlFor="cad-confirmar" className="block text-gray-800 font-semibold">Confirmar senha</label>
              <CampoSenha id="cad-confirmar" value={confirmarSenha} onChange={(e) => setConfirmarSenha(e.target.value)} placeholder="Digite a senha novamente" autoComplete="new-password" describedBy={senhasDiferentes ? 'cad-confirmar-dica' : undefined} />
              {senhasDiferentes && <p id="cad-confirmar-dica" className="text-xs text-rose-700 font-medium">As senhas ainda não são iguais.</p>}
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full min-h-12 py-3 bg-indigo-900 text-white rounded-xl font-semibold text-sm hover:bg-indigo-800 transition-all shadow-xs flex items-center justify-center gap-2 disabled:opacity-60 active:scale-[0.98] mt-2"
            >
              {carregando ? (
                <>
                  <Loader2 size={16} className="animate-spin" aria-hidden="true" />
                  <span>Cadastrando...</span>
                </>
              ) : (
                <>
                  <UserPlus size={16} aria-hidden="true" />
                  <span>Criar conta</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
