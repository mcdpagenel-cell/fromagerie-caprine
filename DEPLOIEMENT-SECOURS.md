# Plan de secours : travailler sans son PC

Le site et les données ne vivent **pas** sur votre ordinateur :

| Élément | Où il se trouve | PC cassé ? |
| --- | --- | --- |
| Application (le site) | Vercel — https://fromagerie-caprine.vercel.app | ✅ continue de tourner |
| Données (journées, ventes, réglages) | Turso (cloud, persistant) | ✅ intactes |
| Code source | GitHub (`fromagerie-caprine`) | ✅ intact |
| Sauvegardes `.json` téléchargées | votre PC | ⚠️ perdues mais retéléchargeables (Turso garde tout) |

Votre PC ne sert qu'au confort de développement. Voici les procédures selon la situation.

---

## 1. Utiliser l'application depuis n'importe quel appareil

Aucune installation : un navigateur suffit (téléphone, tablette, PC d'un ami).

1. Ouvrez https://fromagerie-caprine.vercel.app
2. Entrez le mot de passe de l'application (`APP_PASSWORD`).
3. Saisissez vos journées et vos ventes normalement — tout part dans Turso.

## 2. Retrouver les accès

Les quatre accès à noter quelque part de sûr (gestionnaire de mots de passe, papier) :

| Accès | Comment le récupérer |
| --- | --- |
| Mot de passe de l'application | Vercel → projet → **Settings → Environment Variables** → `APP_PASSWORD` |
| Compte GitHub | https://github.com → « Mot de passe oublié » (e-mail de récupération) |
| Compte Vercel | https://vercel.com → connexion par e-mail ou GitHub |
| Compte Turso | https://turso.tech → connexion par e-mail ou GitHub |

> Changer `APP_PASSWORD` déconnecte toutes les sessions : pensez à le noter.

## 3. Petite modification du site (texte, couleur, nom…)

Via l'éditeur web de GitHub, sans rien installer :

1. Connectez-vous sur https://github.com → dépôt `fromagerie-caprine`.
2. Ouvrez le fichier à modifier, cliquez sur le crayon **✏️**.
3. Modifiez, puis **Commit changes** (en bas de page).
4. Vercel redéploie automatiquement en ~2 minutes.

Fichiers utiles :

- Couleurs et style : `src/app/globals.css`
- Textes des pages : `src/app/(app)/…/page.tsx`
- Nom et sous-titre de la ferme : **Réglages** dans l'application (pas de code)

## 4. Grosse modification (nouvelle fonctionnalité)

**GitHub Codespaces** : un environnement de développement complet dans le
navigateur, gratuit jusqu'à 60 h/mois.

1. https://github.com → dépôt `fromagerie-caprine` → bouton vert **Code** →
   onglet **Codespaces** → **Create codespace on main**.
2. Un VS Code s'ouvre dans le navigateur, projet déjà cloné, Node déjà installé.
3. Dans le terminal intégré :

```bash
npm install
npm run dev
```

4. Codespaces propose l'aperçu du site (port 3000).
5. Pour publier : commit + push depuis l'onglet « Source Control » → Vercel redéploie.

C'est dans cet environnement que vous pouvez demander à un agent de coder
une évolution, depuis n'importe quelle machine.

## 5. Reconstruire un environnement local (nouveau PC, disque nettoyé)

Node.js ≥ 24, puis trois commandes :

```bash
git clone https://github.com/mcdpagenel-cell/fromagerie-caprine.git
cd fromagerie-caprine
npm install
npm run dev          # http://localhost:3000
```

`.env.local` est volontairement absent du dépôt : copiez `.env.example`,
renseignez `TURSO_DATABASE_URL` et `TURSO_AUTH_TOKEN` (visibles dans la
console Turso), et `DEMO_DATA=0` pour éviter les fausses données.

## 6. Disque plein : ce qui est supprimable sans risque

Ces dossiers se **régénèrent** avec `npm install` et `npm run build` :

| Dossier | Taille | Supprimable ? |
| --- | --- | --- |
| `node_modules` | ~400 Mo | ✅ oui (recréé par `npm install`) |
| `.next` | ~100 Mo | ✅ oui (recréé par `npm run build`) |
| `data/*.db*` | quelques Ko | ⚠️ base locale seulement — en ligne, tout est dans Turso |

Ne supprimez jamais : `src/`, `scripts/`, `package.json`, ni vos
sauvegardes `.json`.

## 7. Sauvegarde et restauration des données

- **Sauvegarde** : dans l'application → **Réglages → Télécharger la sauvegarde (.json)**.
  À refaire chaque semaine et à déposer hors du PC (cloud, clé USB, e-mail).
- **Restauration** : **Réglages → Restaurer une sauvegarde** → choisir le `.json`.
  Les ventes ne sont remplacées que si le fichier en contient.
- **En cas de doute** : les données restent dans Turso même si tous vos
  appareils tombent en panne.

## 8. Vérifier l'état des services

| Service | Adresse | Ce qu'il faut voir |
| --- | --- | --- |
| Application | https://fromagerie-caprine.vercel.app | page de connexion |
| Vercel (déploiements) | https://vercel.com → projet | « Ready » sur le dernier déploiement |
| GitHub (code) | https://github.com/mcdpagenel-cell/fromagerie-caprine | dernier commit |
| Turso (base) | https://console.turso.tech | base `fromagerie-caprine` active |

En cas de panne du site : vérifiez d'abord Vercel (déploiement en échec ?),
puis les variables d'environnement, et consultez le tableau « Dépannage »
de `DEPLOIEMENT.md`.
