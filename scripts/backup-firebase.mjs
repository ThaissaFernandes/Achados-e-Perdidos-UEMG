
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';

const PROJECT_ID = 'achados-e-perdidos-uemg';

const keyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const backupDir = process.env.BACKUP_TCC_DIR;

if (!keyFile || !backupDir) {
  throw new Error(
    'Configure GOOGLE_APPLICATION_CREDENTIALS e BACKUP_TCC_DIR.'
  );
}

const destino = resolve(backupDir);
const projeto = resolve(process.cwd());
const rel = relative(projeto, destino);

if (!rel || (!rel.startsWith('..') && !isAbsolute(rel))) {
  throw new Error(
    'O backup deve ficar fora da pasta do projeto.'
  );
}

if (
  process.env.FIRESTORE_EMULATOR_HOST ||
  process.env.FIREBASE_AUTH_EMULATOR_HOST
) {
  throw new Error(
    'Desative as variáveis dos emuladores antes do backup.'
  );
}

const chave = JSON.parse(
  await readFile(resolve(keyFile), 'utf8')
);

if (chave.project_id !== PROJECT_ID) {
  throw new Error('Credencial de outro projeto Firebase.');
}

const app = initializeApp({
  credential: cert(chave),
  projectId: PROJECT_ID,
});

const db = getFirestore(app);
const auth = getAuth(app);

const colecoes = [
  'administradores',
  'categorias',
  'itens',
  'locais',
  'matriculas',
  'solicitacoesDevolucao',
  'usuarios',
];

const data = new Date().toISOString().replace(/[:.]/g, '-');
const pasta = resolve(destino, `backup-${data}`);

await mkdir(pasta, { recursive: true });

console.log('Iniciando cópia dos dados do Firebase...');

for (const nome of colecoes) {
  const snapshot = await db.collection(nome).get();

  const documentos = snapshot.docs.map((doc) => ({
    id: doc.id,
    dados: doc.data(),
  }));

  await writeFile(
    resolve(pasta, `${nome}.json`),
    JSON.stringify(documentos, null, 2),
    { flag: 'wx' }
  );

  console.log(`${nome}: ${documentos.length} documentos`);
}

// Cópia de informações das contas, sem senhas.
const usuariosAuth = [];
let pagina;

do {
  const resposta = await auth.listUsers(1000, pagina);

  for (const usuario of resposta.users) {
    usuariosAuth.push({
      uid: usuario.uid,
      email: usuario.email,
      displayName: usuario.displayName,
      disabled: usuario.disabled,
      emailVerified: usuario.emailVerified,
    });
  }

  pagina = resposta.pageToken;
} while (pagina);

await writeFile(
  resolve(pasta, 'authentication-usuarios.json'),
  JSON.stringify(usuariosAuth, null, 2),
  { flag: 'wx' }
);

console.log(
  `Authentication: ${usuariosAuth.length} contas`
);

console.log('\nCÓPIA LOCAL CONCLUÍDA.');
console.log(`Arquivos salvos em: ${pasta}`);
console.log(
  'Não inclui senhas, regras ou subcoleções.'
);
