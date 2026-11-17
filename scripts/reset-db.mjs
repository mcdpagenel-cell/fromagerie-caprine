#!/usr/bin/env node
/**
 * Réinitialise la base de données.
 *
 *   npm run db:reset              → supprime le fichier local (démo régénérée au démarrage)
 *   npm run db:reset -- --vide    → base vide locale (penser à DEMO_DATA=1)
 *   npm run db:reset -- --distant → vide la base Turso configurée par les variables d'environnement
 *
 * La suppression du fichier local n'a aucun effet si `TURSO_DATABASE_URL` est défini :
 * dans ce cas, utilisez `--distant` (ou « Effacer tout l'historique » dans les réglages).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = process.env.FROMAGERIE_DATA_DIR || path.join(root, 'data');
const dbFile = process.env.FROMAGERIE_DB || path.join(dataDir, 'fromagerie.db');
const empty = process.argv.includes('--vide') || process.argv.includes('--empty');
const remote = process.argv.includes('--distant') || process.argv.includes('--remote');

const remoteUrl = (process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL || '').trim();

if (remote) {
  if (!remoteUrl) {
    console.error(
      'TURSO_DATABASE_URL absent : impossible de réinitialiser la base distante.\n' +
        'Définissez TURSO_DATABASE_URL et TURSO_AUTH_TOKEN, ou lancez le script sans --distant.',
    );
    process.exit(1);
  }
  const { createClient } = await import('@libsql/client');
  const db = createClient({ url: remoteUrl, authToken: process.env.TURSO_AUTH_TOKEN || undefined });
  try {
    await db.execute('DELETE FROM jours');
    await db.execute('DELETE FROM ventes');
    await db.execute('DELETE FROM reglages');
    console.log(`Base distante vidée (jours, ventes, réglages) : ${remoteUrl}`);
    console.log('Au prochain démarrage : réglages recréés (stock de départ à 0).');
    console.log(
      '⚠ Si DEMO_DATA n’est pas à 0 côté hébergeur, un jeu de démonstration sera recréé.\n',
    );
  } finally {
    db.close();
  }
  process.exit(0);
}

for (const suffix of ['', '-wal', '-shm']) {
  const target = `${dbFile}${suffix}`;
  try {
    fs.rmSync(target, { force: true });
    console.log(`supprimé : ${path.relative(root, target)}`);
  } catch (err) {
    console.error(`impossible de supprimer ${target} :`, err.message);
  }
}

if (empty) {
  console.log('\nBase supprimée. Au prochain démarrage : base vide (stock de départ à 0).');
  console.log('Astuce : démarrez avec DEMO_DATA=0 pour éviter le jeu de démonstration.\n');
} else {
  console.log('\nBase supprimée. Au prochain démarrage : jeu de démonstration régénéré');
  console.log('(les deux mois précédents + le mois en cours jusqu’à la veille).\n');
}

if (remoteUrl) {
  console.log(
    '⚠ TURSO_DATABASE_URL est défini : l’application utilise la base distante, pas ce fichier local.\n' +
      '   Pour vider la base distante : npm run db:reset -- --distant\n',
  );
}
