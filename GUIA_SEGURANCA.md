# Migração segura do fluxo de retirada

**Não publique regras antes das funções.** As funções usam Firebase Auth e App Check (modo enforce) e precisam de deploy e configuração no Console. Não habilite `enforceAppCheck` sem configurar App Check na aplicação web, ou chamadas falharão. O SDK web de App Check já está preparado, mas exige `VITE_FIREBASE_APPCHECK_SITE_KEY` e registro do domínio; durante testes locais use debug token autorizado. Não coloque chaves de serviço no cliente. Cloud Functions exige configuração de faturamento compatível.

1. Configure Firebase CLI com `npm install -g firebase-tools` e `firebase login`.
2. No projeto raiz: `cd functions && npm install && cd ..`. Revise a região southamerica-east1 e ajuste se necessário nos dois lados.
3. Configure App Check no Console e SDK web e teste as três functions no emulador antes de produção.
4. Publique as funções `firebase deploy --only functions --project achados-e-perdidos-uemg` **antes** de publicar `firestore.rules`.
5. Publique as regras `firebase deploy --only firestore:rules --project achados-e-perdidos-uemg`.
6. Crie o administrador usando Admin SDK em ambiente confiável: `setCustomUserClaims(uid, {admin:true})`; renove a sessão do admin (sair e entrar). Nunca permita que um usuário atribua seu próprio claim.
7. Teste: aluno cria pedido, vê apenas os próprios, cancela o pedido pendente; admin confirma/recusa pendentes; duas solicitações simultâneas para o mesmo item -> apenas uma vence. Confira Firestore após cada ação.

## Limitações deliberadas

- Regras bloqueiam alterações diretas de itens, categorias e locais, logo telas administrativas atuais de cadastro/edição **não funcionarão** até migrar seus serviços para funções equivalentes e validadas.
- O formulário atual de criação de admin pelo navegador também deve ser removido/migrado para um backend confiável. O claim determina acesso, campos `tipo/eAdmin` em documentos não determinam autoridade.
- Regras de cadastro/matrícula devem ser endurecidas em uma etapa adicional (integridade cruzada, unicidade, formatos); não estão prontas para publicação irrestrita.
- Cancelamento preserva histórico com status `Cancelado` em vez de excluir o documento.
- Código de retirada de 6 dígitos é apenas um identificador para conferência presencial, não prova suficiente de propriedade.
- Deve-se escrever e rodar testes com emulador das regras e functions antes de produção. Nenhuma implantação real foi realizada.
