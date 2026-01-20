# Career Manager - Gestionnaire d'Expériences Professionnelles

## 📋 Vue d'ensemble

**Career Manager** est une application web moderne pour gérer votre parcours professionnel. Elle permet de créer, modifier, visualiser et exporter vos expériences professionnelles avec leurs compétences associées.

## 🌐 URLs

### Développement Local (Sandbox)
- **Application** : https://3000-ieorxtkymg9b9ldepsjp5-6532622b.e2b.dev
- **API Base** : https://3000-ieorxtkymg9b9ldepsjp5-6532622b.e2b.dev/api

### Production Cloudflare Pages
*À déployer - instructions ci-dessous*

## ✨ Fonctionnalités Complétées

### ✅ Gestion des Expériences
- **Ajouter** une nouvelle expérience professionnelle
- **Modifier** une expérience existante
- **Supprimer** une expérience
- **Visualiser** toutes les expériences en timeline chronologique
- Calcul automatique de la durée (années et mois)
- Badge "En cours" pour les postes actuels

### ✅ Gestion des Compétences
- **Ajouter** des compétences par expérience
- **Catégoriser** les compétences (technique, fonctionnelle, etc.)
- Autocomplétion basée sur les compétences existantes
- Affichage des compétences en badges colorés

### ✅ Stockage de Documents
- Infrastructure R2 configurée pour le stockage de fichiers
- Métadonnées stockées dans D1
- API prête pour upload/download de documents

### ✅ Export CV
- **Export Markdown** : Téléchargement du CV au format .md
- Format professionnel avec toutes les informations

### ✅ Interface Moderne
- Design attractif avec Tailwind CSS et Font Awesome
- Animations fluides (fade-in, transitions)
- Timeline visuelle avec marqueurs
- Formulaires modaux responsive
- Cartes statistiques (expériences, compétences, documents)

## 🏗️ Architecture Technique

### Stack
- **Framework Backend** : Hono (TypeScript)
- **Runtime** : Cloudflare Workers
- **Base de données** : Cloudflare D1 (SQLite)
- **Stockage fichiers** : Cloudflare R2
- **Frontend** : HTML/CSS/JavaScript (Vanilla)
- **Styling** : Tailwind CSS
- **Icons** : Font Awesome
- **HTTP Client** : Axios

### Structure de la Base de Données

#### Table `experiences`
```sql
- id (INTEGER PRIMARY KEY)
- company (TEXT NOT NULL)
- position (TEXT NOT NULL)
- location (TEXT)
- start_date (TEXT NOT NULL)
- end_date (TEXT)
- is_current (INTEGER)
- description (TEXT)
- achievements (TEXT)
- created_at, updated_at (DATETIME)
```

#### Table `skills`
```sql
- id (INTEGER PRIMARY KEY)
- name (TEXT NOT NULL UNIQUE)
- category (TEXT)
- created_at (DATETIME)
```

#### Table `experience_skills` (relation many-to-many)
```sql
- id (INTEGER PRIMARY KEY)
- experience_id (INTEGER FK)
- skill_id (INTEGER FK)
- proficiency_level (TEXT)
- created_at (DATETIME)
```

#### Table `documents`
```sql
- id (INTEGER PRIMARY KEY)
- experience_id (INTEGER FK)
- title (TEXT NOT NULL)
- file_name (TEXT NOT NULL)
- file_type (TEXT NOT NULL)
- file_size (INTEGER)
- r2_key (TEXT NOT NULL)
- description (TEXT)
- created_at (DATETIME)
```

## 🚀 Guide d'Utilisation

### Ajouter une Expérience
1. Cliquez sur **"Nouvelle Expérience"** dans la barre de navigation
2. Remplissez les champs obligatoires (Entreprise, Poste, Date de début)
3. Ajoutez des compétences avec le bouton **"+ Ajouter une compétence"**
4. Cochez **"Poste actuel"** si c'est votre emploi actuel
5. Cliquez sur **"Enregistrer"**

### Modifier une Expérience
1. Cliquez sur l'icône **"✏️ Edit"** sur l'expérience souhaitée
2. Modifiez les informations
3. Cliquez sur **"Enregistrer"**

### Supprimer une Expérience
1. Cliquez sur l'icône **"🗑️ Trash"** sur l'expérience à supprimer
2. Confirmez la suppression

### Exporter le CV
1. Cliquez sur **"Exporter CV"** dans la barre de navigation
2. Le fichier `cv.md` se télécharge automatiquement au format Markdown

## 📡 API Endpoints

### Expériences
- `GET /api/experiences` - Liste toutes les expériences
- `GET /api/experiences/:id` - Détails d'une expérience
- `POST /api/experiences` - Créer une expérience
- `PUT /api/experiences/:id` - Modifier une expérience
- `DELETE /api/experiences/:id` - Supprimer une expérience

### Compétences
- `GET /api/skills` - Liste toutes les compétences
- `POST /api/skills` - Créer une compétence
- `DELETE /api/skills/:id` - Supprimer une compétence

### Documents
- `GET /api/documents` - Liste tous les documents
- `POST /api/documents/upload` - Upload un document
- `GET /api/documents/:id/download` - Télécharger un document
- `DELETE /api/documents/:id` - Supprimer un document

### Export
- `GET /api/export/markdown` - Exporter le CV en Markdown

## 🧪 Tests

### Guide de Débogage

**En cas d'erreur, consultez le guide complet** : [`DEBUGGING_GUIDE.md`](./DEBUGGING_GUIDE.md)

Le guide couvre :
- 📋 Comment lire les logs PM2
- 🔍 Débogage avec la console navigateur
- 🌐 Inspection des requêtes réseau
- 💾 Vérification de la base de données
- 🛠️ Erreurs courantes et leurs solutions

### Tests Unitaires Disponibles

#### Test 1 : Ajout de Compétence Existante
**Objectif** : Vérifier que l'ajout d'une compétence existante (SAP) à une expérience (tefdf) réutilise correctement la compétence sans créer de doublon.

**Exécution** :
```bash
cd /home/user/webapp
./test_add_sap_skill.sh
```

**Ce qui est testé** :
- ✅ La compétence existante est réutilisée (pas de création de doublon)
- ✅ L'ID de la compétence est préservé
- ✅ L'association est correctement enregistrée dans la base
- ✅ Aucune duplication n'est créée dans la table `skills`

**Résultats attendus** :
```
✅ La compétence SAP existante (ID: 1) a été ajoutée
✅ Aucune duplication n'a été créée
✅ L'ID de la compétence est correct
✅ L'association est enregistrée dans la base
```

Voir `TEST_RESULTS.md` pour les détails complets du test.

### Tests Manuels

#### Test Interface Web
1. Accédez à l'application : https://3000-ieorxtkymg9b9ldepsjp5-6532622b.e2b.dev
2. Cliquez sur "Modifier" pour une expérience existante
3. Ajoutez une compétence existante (ex: Python, SAP, SQL)
4. Enregistrez
5. Vérifiez que la compétence apparaît correctement
6. Modifiez à nouveau l'expérience
7. Vérifiez que la compétence conserve son ID d'origine

## 🛠️ Développement Local

### Prérequis
- Node.js 18+
- npm

### Installation
```bash
cd /home/user/webapp
npm install
```

### Initialiser la base de données
```bash
npm run db:migrate:local
npm run db:seed
```

### Lancer en développement
```bash
npm run build
pm2 start ecosystem.config.cjs
```

### Tester
```bash
curl http://localhost:3000
curl http://localhost:3000/api/experiences
```

### Vérifier les logs
```bash
pm2 logs career-manager --nostream
```

## ☁️ Déploiement sur Cloudflare Pages

### 1. Configurer l'authentification Cloudflare
```bash
# Dans votre environnement, configurez votre API token Cloudflare
# Puis utilisez wrangler pour vous authentifier
npx wrangler whoami
```

### 2. Créer la base de données D1 en production
```bash
npx wrangler d1 create career-manager-production
# Copiez le database_id généré dans wrangler.jsonc
```

### 3. Créer le bucket R2
```bash
npx wrangler r2 bucket create career-manager-documents
```

### 4. Appliquer les migrations en production
```bash
npm run db:migrate:prod
```

### 5. Créer le projet Cloudflare Pages
```bash
npx wrangler pages project create career-manager \
  --production-branch main \
  --compatibility-date 2026-01-19
```

### 6. Déployer l'application
```bash
npm run build
npx wrangler pages deploy dist --project-name career-manager
```

### 7. Obtenir l'URL de production
Après le déploiement, wrangler affichera l'URL de production :
```
✨ Success! Uploaded 1 file
✅ Deployment complete!
🌎 https://career-manager.pages.dev
```

## 📊 Statut du Projet

### ✅ Fonctionnalités Implémentées
- ✅ CRUD complet des expériences
- ✅ Gestion des compétences par expérience
- ✅ **BUG FIX v1.0.1**: Correction du mapping des compétences lors de l'édition
- ✅ Timeline interactive et responsive
- ✅ Export CV en Markdown
- ✅ Interface moderne avec animations
- ✅ Base de données D1 configurée
- ✅ Stockage R2 configuré
- ✅ API REST complète

### 🔄 Fonctionnalités Futures (Non prioritaires)
- ❌ Upload effectif de documents (UI à ajouter)
- ❌ Export PDF via navigateur (print)
- ❌ Export DOCX
- ❌ Recherche et filtrage avancés
- ❌ Génération de CV personnalisés par mission
- ❌ Dashboard de visualisation (graphiques)
- ❌ Authentification multi-utilisateurs
- ❌ Intégration LinkedIn

## 🔒 Sécurité & Limitations

### Usage Personnel
- Actuellement conçu pour un usage personnel (pas d'authentification)
- Toutes les données sont accessibles publiquement dans cette version
- Pour un usage multi-utilisateurs, ajouter une authentification (Cloudflare Access, Auth0, etc.)

### Limitations Cloudflare Workers
- Pas de système de fichiers (utilisation de R2 pour les fichiers)
- Pas d'APIs Node.js natives (utilisation des Web APIs)
- Limite de 10ms CPU time par requête (gratuit) / 30ms (payant)
- Taille maximale du Worker : 10MB compressé

## 📝 Données de Test

L'application est initialisée avec :
- **1 expérience exemple** : SilenceSilence.ai (Consultant IA)
- **25+ compétences prédéfinies** : Python, SQL, GCP, BigQuery, SAP, etc.

## 🎨 Design & UX

### Palette de Couleurs
- **Primary** : Bleu (#3b82f6)
- **Secondary** : Violet (#8b5cf6)
- **Success** : Vert
- **Background** : Dégradé bleu-violet

### Composants UI
- Timeline avec marqueurs circulaires
- Cartes statistiques avec icônes
- Formulaire modal responsive
- Badges de compétences colorés
- Boutons avec transitions smooth

## 🤝 Contribution

Ce projet est personnel. Pour toute suggestion ou amélioration :
1. Forkez le repository
2. Créez une branche feature
3. Committez vos changements
4. Pushez sur la branche
5. Créez une Pull Request

## 📄 Licence

Usage personnel - Charles DE COURCEL

---

**Dernière mise à jour** : 2026-01-20  
**Version** : 1.0.7  
**Statut** : ✅ Prêt pour utilisation locale et déploiement production

## 📝 Changelog

### v1.0.7 (2026-01-20)
- 🎨 **Version Display**: Affichage de la version dans l'application web
  - ✨ **Endpoint `/api/version`** : Nouvelle route API retournant les informations de version
    - Version actuelle, commit hash, nom de l'application
    - Date de build, description de la version
  - 🔍 **Footer** : Affichage de la version en bas de page
    - Version avec icône Git branch
    - Commit hash avec icône Git
    - Lien cliquable vers GitHub
  - 📚 **Documentation complète** : `VERSION_DISPLAY_IMPLEMENTATION.md`
  - 🎯 **~20 lignes de code** seulement pour implémenter cette fonctionnalité

### v1.0.6 (2026-01-20)
- 📊 **Version Control**: Ajout de la documentation et des scripts pour le contrôle de version
  - ✨ **Git Tags** : Tags créés pour v1.0.3, v1.0.4, v1.0.5, v1.0.6
  - 🔍 **Script `check-version.sh`** : Vérifier la version actuellement déployée
  - 📦 **Script `generate-version.sh`** : Générer `version.json` avec métadonnées Git
  - 📚 **Documentation complète** :
    - `VERSION_CONTROL_GUIDE.md` : Guide complet du contrôle de version
    - `VERSION_CONTROL_SUMMARY.md` : Résumé et recommandations
  - 🎯 **Recommandations** : Pour afficher la version dans l'application web

### v1.0.5 (2026-01-19)
- 🎨 **UX Improvements**: Amélioration de l'interface utilisateur
  - ✨ **Compétences en lecture seule** : Les compétences existantes ne peuvent plus être modifiées accidentellement
    - Compétences existantes : Fond gris, attribut `readonly`, cursor `not-allowed`
    - Nouvelles compétences : Fond blanc, modifiables normalement
    - Tooltip informatif pour distinguer les deux types
  - 🔍 **Icônes plus grandes** : Amélioration de la visibilité et de l'accessibilité
    - Taille augmentée de ~25% (`text-xl`)
    - Animation de zoom au survol (`hover:scale-110`)
    - Espacement amélioré entre les boutons
    - Meilleure expérience tactile sur mobile
- 📚 Documentation complète : `UX_IMPROVEMENTS_v1.0.5.md`

### v1.0.4 (2026-01-19)
- 🐛 **Critical Fix**: Correction du mapping des compétences lors de la **création** d'expériences
  - Bug : Les compétences existantes étaient mal mappées (ex: ChatGPT → PowerBI)
  - Cause : `INSERT OR IGNORE` retournait `last_row_id` incorrect
  - Solution : SELECT d'abord pour vérifier l'existence, puis INSERT seulement si nécessaire
  - Les compétences sont maintenant correctement mappées (ChatGPT ID 14, Docker ID 9, etc.)
  - Tests automatisés ajoutés : `test_create_chatgpt.sh`, `test_mixed_skills.sh`
- 📚 Documentation complète : `BUG_FIX_SKILL_MAPPING_v1.0.4.md`

### v1.0.3 (2026-01-19)
- 🐛 **Fix**: Suppression des gestionnaires d'erreur problématiques
  - Les erreurs "Context is not finalized" en développement local sont normales
  - Ces erreurs n'affectent pas le fonctionnement de l'application
  - N'apparaissent pas en production sur Cloudflare Pages
- 📚 Documentation ajoutée : `ERROR_CONTEXT_NOT_FINALIZED.md`
- ℹ️ Note : Les erreurs 500 pour /favicon.ico dans les logs PM2 sont cosmétiques

### v1.0.2 (2026-01-19)
- 🐛 **Critical Fix**: Correction du JOIN dans l'API skills
  - Erreur : `LEFT JOIN experience_skills es ON s.id = es.id`
  - Correction : `LEFT JOIN experience_skills es ON s.id = es.skill_id`
  - Résout l'erreur "FOREIGN KEY constraint failed" lors de la modification d'expériences
  - Les compétences sont maintenant correctement listées et associées
- 📚 Ajout du guide de débogage complet (`DEBUGGING_GUIDE.md`)

### v1.0.1 (2026-01-19)
- 🐛 **Bug Fix**: Correction du mapping des compétences lors de l'édition
  - Ajout d'un champ caché `skill_id[]` pour préserver les IDs des compétences existantes
  - Modification de la logique de collecte des compétences pour inclure l'ID si disponible
  - Les compétences existantes sont maintenant correctement réutilisées au lieu d'être dupliquées
  - Test validé : modification d'expérience avec compétences existantes et nouvelles

### v1.0.0 (2026-01-19)
- 🎉 Version initiale avec toutes les fonctionnalités principales
