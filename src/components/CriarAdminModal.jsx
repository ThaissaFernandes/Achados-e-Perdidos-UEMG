import { useState } from 'react';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, firebaseConfig } from '../config/firebase';
import { User, Mail, IdCard, Lock, UserPlus, X, AlertCircle, Loader2 } from 'lucide-react';

export default function CriarAdminModal({ isOpen, onClose, onSucesso }) {
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [numeroCadastro, setNumeroCadastro] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(false);

  if (!isOpen) return null;

  const handleCriarAdmin = async (e) => {
    e.preventDefault();
    setErro('');
    setCarregando(true);

    // Nome único para não conflitar com a instância principal
    const appName = `SecondaryApp-${Date.now()}`;
    let secondaryApp = null;

    try {
      // 1. Inicializa app secundário para criar o usuário sem deslogar o admin atual
      secondaryApp = initializeApp(firebaseConfig, appName);
      const secondaryAuth = getAuth(secondaryApp);

      // 2. Cria a nova conta no Firebase Authentication
      const userCredential = await createUserWithEmailAndPassword(
        secondaryAuth, 
        email.trim(), 
        senha
      );
      const novoUid = userCredential.user.uid;

      // 3. Salva o perfil do novo usuário no Firestore principal com perfil de Administrador
      await setDoc(doc(db, 'usuarios', novoUid), {
        nome: nome.trim(),
        email: email.trim(),
        numeroCadastro: numeroCadastro.trim(),
        tipo: 'admin',
        eAdmin: true,
        dataCriacao: serverTimestamp()
      });

      // 4. Limpa o formulário e notifica a tela pai
      setNome('');
      setEmail('');
      setNumeroCadastro('');
      setSenha('');
      
      if (onSucesso) onSucesso();
      onClose();
    } catch (err) {
      console.error("Erro ao criar novo administrador:", err);
      if (err.code === 'auth/email-already-in-use') {
        setErro('Este e-mail já está cadastrado no sistema.');
      } else if (err.code === 'auth/weak-password') {
        setErro('A senha deve conter no mínimo 6 caracteres.');
      } else if (err.code === 'auth/invalid-email') {
        setErro('Formato de e-mail inválido.');
      } else {
        setErro(err.message || 'Erro ao cadastrar administrador.');
      }
    } finally {
      // 5. Encerra a instância secundária para liberar memória
      if (secondaryApp) {
        await deleteApp(secondaryApp);
      }
      setCarregando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-xs p-4">
      <div className="bg-white w-full max-w-md rounded-3xl shadow-xl border border-gray-100 overflow-hidden space-y-4 p-6 relative animate-in fade-in zoom-in-95 duration-150">
        
        {/* Cabeçalho do Modal */}
        <div className="flex justify-between items-center pb-3 border-b border-gray-100">
          <div>
            <h3 className="text-base font-bold text-gray-900">Novo Administrador</h3>
            <p className="text-xs text-gray-500">Cadastre uma nova conta corporativa de admin</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-xl hover:bg-gray-100 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Mensagem de Erro */}
        {erro && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-medium flex items-center gap-2">
            <AlertCircle size={16} className="shrink-0 text-rose-600" />
            <span>{erro}</span>
          </div>
        )}

        {/* Formulário */}
        <form onSubmit={handleCriarAdmin} className="space-y-3 text-xs">
          <div className="space-y-1">
            <label className="block text-gray-700 font-semibold">Nome Completo</label>
            <div className="relative">
              <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                required
                placeholder="Nome do administrador"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-indigo-900 focus:ring-2 focus:ring-indigo-900/10 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-gray-700 font-semibold">E-mail Institucional</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="email"
                required
                placeholder="admin@discente.uemg.br"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-indigo-900 focus:ring-2 focus:ring-indigo-900/10 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-gray-700 font-semibold">Matrícula / Registro Funcional</label>
            <div className="relative">
              <IdCard size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                inputMode="numeric"
                required
                placeholder="Apenas números"
                value={numeroCadastro}
                onChange={(e) => setNumeroCadastro(e.target.value.replace(/\D/g, ''))}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-indigo-900 focus:ring-2 focus:ring-indigo-900/10 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-gray-700 font-semibold">Senha Inicial</label>
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

          <div className="pt-2 flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="w-1/2 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={carregando}
              className="w-1/2 py-2.5 bg-indigo-900 text-white rounded-xl font-semibold hover:bg-indigo-800 transition flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
            >
              {carregando ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Criando...</span>
                </>
              ) : (
                <>
                  <UserPlus size={16} />
                  <span>Criar Admin</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}