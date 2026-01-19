# 🐛 Bug Critique: Mauvais Mapping des Compétences lors de la Création

## 📋 Résumé du Bug

**Symptôme** : Lors de la création d'une nouvelle expérience avec une compétence existante (ex: "ChatGPT"), une **autre compétence** est enregistrée à la place (ex: "PowerBI").

**Gravité** : 🔴 **CRITIQUE** - Corruption de données

**Statut** : ✅ **RÉSOLU** (v1.0.4)

---

## 🔍 Analyse Détaillée

### Comportement Observé

```
Utilisateur crée une expérience avec : ChatGPT (ID attendu: 14)
Résultat dans la DB                  : PowerBI  (ID enregistré: 6)
```

### Cause Racine

**Fichier** : `src/index.tsx`, ligne 118-123

**Code Problématique** :
```typescript
const skillResult = await c.env.DB.prepare(`
  INSERT OR IGNORE INTO skills (name, category) VALUES (?, ?)
`).bind(skill.name, skill.category || 'Other').run()

if (skillResult.meta.last_row_id) {
  skillId = skillResult.meta.last_row_id  // ❌ PROBLÈME ICI
```

**Le Problème** :

Quand `INSERT OR IGNORE` n'insère rien (car la compétence existe déjà), `last_row_id` peut contenir :
- L'ID de la **dernière insertion dans la table** (n'importe quelle compétence)
- Ou `0` selon l'implémentation SQLite

Dans notre cas, `last_row_id` retournait l'ID de la dernière compétence insérée dans la table (PowerBI, ID 6), pas celui de ChatGPT (ID 14).

### Flux Problématique

```
1. Utilisateur crée expérience avec "ChatGPT"
2. Backend exécute: INSERT OR IGNORE INTO skills ... "ChatGPT"
3. ChatGPT existe déjà → aucune insertion
4. skillResult.meta.last_row_id contient l'ID de la DERNIÈRE insertion dans la table
5. Par hasard, la dernière insertion était PowerBI (ID 6)
6. Le code utilise l'ID 6 au lieu de 14
7. L'expérience est liée à PowerBI au lieu de ChatGPT ❌
```

---

## ✅ Solution Appliquée

### Nouveau Code (Corrigé)

```typescript
// First, check if skill already exists
const existing = await c.env.DB.prepare(`
  SELECT id FROM skills WHERE name = ?
`).bind(skill.name).first()

if (existing) {
  skillId = existing.id  // ✅ Utiliser l'ID existant
} else {
  // Create new skill if it doesn't exist
  const skillResult = await c.env.DB.prepare(`
    INSERT INTO skills (name, category) VALUES (?, ?)
  `).bind(skill.name, skill.category || 'Other').run()
  skillId = skillResult.meta.last_row_id
}
```

### Changements Clés

1. ✅ **SELECT d'abord** pour vérifier l'existence
2. ✅ **INSERT seulement si inexistant** (pas de `OR IGNORE`)
3. ✅ **Utilisation de l'ID existant** si trouvé
4. ✅ **Utilisation de `last_row_id`** seulement après INSERT réel

---

## 🧪 Tests de Validation

### Test 1 : Compétence Existante (ChatGPT)

**Script** : `test_create_chatgpt.sh`

```bash
./test_create_chatgpt.sh
```

**Résultat** :
```
✅ TEST RÉUSSI: ChatGPT correctement enregistré avec l'ID 14
```

**Détails** :
- Compétence envoyée : `ChatGPT` (category: AI/ML)
- ID attendu : 14
- ID enregistré : 14 ✅
- Pas de duplication ✅

### Test 2 : Compétences Mixtes

**Script** : `test_mixed_skills.sh`

**Cas de test** :
- ChatGPT (existante, ID 14)
- Python (existante, ID 4)
- NouvelleTech2026 (nouvelle, ID créé dynamiquement)

**Résultat** :
```
✅ ChatGPT correctement mappée (ID 14)
✅ Python correctement mappée (ID 4)
✅ NouvelleTech2026 créée avec nouvel ID
```

### Test 3 : Interface Web Manuelle

**Procédure** :
1. Créer une nouvelle expérience via l'interface
2. Ajouter la compétence "ChatGPT" (sélection autocomplete)
3. Sauvegarder
4. Vérifier dans l'API : `/api/experiences/{id}`

**Résultat** : ✅ ChatGPT (ID 14) correctement enregistré

---

## 📊 Impact du Bug

### Avant le Fix

| Action | Compétence Demandée | Compétence Enregistrée | Gravité |
|--------|---------------------|------------------------|---------|
| Créer exp | ChatGPT (ID 14) | PowerBI (ID 6) | 🔴 Critique |
| Créer exp | Docker (ID 9) | Autre compétence | 🔴 Critique |
| Créer exp | SAP (ID 1) | Autre compétence | 🔴 Critique |

### Après le Fix

| Action | Compétence Demandée | Compétence Enregistrée | Status |
|--------|---------------------|------------------------|--------|
| Créer exp | ChatGPT (ID 14) | ChatGPT (ID 14) | ✅ Correct |
| Créer exp | Docker (ID 9) | Docker (ID 9) | ✅ Correct |
| Créer exp | NouvelleTech | NouvelleTech (nouveau ID) | ✅ Correct |

---

## 🎯 Fichiers Modifiés

### Code Source

- **src/index.tsx** (ligne 112-130)
  - Modification de la logique de mapping des compétences
  - SELECT avant INSERT

### Tests Ajoutés

- **test_create_chatgpt.sh** - Test automatisé pour ChatGPT
- **test_mixed_skills.sh** - Test avec compétences mixtes

---

## 🚀 Déploiement du Fix

### Environnement Local (Sandbox)

```bash
# Build avec le fix
npm run build

# Redémarrer
pm2 restart career-manager

# Tester
curl http://localhost:3000/api/experiences
```

### Production (Cloudflare Pages)

```bash
# Déployer la version corrigée
npm run deploy

# Ou via GitHub
git push origin main
# Puis déploiement automatique si CI/CD configuré
```

---

## 📝 Recommandations

### Pour Éviter des Bugs Similaires

1. ✅ **Toujours faire SELECT avant INSERT** quand on utilise des données existantes
2. ✅ **Ne jamais se fier à `last_row_id`** après `INSERT OR IGNORE`
3. ✅ **Tester avec des données existantes** (pas seulement des nouvelles données)
4. ✅ **Ajouter des tests automatisés** pour chaque opération CRUD

### Tests à Effectuer Régulièrement

```bash
# Test complet des compétences
./test_create_chatgpt.sh
./test_mixed_skills.sh
./test_add_sap_skill.sh  # Test existant
```

---

## 📚 Historique des Versions

| Version | Date | Description |
|---------|------|-------------|
| **v1.0.4** | 2026-01-19 | 🐛 **Fix critique** : Correction du mapping des compétences |
| v1.0.3 | 2026-01-19 | Documentation erreurs contexte |
| v1.0.2 | 2026-01-19 | Fix JOIN skills API |
| v1.0.1 | 2026-01-19 | Fix préservation IDs lors de modification |
| v1.0.0 | 2026-01-19 | Version initiale |

---

## 🔗 Liens Utiles

- **Repository GitHub** : https://github.com/chleo-consulting/career-manager
- **Issue Tracker** : https://github.com/chleo-consulting/career-manager/issues
- **Tests** : `/test_*.sh`
- **Documentation** : `DEBUGGING_GUIDE.md`, `BUG_RESOLUTION.md`

---

## ✅ Validation Finale

**Le bug est complètement résolu. Les compétences sont maintenant correctement mappées lors de la création d'expériences.**

**Version** : 1.0.4  
**Date** : 2026-01-19  
**Status** : ✅ Résolu et testé
