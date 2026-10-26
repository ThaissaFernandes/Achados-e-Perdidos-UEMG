# Revisão do site — comparação com TCC (25/10/2026)

## O que já está no projeto
- React + Vite + Tailwind + Firebase; páginas Home, Buscar, ItemDetails, Cadastro, Login, Perfil, Pedidos, Registrar/Editar item, Gerenciar usuários.
- Acesso público ao catálogo e aos detalhes; autenticação necessária para perfil e solicitações; rotas administrativas separadas na interface.
- Filtros persistidos na URL e skeletons já existentes em Home/Buscar.
- Na nova versão: tema claro/escuro persistido no navegador; paleta terracota inspirada na lupa; skeleton adicional em carregamentos de autenticação, detalhes, pedidos, edição e usuários.
- `seeds/itens.exemplo.json` e `seeds/contas.exemplo.json` são exemplos SEM credenciais nem usuários reais.

## Comparação com o TCC
- Cap. 1: registro, busca e recuperação de objetos: presentes na estrutura geral.
- Cap. 3.3.3: heurísticas de Nielsen: há feedback e mensagens de erro, mas falta avaliação com pessoas usuárias e validação formal de acessibilidade.
- Cap. 3.4.1: proposta web mobile: layout responsivo utiliza breakpoints; **não houve teste em navegador/dispositivo real** nesta revisão.
- Cap. 5.1: atores usuário/admin e operações consultar, reivindicar, cadastrar, gerenciar status e validar devolução estão representados em rotas e serviços; regras backend permanecem pendentes de validação.
- Cap. 5.2: prototipação no Figma é descrita como trabalho em desenvolvimento; não veio arquivo Figma para confrontar pixel a pixel.

## BLOQUEADORES de lançamento público
1. **Regras do Firebase não foram fornecidas.** Revisar/deployar regras de Firestore, Storage e políticas do Auth e TESTAR no emulador antes de publicar. A proteção de rotas React é só interface; não é autorização no banco. Verificar que usuários não podem criar perfis admin ou alterar `tipo`/`eAdmin`, editar itens, listar matrículas alheias, criar solicitações em nome de terceiros ou alterar códigos/status sem validação. Usar claims emitidas em servidor confiável para papéis administrativos, preferencialmente com Cloud Functions/Admin SDK. Proteger a transição atômica de item+solicitação, inclusive contra pedidos duplicados/cancelamentos com dados falsificados.
2. **Contas reais não criadas:** exigir credenciais e acesso ao Firebase; não usar senhas ou contas fixas em JSON/repositório público. Provisionar conta admin por Admin SDK, conta usuária via Auth; verificar confirmação de e-mail, reset de senha e desativação de contas.
3. **Verificação de segurança não equivale a auditoria:** não foi possível fazer teste de integração no Firebase, pentest, scanner dinâmico nem auditoria das regras publicadas.
4. **Dados sensíveis:** documentos de usuários armazenam matrícula e e-mail, solicitações incluem matrícula e código. Nunca disponibilizar leitura pública; aplicar minimização, retenção e política de privacidade/LGPD.
5. **Fotografias são armazenadas em base64 dentro dos documentos do Firestore** (`src/services/itemService.js`): mover para Firebase Storage com validação de tipo/tamanho e regras próprias; há risco de custo, limite de 1 MiB e desempenho.
6. **Cadastro administrativo no cliente** (`src/components/CriarAdminModal.jsx`) cria conta em um segundo Auth e grava `tipo:'admin'` no Firestore. Essa elevação de privilégio precisa migrar para backend confiável; uma regra frouxa permitiria autoelevação.

## Recomendado antes do lançamento
- Testes em 320, 375, 390, 768, 1024 e 1440 px; Android/iOS, Safari/Chrome/Firefox; teclado, zoom a 200%, modo claro/escuro e contraste WCAG 2.2 AA.
- Verificar telas de autenticação (que não usam `MobileLayout`) em ambos os temas; corrigir casos de contraste residual. Revisar mensagens de sucesso/erro e esqueleto durante requisições; spinners de botões são intencionais.
- Testes automatizados de cadastro, busca, filtros, solicitação, cancelamento, concorrência entre requisições, validação admin, mudança de status e navegação por teclado.
- Política de Privacidade, Termos, contato, procedimento para reivindicação segura e comprovação de propriedade, denúncia de cadastros incorretos, exclusão/exportação de dados, retenção, backups e recuperação.
- Monitoramento/alertas de erros, limites de gastos Firebase, App Check quando pertinente, cabeçalhos HTTP de segurança, rate limiting e deploy de homologação separado da produção.
- Validar navegação por rotas diretas e fallback SPA do host; SEO básico e metadados; imagens otimizadas; Lighthouse/Core Web Vitals.
- Política de e-mail institucional: o código aceita qualquer domínio por padrão, conforme `VITE_RESTRINGIR_DOMINIO_UEMG`; definir decisão de negócio e impor no servidor se obrigatório.
- Fortalecer política de senhas além do mínimo de seis caracteres e habilitar proteções de abuso no provedor de identidade.

## Observações da execução
- Código revisado estaticamente. Dependências não puderam ser instaladas neste ambiente durante esta execução, então build, lint e testes em browser não foram concluídos.
- Este ZIP é uma **versão de melhorias iniciais, não um certificado de segurança ou liberação para produção**.

## Como executar
1. Use `.env.example` para criar seu `.env` privado; não publique `.env`.
2. `npm ci` seguido de `npm run build` e `npm run lint`.
3. Teste no Firebase Emulator Suite com regras explícitas; depois em projeto de homologação.
4. Para seed, use JSON somente como fonte demonstrativa e importe usando Admin SDK em ambiente controlado. As contas no arquivo `contas.exemplo.json` são modelos, não logins.
