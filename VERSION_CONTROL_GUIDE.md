# 🏷️ Guide de Contrôle de Version - Career Manager

**Date**: 2026-01-20  
**Version actuelle**: v1.0.5  
**Application**: https://3000-ieorxtkymg9b9ldepsjp5-6532622b.e2b.dev  
**GitHub**: https://github.com/chleo-consulting/career-manager

---

## 📋 Table des Matières

1. [Contrôle de Version Sans Modifier le Code](#1-contrôle-de-version-sans-modifier-le-code)
2. [Recommandations pour Afficher la Version dans l'App](#2-recommandations-pour-afficher-la-version-dans-lapp)
3. [Workflow de Versioning Recommandé](#3-workflow-de-versioning-recommandé)

---

## 1️⃣ Contrôle de Version Sans Modifier le Code

### A) Via Git Tags (RECOMMANDÉ)

Les **Git tags** permettent de marquer des versions spécifiques sans toucher au code.

#### **Vérifier la version déployée**

```bash
cd /home/user/webapp

# Vérifier le commit actuel
git log -1 --oneline

# Vérifier si ce commit a un tag (version)
git tag --points-at HEAD

# Voir toutes les versions disponibles
git tag -l -n1
```

#### **Script automatique**

Un script `check-version.sh` est disponible :

```bash
cd /home/user/webapp
./check-version.sh
```

**Sortie :**
```
==============================================
🔍 VERSION DÉPLOYÉE - Career Manager
==============================================

📍 Commit actuel:
   Hash: 35c88006f50c2392fa49639b7194b35cfbc89022
   Court: 35c8800
   Message: v1.0.5: UX improvements - readonly skills and larger icons
   Date: 2026-01-20 14:21

🏷️  Version (Tag): v1.0.5

📦 Versions disponibles:
v1.0.3          v1.0.3: Document Context finalization errors
v1.0.4          v1.0.4: Fix skill mapping bug in POST/PUT
v1.0.5          v1.0.5: UX improvements - readonly skills and larger icons

🌐 URLs:
   Application: https://3000-ieorxtkymg9b9ldepsjp5-6532622b.e2b.dev
   GitHub: https://github.com/chleo-consulting/career-manager
```

### B) Via GitHub Releases

GitHub permet de créer des **Releases** basées sur les tags :

1. **Aller sur** : https://github.com/chleo-consulting/career-manager/releases
2. **Voir les releases** existantes
3. **Créer une nouvelle release** :
   - Cliquer sur "Create a new release"
   - Sélectionner un tag (ex: `v1.0.5`)
   - Ajouter des notes de release
   - Publier

### C) Via package.json (Metadata)

Bien que `package.json` n'ait pas de champ `"version"`, vous pouvez l'ajouter **sans impact sur le code** :

```json
{
  "name": "career-manager",
  "version": "1.0.5",
  "type": "module",
  ...
}
```

Puis récupérer la version via :

```bash
cd /home/user/webapp
node -p "require('./package.json').version"
```

### D) Via un fichier VERSION (Simple)

Créer un fichier `VERSION` dans le projet :

```bash
echo "v1.0.5" > /home/user/webapp/VERSION
```

Puis le lire :

```bash
cat /home/user/webapp/VERSION
```

---

## 2️⃣ Recommandations pour Afficher la Version dans l'App

Pour afficher la version **DANS l'application web**, voici les meilleures approches :

### 🥇 Solution 1 : Endpoint `/api/version` (RECOMMANDÉ)

**Avantages :**
- ✅ Pas de modification du frontend
- ✅ Accessible via API
- ✅ Peut inclure des métadonnées (commit, date de build)

**Implémentation :**

Ajouter dans `src/index.tsx` :

```typescript
// API route pour récupérer la version
app.get('/api/version', (c) => {
  const fs = require('fs')
  const path = require('path')
  
  // Lire le tag Git actuel
  const { execSync } = require('child_process')
  const tag = execSync('git describe --tags --exact-match 2>/dev/null || git describe --tags --abbrev=0 2>/dev/null || echo "dev"')
    .toString().trim()
  const commit = execSync('git rev-parse --short HEAD').toString().trim()
  
  return c.json({
    version: tag,
    commit: commit,
    buildDate: new Date().toISOString()
  })
})
```

**Utilisation dans le frontend :**

```javascript
// Dans public/static/app.js
async function loadVersion() {
  const response = await fetch('/api/version')
  const data = await response.json()
  document.getElementById('app-version').textContent = `v${data.version}`
}
```

**Dans le HTML (footer) :**

```html
<footer class="text-center text-gray-500 text-sm mt-8">
  Career Manager <span id="app-version">v1.0.5</span>
</footer>
```

---

### 🥈 Solution 2 : Fichier `version.json` statique

**Avantages :**
- ✅ Pas besoin de route API
- ✅ Fichier statique servi directement
- ✅ Peut être généré automatiquement lors du build

**Génération automatique :**

Un script `generate-version.sh` a été créé :

```bash
cd /home/user/webapp
./generate-version.sh
```

**Contenu de `dist/version.json` :**

```json
{
  "version": "v1.0.5",
  "commit": {
    "hash": "35c88006f50c2392fa49639b7194b35cfbc89022",
    "short": "35c8800",
    "message": "v1.0.5: UX improvements - readonly skills and larger icons",
    "date": "2026-01-20 14:21:37 +0000"
  },
  "build": {
    "date": "2026-01-20T14:46:38Z"
  },
  "urls": {
    "app": "https://3000-ieorxtkymg9b9ldepsjp5-6532622b.e2b.dev",
    "github": "https://github.com/chleo-consulting/career-manager"
  }
}
```

**Utilisation dans le frontend :**

```javascript
async function loadVersion() {
  const response = await fetch('/version.json')
  const data = await response.json()
  document.getElementById('app-version').textContent = data.version
}
```

**⚠️ Note** : Le fichier doit être copié dans `dist/` après chaque build.

---

### 🥉 Solution 3 : Variable d'environnement

**Avantages :**
- ✅ Contrôle externe via `.env`
- ✅ Pas de modification du code source

**Configuration :**

Ajouter dans `.dev.vars` (local) ou Cloudflare Environment Variables (production) :

```bash
APP_VERSION=v1.0.5
```

**Utilisation dans le backend :**

```typescript
app.get('/api/version', (c) => {
  return c.json({
    version: process.env.APP_VERSION || 'dev'
  })
})
```

---

### 🏅 Solution 4 : En-tête HTTP personnalisé

**Avantages :**
- ✅ Discret (pas visible dans l'UI)
- ✅ Utile pour le monitoring

**Implémentation :**

```typescript
app.use('*', async (c, next) => {
  await next()
  c.header('X-App-Version', 'v1.0.5')
})
```

**Vérification :**

```bash
curl -I http://localhost:3000 | grep X-App-Version
```

---

## 3️⃣ Workflow de Versioning Recommandé

### Étape 1 : Développement

```bash
# Travailler sur une feature
git checkout -b feature/nouvelle-fonctionnalite
# ... développer ...
git commit -m "Add nouvelle fonctionnalité"
```

### Étape 2 : Merge et Versioning

```bash
# Merger dans main
git checkout main
git merge feature/nouvelle-fonctionnalite

# Créer un tag pour la nouvelle version
git tag v1.0.6 -m "v1.0.6: Add nouvelle fonctionnalité"
git push origin main
git push origin v1.0.6
```

### Étape 3 : Build et Déploiement

```bash
# Générer version.json
./generate-version.sh

# Build
npm run build

# Redémarrer
pm2 restart career-manager

# Vérifier la version déployée
./check-version.sh
```

### Étape 4 : GitHub Release (optionnel)

1. Aller sur : https://github.com/chleo-consulting/career-manager/releases/new
2. Sélectionner le tag `v1.0.6`
3. Ajouter les notes de release
4. Publier

---

## 📊 Résumé des Solutions

| Méthode | Sans Code | Visible UI | Complexité | Recommandé |
|---------|-----------|------------|------------|------------|
| **Git Tags** | ✅ | ❌ | Faible | ✅ |
| **GitHub Releases** | ✅ | ❌ | Faible | ✅ |
| **`/api/version`** | ❌ | ✅ | Moyenne | ✅ |
| **`version.json`** | ⚠️ | ✅ | Faible | ✅ |
| **Variable d'env** | ✅ | ✅ | Faible | ⚠️ |
| **En-tête HTTP** | ❌ | ❌ | Faible | ⚠️ |
| **package.json** | ✅ | ❌ | Faible | ⚠️ |

---

## 🎯 Recommandation Finale

**Pour contrôler la version SANS toucher au code :**

1. ✅ **Utiliser Git Tags** (`./check-version.sh`)
2. ✅ **Créer des GitHub Releases** manuellement
3. ✅ **Générer `version.json`** lors du build (`./generate-version.sh`)

**Pour afficher la version DANS l'application :**

1. ✅ **Ajouter un endpoint `/api/version`** (nécessite modification du code)
2. ✅ **Ou utiliser `version.json`** généré automatiquement

---

## 📦 Scripts Disponibles

### `check-version.sh`

Vérifie la version actuellement déployée :

```bash
cd /home/user/webapp
./check-version.sh
```

### `generate-version.sh`

Génère `dist/version.json` à partir de Git :

```bash
cd /home/user/webapp
./generate-version.sh
```

---

## 🔗 Liens Utiles

- **Application** : https://3000-ieorxtkymg9b9ldepsjp5-6532622b.e2b.dev
- **GitHub** : https://github.com/chleo-consulting/career-manager
- **Releases** : https://github.com/chleo-consulting/career-manager/releases
- **Tags** : https://github.com/chleo-consulting/career-manager/tags

---

## 📝 Versions Actuelles

| Version | Date | Commit | Description |
|---------|------|--------|-------------|
| **v1.0.5** | 2026-01-20 | `35c8800` | UX improvements - readonly skills, larger icons |
| v1.0.4 | 2026-01-19 | `b784ae0` | Fix skill mapping bug in POST/PUT |
| v1.0.3 | 2026-01-19 | `a71842e` | Document Context finalization errors |

---

**Dernière mise à jour** : 2026-01-20  
**Auteur** : Charles (chleo-consulting)
