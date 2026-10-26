# Ambiente demonstrativo — Achados e Perdidos UEMG

Este pacote **não cria registros automaticamente** e **não publica o site**. Os dados são fictícios e servem apenas ao TCC.

## Dados demonstrativos

- 18 objetos fictícios, agrupados por categoria e local, sem fotos externas.
- 5 estudantes e 1 administrador com matrículas exclusivas fictícias.
- 6 solicitações em situações variadas.
- A marcação `demonstracaoTcc: true` identifica os registros gerados.
- Objetos e solicitações usam IDs fixos (`tcc-demo-*`). O script não sobrescreve documentos existentes.

## Testar primeiro nos emuladores (recomendado)

1. Use `.env.local` com `VITE_USE_FIREBASE_EMULATORS=true` e o ID Firebase local `achados-e-perdidos-uemg`.
2. Terminal A: `firebase emulators:start --only auth,firestore`
3. Terminal B: `npm run demo:emulador`
4. Terminal B: `npm run dev`
5. Abra a UI em `http://127.0.0.1:4000` e o endereço indicado pelo Vite.

Contas do emulador: `tcc-ana@demo.invalid`, `tcc-bruno@demo.invalid`, `tcc-camila@demo.invalid`, `tcc-diego@demo.invalid`, `tcc-elisa@demo.invalid`, `tcc-admin@demo.invalid`. Senha **exclusiva do emulador**: `DemoTcc@2026!` (nunca use em produção).

## Demonstração pública — preparação manual obrigatória

**Use um projeto Firebase separado e vazio, exclusivo do TCC.** No console Firebase, habilite Authentication (e-mail/senha), Cloud Firestore e Hosting no Spark; confira limites gratuitos. Confira também os domínios autorizados do Authentication.

1. Crie um novo projeto Firebase para a apresentação e crie um app Web para copiar as variáveis VITE_FIREBASE_* para `.env.production.local` (não versione o arquivo). Defina `VITE_AMBIENTE_DEMO=true`.
2. Instale localmente o pacote administrativo apenas para preparar os dados: `npm install --save-dev firebase-admin` (isso atualizará package-lock.json). **Não** importe esse pacote em `src/`.
3. No Firebase Console do novo projeto, obtenha a chave de conta de serviço **apenas em computador confiável**. Salve-a **fora da pasta do projeto**, não envie para terceiros. Nunca inclua no ZIP ou no Hosting.
4. No PowerShell, configure as variáveis desta sessão (troque os exemplos):

```powershell
$env:DEMO_TCC_PROJECT_ID='meu-projeto-demo-tcc'
$env:GOOGLE_APPLICATION_CREDENTIALS='C:\caminho-privado\chave-demo.json'
$env:DEMO_TCC_EMAIL_DOMAIN='demo.seu-dominio-controlado.com'
$env:DEMO_TCC_PASSWORD='SENHA_FORTE_E_EXCLUSIVA_COM_14_OU_MAIS_CARACTERES'
```

**Importante:** utilize um domínio de e-mail seu e reservado exclusivamente à demonstração. A criação desses usuários no Authentication **não** lhes envia e-mails automaticamente; não use domínios de terceiros.

5. Confira cuidadosamente o projeto de destino. Execute (substitua o ID):

```powershell
npm run demo:producao -- --confirmar-base-ficticia --confirmar-projeto=meu-projeto-demo-tcc
```

O script se recusa a executar sem os dois argumentos, sem projeto coincidente com a credencial e sem senha exclusiva. Sua conta admin fictícia é `tcc-admin@SEU_DOMINIO`, com a senha definida acima. **Nunca publique a senha administrativa.**

6. Implante regras verificadas e o site no projeto correto, sem `functions`:

```powershell
node --test tests/firestore.rules.test.mjs
npm run lint
npm run build
firebase deploy --only firestore:rules,hosting --project meu-projeto-demo-tcc
```

7. Entre no site publicado, teste busca, aluno, solicitação e administração. Teste também a privacidade com duas contas distintas e pelo menos uma tela em celular.

### Notas de segurança

- Não execute seed administrativo em Firebase real com dados institucionais ou de terceiros.
- A criação via Admin SDK **ignora regras do Firestore**, por isso o script só pode rodar no seu computador e com um projeto TCC separado.
- O ambiente demonstrativo é persistente, então testes da banca alteram dados; crie uma estratégia de restauração se precisar de cenário fixo.
- `.env.production.local` com `VITE_` contém apenas configuração pública do Firebase Web; senhas e credenciais administrativas jamais vão em `VITE_`.
- Se o projeto possuir App Check em produção, configure domínio e reCAPTCHA corretamente no console.
- O script não cria/atualiza Firebase Hosting e não executa deploy automaticamente.
- Se for apresentar contas com matrículas em formatos específicos, ajuste dados de demonstração antes de rodar o script, mantendo o formato exigido pelas regras.
