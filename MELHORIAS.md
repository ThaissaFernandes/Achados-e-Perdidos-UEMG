# Melhorias de IHC e usabilidade aplicadas ao site

Resumo das mudanças feitas no código, organizadas pelas heurísticas de Nielsen.
Pode servir de base para a tabela do Capítulo 6 (Heurística | Tela | Decisão de projeto | Evidência).

| Heurística | Tela / arquivo | Mudança |
|---|---|---|
| 1. Visibilidade do estado | `StatusBadge`, `utils/status.js` | Selo de status único (cor + ícone + texto) usado em cartões, detalhes e edição. |
| 1 | `MobileLayout` | Visitante vê "Entrar" no lugar de "Perfil"; botão "Criar conta" no cabeçalho (desktop). |
| 1 | `ItemDetails` | Explica por que o botão de solicitar está desativado ("já existe um pedido em análise", "já devolvido"). |
| 1 | `Home` | Saudação diferente para visitante e usuário logado; removida a promessa de "tempo real". |
| 2. Mundo real | `ItemDetails`, `Home` | Termo único e familiar: "Esse item é meu — solicitar retirada" (antes: reivindicar / intenção de retirada / solicitação de devolução). |
| 3. Controle e liberdade | `App`, `ProtectedRoute`, `Login`, `Cadastro` | Detalhes do item agora são públicos; login só na hora de solicitar e volta para a página de origem. |
| 3 | `Modal` | Fecha com Esc e clique fora, foco preso no diálogo, foco devolvido ao fechar. |
| 3 | `ProtectedRoute`, `ItemDetails` | "Acesso restrito" tem saída ("Voltar ao início"); "Voltar" não sai do app em link direto. |
| 3 e 10 | `Login` | "Esqueci minha senha" (`sendPasswordResetEmail`). |
| 4. Consistência | `StatusBadge` | "Devolvido" deixou de ser vermelho (cor de erro) e passou a azul em todas as telas. |
| 4 | `Home` | Filtros duplicados removidos; busca e filtros ficam só na tela Buscar. |
| 5. Prevenção de erros | `Cadastro`, `CampoSenha` | Confirmação de senha, mostrar/ocultar senha, validação em tempo real, aviso de e-mail fora do domínio UEMG. |
| 5 | `solicitacaoService` | Solicitação + mudança de status em uma transação (evita estado inconsistente e dois alunos no mesmo item). |
| 5 | `index.css` | Campos com 16px no celular (evita zoom automático no iPhone). |
| 5 | `itemService`, `RegistrarItem` | Valida tipo e tamanho da foto e comprime a imagem antes de salvar. |
| 6. Reconhecimento | `Buscar` | Filtros guardados na URL: ao abrir um item e voltar, a busca continua como estava. |
| 7. Flexibilidade e eficiência | `Buscar`, `FiltroDropdown` | Busca ignora acentos e maiúsculas; "Mostrar mais" em lotes de 12. |
| 7 | `RegistrarItem` | "Tirar foto" e "Escolher da galeria"; "Cadastrar outro item" mantém categoria e local. |
| 8. Minimalismo | `Home` | Home enxuta: busca rápida, como funciona e itens recentes. |
| 9. Mensagens de erro | `ToastProvider`, `Cadastro`, `Login` | `alert()` trocado por avisos na tela; mensagens sem termos técnicos. |
| 10. Ajuda | `Home`, `ItemDetails` | "Como funciona" em 3 passos e "Como retirar" visíveis também no celular. |
| Acessibilidade | todas | Rótulos ligados aos campos, `role="dialog"`, `aria-expanded`/`listbox` no filtro, navegação por teclado, link "Pular para o conteúdo", foco visível, alvos de toque de 44px, textos de pelo menos 12px, contraste melhor, `prefers-reduced-motion`. |
| Desempenho | `ItemCard`, `itemService` | `loading="lazy"` nas imagens, fotos reduzidas a 900px, imagem de fallback local (sem `via.placeholder.com`). |
| Configuração | `config/firebase.js` | Lê as chaves de `.env` (veja `.env.example`). |

## Fora do escopo desta rodada
- Regras de segurança do Firestore (fazer no console do Firebase).
- Paginação no servidor (hoje a paginação é só na tela).
- Tela da administração para analisar solicitações (hoje o admin muda o status em "Editar item").
