
# Achados e Perdidos UEMG

### Sistema Web Responsivo para Gestão de Pertences Perdidos e Encontrados

**Trabalho de Conclusão de Curso (TCC)**

**Tema:** Desenvolvimento de Interface Web Mobile para um Sistema de Achados e Perdidos com Foco em Interação Humano-Computador (IHC)

**Instituição:** Universidade do Estado de Minas Gerais (UEMG)  
**Unidade:** Campus Divinópolis

---

## Sobre o Projeto

O **Achados e Perdidos UEMG** é uma aplicação web responsiva desenvolvida para facilitar o registro, a localização e a devolução de pertences perdidos nas dependências da Universidade do Estado de Minas Gerais — Campus Divinópolis.

O projeto busca substituir processos informais de controle de objetos encontrados por uma solução digital centralizada, acessível por computadores, tablets e smartphones.

Além da implementação das funcionalidades, o desenvolvimento tem como foco a aplicação de princípios de **Interação Humano-Computador (IHC)**, **usabilidade**, **acessibilidade** e das **Heurísticas de Nielsen**, visando proporcionar uma experiência clara, eficiente e intuitiva.

### Objetivo Geral

Desenvolver uma interface web mobile para gerenciamento de achados e perdidos no ambiente universitário, priorizando a usabilidade e a experiência dos usuários.

### Objetivos Específicos

- Facilitar a consulta de pertences encontrados no campus.
- Permitir a organização dos objetos por categorias e locais.
- Digitalizar o processo de solicitação de retirada.
- Disponibilizar ferramentas administrativas para gerenciamento dos pertences.
- Aplicar princípios de IHC no desenvolvimento da interface.
- Oferecer navegação responsiva e adaptada a dispositivos móveis.
- Fornecer feedback visual sobre as ações realizadas no sistema.

---

## Acesso ao Sistema

A aplicação está disponível em:

**https://achados-e-perdidos-uemg.web.app**

O catálogo de pertences pode ser consultado pela interface pública. Algumas funcionalidades exigem autenticação, enquanto operações administrativas são restritas a usuários autorizados.

---

## Funcionalidades

### Usuários

- Visualização de pertences cadastrados.
- Pesquisa de objetos no catálogo.
- Filtragem por categorias.
- Consulta aos detalhes dos pertences.
- Visualização de fotografias e informações dos objetos.
- Cadastro e autenticação de usuários.
- Gerenciamento de informações do perfil.
- Solicitação de retirada de pertences disponíveis.
- Geração de código para identificação da solicitação.
- Acompanhamento do status das solicitações.
- Cancelamento de solicitações pendentes.

### Administração

- Cadastro de novos pertences encontrados.
- Edição das informações dos objetos.
- Inclusão de fotografias dos pertences.
- Captura de fotografias pela câmera do dispositivo.
- Organização dos objetos por categorias e locais.
- Visualização de solicitações de retirada pendentes.
- Confirmação de devoluções.
- Recusa de solicitações.
- Gerenciamento de usuários.
- Exclusão permanente de itens elegíveis, respeitando as regras de segurança e preservação do histórico.

### Interface e Experiência

- Design responsivo com abordagem Mobile First.
- Navegação otimizada para smartphones.
- Suporte aos modos claro e escuro.
- Indicadores visuais de carregamento.
- Feedback de sucesso e erro.
- Componentes de interface reutilizáveis.
- Formulários com validação.
- Identificação visual do status dos pertences.
- Carregamento de páginas sob demanda.

---

## Tecnologias Utilizadas

| Tecnologia | Finalidade |
|------------|------------|
| [React](https://react.dev/) | Construção da interface e dos componentes |
| [JavaScript](https://developer.mozilla.org/pt-BR/docs/Web/JavaScript) | Lógica e interatividade |
| [Vite](https://vite.dev/) | Ambiente de desenvolvimento e build |
| [Tailwind CSS](https://tailwindcss.com/) | Estilização e responsividade |
| [React Router](https://reactrouter.com/) | Gerenciamento de rotas |
| [Firebase](https://firebase.google.com/) | Infraestrutura de serviços |
| [Firebase Authentication](https://firebase.google.com/docs/auth) | Autenticação dos usuários |
| [Cloud Firestore](https://firebase.google.com/docs/firestore) | Armazenamento dos dados |
| [Firebase Hosting](https://firebase.google.com/docs/hosting) | Hospedagem da aplicação |
| [Lucide React](https://lucide.dev/) | Ícones da interface |
| [Figma](https://www.figma.com/) | Design e prototipação |

### Arquitetura

A aplicação utiliza uma arquitetura baseada em componentes React, com separação entre:

- **Apresentação:** páginas e componentes de interface.
- **Navegação:** rotas públicas e protegidas.
- **Contextos:** gerenciamento de autenticação, tema e notificações.
- **Serviços:** operações de negócio e comunicação com o Firebase.
- **Persistência:** armazenamento e consulta de dados no Firestore.
- **Segurança:** regras de acesso e validação de permissões no Firestore.

---

## Estrutura do Projeto

```text
achados-e-perdidos-uemg/
│
├── public/
│   └── logo.png
│
├── docs/
│   └── Documentação acadêmica e artefatos de projeto
│
├── src/
│   │
│   ├── assets/
│   │   └── Recursos visuais
│   │
│   ├── components/
│   │   ├── layout/
│   │   └── Componentes reutilizáveis
│   │
│   ├── config/
│   │   └── firebase.js
│   │
│   ├── context/
│   │   ├── AuthContext
│   │   ├── ThemeContext
│   │   └── ToastContext
│   │
│   ├── hooks/
│   │   └── Hooks personalizados
│   │
│   ├── pages/
│   │   ├── Home
│   │   ├── Buscar
│   │   ├── ItemDetails
│   │   ├── RegistrarItem
│   │   ├── EditarItem
│   │   ├── Login
│   │   ├── Cadastro
│   │   ├── CompletarCadastro
│   │   ├── Profile
│   │   ├── Pedidos
│   │   └── GerenciarUsuarios
│   │
│   ├── routes/
│   │   └── ProtectedRoute
│   │
│   ├── services/
│   │   ├── itemService
│   │   ├── solicitacaoService
│   │   ├── categoriaService
│   │   └── localService
│   │
│   ├── utils/
│   │   └── Funções auxiliares
│   │
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
│
├── index.html
├── firestore.rules
├── firebase.json
├── package.json
└── README.md
```

> A estrutura acima apresenta os principais diretórios e módulos da aplicação. Alguns arquivos auxiliares foram omitidos para facilitar a leitura.

---

## Como Executar Localmente

### Pré-requisitos

Antes de iniciar, é necessário ter instalado:

- [Node.js](https://nodejs.org/) — versão compatível com o `package.json`.
- npm — gerenciador de pacotes distribuído com o Node.js.
- [Git](https://git-scm.com/) — para clonar o repositório.
- Um editor de código, como o [Visual Studio Code](https://code.visualstudio.com/).

### 1. Obter o código-fonte

Clone o repositório utilizando seu endereço real no GitHub:

```bash
git clone <URL_DO_REPOSITORIO>
```

Acesse a pasta do projeto:

```bash
cd achados-e-perdidos-uemg
```

Também é possível baixar o projeto como arquivo ZIP e extrair seu conteúdo.

### 2. Instalar as dependências

Execute:

```bash
npm install
```

Esse comando instalará as dependências declaradas no arquivo `package.json`.

### 3. Configurar o Firebase

Crie um arquivo `.env.local` na raiz do projeto, caso a configuração do Firebase utilize variáveis de ambiente.

Exemplo:

```env
VITE_FIREBASE_API_KEY=sua_api_key
VITE_FIREBASE_AUTH_DOMAIN=seu_auth_domain
VITE_FIREBASE_PROJECT_ID=seu_project_id
VITE_FIREBASE_STORAGE_BUCKET=seu_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
VITE_FIREBASE_APP_ID=seu_app_id
```

> Os nomes das variáveis devem corresponder aos utilizados em `src/config/firebase.js`.

**Importante:** não publique arquivos contendo credenciais privadas, contas de serviço ou outras informações sensíveis.

As regras de segurança do Firestore devem ser configuradas e publicadas no projeto Firebase correspondente.

### 4. Iniciar o ambiente de desenvolvimento

Execute:

```bash
npm run dev
```

O Vite informará no terminal o endereço local para acessar a aplicação.

Geralmente:

**http://localhost:5173**

### 5. Verificar o projeto

Para executar a análise estática do código:

```bash
npm run lint
```

Para gerar a versão de produção:

```bash
npm run build
```

Os arquivos gerados pelo build normalmente ficam no diretório `dist/`.

---

## Publicação com Firebase Hosting

O projeto utiliza Firebase Hosting para disponibilizar a aplicação na internet.

### Instalar o Firebase CLI

```bash
npm install -g firebase-tools
```

### Autenticar no Firebase

```bash
firebase login
```

### Gerar o build

```bash
npm run build
```

### Publicar o site

```bash
firebase deploy --only hosting --project achados-e-perdidos-uemg
```

### Publicar as regras de segurança

```bash
firebase deploy --only firestore:rules --project achados-e-perdidos-uemg
```

> A publicação deve ser realizada apenas por usuários autorizados e após a validação das alterações. Antes de modificar regras de segurança em produção, recomenda-se testá-las no Firebase Emulator.

---

## Autenticação e Segurança

O controle de acesso é realizado por meio do Firebase Authentication e das regras de segurança do Cloud Firestore.

A aplicação possui diferentes níveis de acesso:

| Perfil | Permissões principais |
|--------|-----------------------|
| Visitante | Consultar o catálogo público de pertences |
| Usuário autenticado | Gerenciar o próprio perfil e solicitar retiradas |
| Administrador | Cadastrar, editar e gerenciar pertences, solicitações e operações administrativas autorizadas |

### Proteção do Histórico

A lógica de exclusão permanente considera o histórico de solicitações dos pertences.

Um item só deve ser excluído quando atender às condições de segurança previstas, incluindo:

- Estar disponível.
- Não possuir solicitação ativa.
- Não possuir histórico de solicitações de retirada.
- Ter a operação autorizada pelas regras do Firestore.

Itens com histórico registrado são preservados para evitar a perda de informações relacionadas ao processo de devolução.

A interface também utiliza rotas protegidas para restringir o acesso às páginas administrativas.

> A proteção das rotas no frontend não substitui as regras de autorização aplicadas no banco de dados.

---

## Interação Humano-Computador (IHC)

A pesquisa tem como eixo central o desenvolvimento de uma interface que considere as necessidades dos usuários, a facilidade de aprendizado e a eficiência de execução das tarefas.

### Mobile First

A interface prioriza a experiência em smartphones, considerando que estudantes e demais usuários podem acessar o sistema pelo celular.

### Redução da Carga Cognitiva

A organização das informações busca reduzir a quantidade de decisões e etapas necessárias para localizar um objeto ou solicitar sua retirada.

### Consistência Visual

Botões, formulários, ícones, mensagens e elementos de navegação seguem padrões de apresentação para facilitar o reconhecimento e a utilização do sistema.

### Feedback das Ações

O sistema apresenta indicadores de carregamento, avisos de validação, mensagens de erro e notificações de resultado para comunicar o andamento das operações.

### Prevenção de Erros

A aplicação utiliza validação de formulários, restrições de acesso e confirmações para ações importantes, como a exclusão permanente de registros.

### Acessibilidade e Legibilidade

A interface considera aspectos como organização do conteúdo, responsividade, contraste visual e clareza textual, incluindo suporte a temas claro e escuro.

---

## Heurísticas de Nielsen

As Heurísticas de Nielsen são utilizadas como referencial para orientar decisões de design e avaliar aspectos de usabilidade.

| Heurística | Aplicação no Projeto |
|------------|----------------------|
| 1. Visibilidade do status do sistema | Indicadores de carregamento e notificações |
| 2. Correspondência entre sistema e mundo real | Linguagem relacionada a pertences, solicitações e devoluções |
| 3. Controle e liberdade do usuário | Navegação e cancelamento de solicitações elegíveis |
| 4. Consistência e padronização | Componentes e padrões visuais reutilizáveis |
| 5. Prevenção de erros | Validações e confirmações de ações |
| 6. Reconhecimento em vez de memorização | Navegação por ícones, categorias e informações visíveis |
| 7. Flexibilidade e eficiência de uso | Busca e navegação responsiva |
| 8. Design estético e minimalista | Interface organizada e redução de elementos desnecessários |
| 9. Reconhecimento e recuperação de erros | Mensagens de erro contextualizadas |
| 10. Ajuda e documentação | Orientações presentes na interface e documentação do projeto |

> A associação entre funcionalidades e heurísticas representa as decisões de projeto. A comprovação dos resultados de usabilidade depende das avaliações e testes documentados no TCC.

---

## Documentação Acadêmica

Os artefatos associados à pesquisa podem ser organizados no diretório `docs/`, incluindo:

- Fundamentação teórica em IHC e usabilidade.
- Levantamento de requisitos funcionais e não funcionais.
- Diagramas UML de casos de uso.
- Diagramas UML de classes.
- Protótipos e telas desenvolvidas no Figma.
- Fluxos de navegação.
- Critérios de avaliação heurística.
- Roteiros e resultados de testes de usabilidade, quando realizados.

---

## Contexto Acadêmico

Este sistema foi desenvolvido no contexto de um **Trabalho de Conclusão de Curso**, associado à Universidade do Estado de Minas Gerais (UEMG) — Campus Divinópolis.

A proposta articula conhecimentos de desenvolvimento web, engenharia de software, design de interfaces e Interação Humano-Computador, utilizando um problema cotidiano do ambiente universitário como cenário de aplicação.

---

## Licença

A licença de uso, distribuição e modificação do código deve ser definida pelos responsáveis pelo projeto.

Até que uma licença seja formalmente adicionada ao repositório, a disponibilização pública do código não implica autorização automática para reutilização, modificação ou redistribuição.

---

**Achados e Perdidos UEMG**

*Tecnologia e usabilidade aplicadas ao cotidiano universitário.*
