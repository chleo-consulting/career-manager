# 🚀 Guide de Déploiement - Career Manager
## Installation et Exécution depuis un Environnement Vierge

Ce guide vous explique **pas à pas** comment installer et exécuter l'application Career Manager sur une machine vierge.

---

## 📋 Table des Matières

1. [Prérequis](#prérequis)
2. [Installation depuis GitHub](#installation-depuis-github)
3. [Installation depuis Backup](#installation-depuis-backup)
4. [Configuration de la Base de Données](#configuration-de-la-base-de-données)
5. [Lancement de l'Application](#lancement-de-lapplication)
6. [Vérification](#vérification)
7. [Déploiement Production](#déploiement-production)
8. [Dépannage](#dépannage)

---

## 1. Prérequis

### Logiciels Requis

| Logiciel | Version Minimale | Commande de Vérification |
|----------|-----------------|--------------------------|
| **Node.js** | 18.x ou supérieur | `node --version` |
| **npm** | 9.x ou supérieur | `npm --version` |
| **git** | 2.x ou supérieur | `git --version` |
| **PM2** (optionnel) | 5.x ou supérieur | `pm2 --version` |

### Installation des Prérequis

#### Sur Ubuntu/Debian
```bash
# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer Node.js 20.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Installer git
sudo apt install -y git

# Installer PM2 globalement (optionnel mais recommandé)
sudo npm install -g pm2

# Vérifier les installations
node --version    # Doit afficher v20.x.x
npm --version     # Doit afficher 10.x.x
git --version     # Doit afficher 2.x.x
pm2 --version     # Doit afficher 5.x.x
```

#### Sur macOS
```bash
# Installer Homebrew si pas déjà installé
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Installer Node.js
brew install node@20

# Installer git
brew install git

# Installer PM2
npm install -g pm2

# Vérifier les installations
node --version
npm --version
git --version
pm2 --version
```

#### Sur Windows
```powershell
# Télécharger et installer Node.js depuis https://nodejs.org/
# Choisir la version LTS (20.x)

# Installer git depuis https://git-scm.com/download/win

# Ouvrir PowerShell en tant qu'administrateur
npm install -g pm2

# Vérifier les installations
node --version
npm --version
git --version
pm2 --version
```

---

## 2. Installation depuis GitHub

### Étape 2.1 : Cloner le Repository

```bash
# Se placer dans le répertoire home
cd ~

# Cloner le repository (remplacer par l'URL réelle)
git clone https://github.com/VOTRE_USERNAME/career-manager.git webapp

# Ou si vous avez accès au repository
# git clone https://github.com/username/webapp.git webapp

# Entrer dans le dossier
cd webapp

# Vérifier que les fichiers sont bien présents
ls -la
# Vous devriez voir : src/, migrations/, package.json, wrangler.jsonc, etc.
```

**Note** : Si vous n'avez pas accès au repository GitHub, passez à la [Section 3 : Installation depuis Backup](#3-installation-depuis-backup)

### Étape 2.2 : Installer les Dépendances

```bash
# Installer toutes les dépendances npm
npm install

# Attendre la fin de l'installation (peut prendre 1-2 minutes)
# Vous devriez voir : "added XXX packages"
```

**Vérification** :
```bash
# Vérifier que node_modules existe
ls -d node_modules
# Doit afficher : node_modules

# Vérifier les packages installés
npm list --depth=0
```

---

## 3. Installation depuis Backup

Si vous n'avez pas accès au repository GitHub, utilisez le backup :

### Étape 3.1 : Télécharger le Backup

**Version Stable Recommandée : v1.0.2**

```bash
# Télécharger le backup
wget https://www.genspark.ai/api/files/s/WhszzFfI -O career-manager-v1.0.2.tar.gz

# Ou avec curl
curl -L https://www.genspark.ai/api/files/s/WhszzFfI -o career-manager-v1.0.2.tar.gz
```

### Étape 3.2 : Extraire le Backup

```bash
# Extraire l'archive
tar -xzf career-manager-v1.0.2.tar.gz

# Le dossier webapp est créé avec le chemin absolu
# Se placer dedans
cd ~/webapp

# Ou si extrait ailleurs
cd /chemin/vers/webapp

# Vérifier les fichiers
ls -la
```

### Étape 3.3 : Installer les Dépendances

```bash
# Installer les dépendances
npm install

# Attendre la fin de l'installation
```

---

## 4. Configuration de la Base de Données

### Étape 4.1 : Vérifier les Migrations

```bash
# Vérifier que le dossier migrations existe
ls migrations/
# Doit afficher : 0001_initial_schema.sql

# Vérifier le contenu de la migration
cat migrations/0001_initial_schema.sql | head -20
```

### Étape 4.2 : Initialiser la Base de Données Locale

La base de données locale utilise SQLite via Cloudflare D1 en mode `--local`.

```bash
# Appliquer les migrations
npm run db:migrate:local

# Vous devriez voir :
# ✅ 0001_initial_schema.sql | ✅
```

**Vérification** :
```bash
# Vérifier que la base de données a été créée
ls -la .wrangler/state/v3/d1/
# Doit contenir un fichier .sqlite
```

### Étape 4.3 : Charger les Données de Test

```bash
# Charger les données initiales (compétences et expérience exemple)
npm run db:seed

# Vous devriez voir :
# 🚣 3 commands executed successfully
```

**Vérification** :
```bash
# Vérifier que les données ont été insérées
npx wrangler d1 execute career-manager-production --local \
  --command="SELECT COUNT(*) as count FROM skills"

# Doit afficher : count: 25 (ou plus)

npx wrangler d1 execute career-manager-production --local \
  --command="SELECT COUNT(*) as count FROM experiences"

# Doit afficher : count: 1 (ou plus)
```

---

## 5. Lancement de l'Application

### Méthode 1 : Lancement avec PM2 (Recommandé)

PM2 permet de lancer l'application en arrière-plan et de gérer facilement les logs.

#### Étape 5.1 : Build de l'Application

```bash
# Compiler l'application TypeScript
npm run build

# Vous devriez voir :
# ✓ 27 modules transformed.
# dist/_worker.js  46.98 kB
# ✓ built in XXXms
```

**Vérification** :
```bash
# Vérifier que le dossier dist a été créé
ls -la dist/
# Doit contenir : _worker.js, _routes.json
```

#### Étape 5.2 : Démarrer avec PM2

```bash
# Nettoyer le port 3000 (si déjà utilisé)
fuser -k 3000/tcp 2>/dev/null || true

# Démarrer l'application
pm2 start ecosystem.config.cjs

# Vous devriez voir :
# [PM2] App [career-manager] launched (1 instances)
```

**Vérification** :
```bash
# Vérifier le statut
pm2 list

# Doit afficher :
# ┌─────┬──────────────────┬─────────┬─────────┬──────────┐
# │ id  │ name             │ status  │ cpu     │ memory   │
# ├─────┼──────────────────┼─────────┼─────────┼──────────┤
# │ 0   │ career-manager   │ online  │ 0%      │ 36.7mb   │
# └─────┴──────────────────┴─────────┴─────────┴──────────┘
```

#### Étape 5.3 : Vérifier les Logs

```bash
# Voir les logs en temps réel
pm2 logs career-manager

# Vous devriez voir :
# [wrangler:info] Ready on http://0.0.0.0:3000

# Pour sortir, appuyez sur Ctrl+C

# Voir les logs sans streaming
pm2 logs career-manager --nostream --lines 20
```

### Méthode 2 : Lancement Direct (Développement)

**⚠️ Attention** : Cette méthode bloque le terminal.

```bash
# Build
npm run build

# Lancer directement (bloque le terminal)
npm run dev:sandbox

# Ou utiliser wrangler directement
npx wrangler pages dev dist --d1=career-manager-production --r2=career-manager-documents --local --ip 0.0.0.0 --port 3000

# L'application démarre sur http://0.0.0.0:3000
# Pour arrêter : Ctrl+C
```

---

## 6. Vérification

### Étape 6.1 : Tester l'Application

#### Test 1 : Vérifier que le Serveur Répond

```bash
# Test HTTP simple
curl -I http://localhost:3000

# Doit afficher :
# HTTP/1.1 200 OK
# Content-Type: text/html; charset=UTF-8
```

#### Test 2 : Tester l'API Experiences

```bash
# Récupérer toutes les expériences
curl http://localhost:3000/api/experiences | python3 -m json.tool

# Doit afficher un JSON avec au moins 1 expérience
```

#### Test 3 : Tester l'API Skills

```bash
# Récupérer toutes les compétences
curl http://localhost:3000/api/skills | python3 -m json.tool

# Doit afficher un JSON avec ~25 compétences
```

#### Test 4 : Tester l'Interface Web

```bash
# Ouvrir dans le navigateur
# Linux
xdg-open http://localhost:3000

# macOS
open http://localhost:3000

# Windows
start http://localhost:3000

# Ou ouvrir manuellement dans le navigateur
```

**Vérifications dans l'interface** :
- ✅ La page se charge correctement
- ✅ Le titre "Career Manager" est visible
- ✅ Les statistiques (expériences, compétences) s'affichent
- ✅ La timeline montre au moins 1 expérience
- ✅ Les boutons "Nouvelle Expérience" et "Exporter CV" sont visibles

### Étape 6.2 : Tester les Fonctionnalités

#### Test Ajout d'Expérience

1. Cliquer sur **"Nouvelle Expérience"**
2. Remplir les champs :
   - Entreprise : "Test Company"
   - Poste : "Test Position"
   - Date de début : (choisir une date)
3. Cliquer sur **"Ajouter une compétence"**
4. Ajouter "Python" dans le champ
5. Cliquer sur **"Enregistrer"**
6. Vérifier que l'expérience apparaît dans la timeline

#### Test Modification d'Expérience

1. Cliquer sur l'icône **✏️ Edit** d'une expérience
2. Modifier le poste ou ajouter une compétence
3. Cliquer sur **"Enregistrer"**
4. Vérifier que les modifications sont visibles

#### Test Export CV

1. Cliquer sur **"Exporter CV"**
2. Vérifier qu'un fichier `cv.md` est téléchargé
3. Ouvrir le fichier et vérifier son contenu

---

## 7. Déploiement Production

### Option 1 : Utilisation Locale (Développement)

L'application tourne déjà en local sur `http://localhost:3000`.

**Commandes utiles** :
```bash
# Redémarrer l'application
pm2 restart career-manager

# Arrêter l'application
pm2 stop career-manager

# Supprimer de PM2
pm2 delete career-manager

# Voir les logs
pm2 logs career-manager --nostream
```

### Option 2 : Déploiement sur Cloudflare Pages

**⚠️ Prérequis** : Compte Cloudflare et API token

#### Étape 7.1 : Configuration Cloudflare

```bash
# Configurer l'authentification (nécessite API token)
# Suivre les instructions pour obtenir un token depuis
# https://dash.cloudflare.com/ → My Profile → API Tokens

# Vérifier l'authentification
npx wrangler whoami
```

#### Étape 7.2 : Créer les Ressources Production

```bash
# Créer la base de données D1
npx wrangler d1 create career-manager-production
# Copier le database_id affiché et le mettre dans wrangler.jsonc

# Créer le bucket R2
npx wrangler r2 bucket create career-manager-documents
```

#### Étape 7.3 : Appliquer les Migrations

```bash
# Appliquer les migrations en production
npm run db:migrate:prod

# Vous devriez voir :
# ✅ 0001_initial_schema.sql | ✅
```

#### Étape 7.4 : Créer le Projet Cloudflare Pages

```bash
# Créer le projet
npx wrangler pages project create career-manager \
  --production-branch main \
  --compatibility-date 2026-01-19
```

#### Étape 7.5 : Déployer

```bash
# Build et déploiement
npm run deploy

# Ou manuellement
npm run build
npx wrangler pages deploy dist --project-name career-manager

# Vous recevrez une URL de production :
# ✨ Success!
# 🌎 https://career-manager.pages.dev
```

---

## 8. Dépannage

### Problème 1 : "Port 3000 already in use"

**Solution** :
```bash
# Tuer le processus sur le port 3000
fuser -k 3000/tcp

# Ou avec PM2
pm2 delete all

# Puis relancer
pm2 start ecosystem.config.cjs
```

### Problème 2 : "Module not found"

**Solution** :
```bash
# Réinstaller les dépendances
rm -rf node_modules package-lock.json
npm install
```

### Problème 3 : "Failed to connect to DB"

**Solution** :
```bash
# Réinitialiser la base de données
npm run db:reset

# Ou manuellement
rm -rf .wrangler/state/v3/d1
npm run db:migrate:local
npm run db:seed
```

### Problème 4 : "Build failed"

**Solution** :
```bash
# Nettoyer et rebuild
rm -rf dist
npm run build

# Si l'erreur persiste, vérifier les logs
npm run build 2>&1 | tee build.log
cat build.log
```

### Problème 5 : L'application ne démarre pas

**Solution** :
```bash
# Vérifier les logs PM2
pm2 logs career-manager --nostream --lines 50

# Redémarrer PM2
pm2 restart career-manager

# Si toujours problème, supprimer et recréer
pm2 delete career-manager
npm run build
pm2 start ecosystem.config.cjs
```

### Problème 6 : Erreur "FOREIGN KEY constraint failed"

**Solution** : Ce bug a été corrigé en v1.0.2. Assurez-vous d'utiliser la dernière version.

```bash
# Vérifier la version
git log --oneline -1

# Doit afficher un commit récent (après 2026-01-19)

# Si pas à jour, télécharger le dernier backup
wget https://www.genspark.ai/api/files/s/WhszzFfI -O career-manager-v1.0.2.tar.gz
```

---

## 📝 Récapitulatif des Commandes

### Installation Complète (Séquence Rapide)

```bash
# 1. Prérequis (si pas installé)
# node, npm, git, pm2

# 2. Installation
cd ~
git clone https://github.com/username/webapp.git webapp
# OU télécharger et extraire le backup
cd webapp

# 3. Dépendances
npm install

# 4. Base de données
npm run db:migrate:local
npm run db:seed

# 5. Build
npm run build

# 6. Lancement
pm2 start ecosystem.config.cjs

# 7. Vérification
pm2 logs career-manager --nostream
curl http://localhost:3000
```

### Commandes Quotidiennes

```bash
# Démarrer l'application
cd ~/webapp
pm2 start ecosystem.config.cjs

# Voir le statut
pm2 list

# Voir les logs
pm2 logs career-manager

# Redémarrer
pm2 restart career-manager

# Arrêter
pm2 stop career-manager

# Tester l'API
curl http://localhost:3000/api/experiences
```

---

## 🎯 Checklist de Démarrage

- [ ] Node.js 18+ installé (`node --version`)
- [ ] npm installé (`npm --version`)
- [ ] git installé (`git --version`)
- [ ] PM2 installé (`pm2 --version`)
- [ ] Code récupéré (GitHub ou backup)
- [ ] Dépendances installées (`npm install`)
- [ ] Migrations appliquées (`npm run db:migrate:local`)
- [ ] Données de test chargées (`npm run db:seed`)
- [ ] Application buildée (`npm run build`)
- [ ] Application démarrée (`pm2 start ecosystem.config.cjs`)
- [ ] Serveur répond (`curl http://localhost:3000`)
- [ ] Interface web accessible (navigateur)
- [ ] API fonctionne (`curl http://localhost:3000/api/experiences`)

---

## 🌐 URLs Utiles

| Environnement | URL |
|---------------|-----|
| **Local** | http://localhost:3000 |
| **API Experiences** | http://localhost:3000/api/experiences |
| **API Skills** | http://localhost:3000/api/skills |
| **Export CV** | http://localhost:3000/api/export/markdown |

---

## 📚 Documentation Complémentaire

- **README.md** : Vue d'ensemble du projet
- **DEBUGGING_GUIDE.md** : Guide de débogage complet
- **TEST_RESULTS.md** : Résultats des tests unitaires
- **BUG_RESOLUTION.md** : Historique des bugs résolus

---

## 🆘 Support

En cas de problème :

1. **Consulter les logs** : `pm2 logs career-manager --nostream`
2. **Lire le guide de débogage** : `cat DEBUGGING_GUIDE.md`
3. **Vérifier la base de données** :
   ```bash
   npx wrangler d1 execute career-manager-production --local \
     --command="SELECT * FROM experiences LIMIT 5"
   ```
4. **Réinitialiser complètement** :
   ```bash
   pm2 delete all
   rm -rf node_modules .wrangler dist
   npm install
   npm run db:reset
   npm run build
   pm2 start ecosystem.config.cjs
   ```

---

**Version du guide** : 1.0.2  
**Dernière mise à jour** : 2026-01-19  
**Testé sur** : Ubuntu 22.04, macOS 14, Windows 11
