# 🚀 Guide de Démarrage Rapide - Career Manager

## Installation et Exécution en 5 Minutes

Ce guide vous permet de lancer l'application Career Manager rapidement sur un environnement vierge.

---

## ⚡ Installation Express

### Étape 1 : Prérequis (2 minutes)

```bash
# Vérifier que Node.js est installé (version 18+)
node --version
# Si pas installé :
# Ubuntu: curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs
# macOS: brew install node@20
# Windows: Télécharger depuis https://nodejs.org/

# Installer PM2 globalement
npm install -g pm2
```

### Étape 2 : Télécharger l'Application (30 secondes)

**Option A : Depuis Backup (Recommandé)**
```bash
# Télécharger le backup complet
wget https://www.genspark.ai/api/files/s/C7k5sOIm -O career-manager.tar.gz

# Extraire
tar -xzf career-manager.tar.gz

# Entrer dans le dossier
cd ~/webapp
```

**Option B : Depuis GitHub**
```bash
# Cloner le repository
git clone https://github.com/VOTRE_USERNAME/career-manager.git webapp
cd webapp
```

### Étape 3 : Installer les Dépendances (1-2 minutes)

```bash
npm install
```

### Étape 4 : Initialiser la Base de Données (30 secondes)

```bash
# Créer la base de données et charger les données
npm run db:migrate:local
npm run db:seed
```

### Étape 5 : Lancer l'Application (30 secondes)

```bash
# Build
npm run build

# Démarrer avec PM2
pm2 start ecosystem.config.cjs

# Vérifier que ça fonctionne
curl http://localhost:3000
```

### ✅ C'est Prêt !

Ouvrez votre navigateur : **http://localhost:3000**

---

## 📋 Commandes Utiles

```bash
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

## 🆘 Problème ?

### L'application ne démarre pas

```bash
# Vérifier les logs
pm2 logs career-manager --nostream

# Nettoyer le port 3000
fuser -k 3000/tcp || true

# Redémarrer
pm2 restart career-manager
```

### Erreur de base de données

```bash
# Réinitialiser la DB
npm run db:reset
npm run build
pm2 restart career-manager
```

---

## 📚 Documentation Complète

Pour plus de détails, consultez :
- **DEPLOYMENT_GUIDE.md** : Guide complet pas à pas
- **DEBUGGING_GUIDE.md** : Guide de débogage
- **README.md** : Documentation du projet

---

## 🌐 Accès

| Service | URL |
|---------|-----|
| **Application Web** | http://localhost:3000 |
| **API Experiences** | http://localhost:3000/api/experiences |
| **API Skills** | http://localhost:3000/api/skills |
| **Export CV** | http://localhost:3000/api/export/markdown |

---

## 📦 Backups Disponibles

| Version | Lien | Description |
|---------|------|-------------|
| **v1.0.2 Complet** | [Télécharger](https://www.genspark.ai/api/files/s/C7k5sOIm) | ⭐ **RECOMMANDÉ** - Avec tous les guides |
| v1.0.2 Stable | [Télécharger](https://www.genspark.ai/api/files/s/WhszzFfI) | Avec bug fix JOIN |

---

**Temps total d'installation : ~5 minutes**  
**Version : 1.0.2**
