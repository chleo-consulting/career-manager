# Guide de Débogage - Career Manager

## 🐛 Comment Déboguer les Erreurs

Ce guide vous explique comment identifier et résoudre les erreurs dans l'application Career Manager.

---

## 📋 Méthodes de Débogage

### 1. **Vérifier les Logs PM2** (Méthode Principale)

Les logs PM2 contiennent toutes les erreurs backend et les requêtes API.

#### Commandes Utiles

```bash
# Voir les dernières 50 lignes de logs
cd /home/user/webapp
pm2 logs career-manager --nostream --lines 50

# Voir les logs en temps réel (streaming)
pm2 logs career-manager

# Voir uniquement les erreurs
pm2 logs career-manager --err --nostream --lines 50

# Effacer les anciens logs
pm2 flush career-manager
```

#### Interpréter les Logs

**Format des logs** :
```
0|career-m | [wrangler:info] PUT /api/experiences/3 500 Internal Server Error (25ms)
0|career-m | ✘ [ERROR] Error updating experience: Error: D1_ERROR: FOREIGN KEY constraint failed
```

**Informations importantes** :
- **Méthode HTTP** : PUT, GET, POST, DELETE
- **Endpoint** : /api/experiences/3
- **Code HTTP** : 200 (succès), 500 (erreur serveur), 404 (non trouvé)
- **Message d'erreur** : Description détaillée du problème
- **Cause** : Stack trace avec la ligne exacte du problème

---

### 2. **Vérifier la Console du Navigateur**

Les erreurs frontend JavaScript apparaissent dans la console du navigateur.

#### Ouvrir la Console

- **Chrome/Edge** : F12 → onglet "Console"
- **Firefox** : F12 → onglet "Console"
- **Safari** : Cmd+Option+C (Mac)

#### Erreurs Courantes

```javascript
// Erreur d'enregistrement
Erreur d'enregistrement
// Détails dans Network tab

// Erreur de chargement
Error loading experiences: AxiosError
```

---

### 3. **Inspecter les Requêtes Réseau**

L'onglet Network du navigateur montre toutes les requêtes API.

#### Étapes

1. Ouvrir DevTools (F12)
2. Aller dans l'onglet **Network**
3. Filtrer par **XHR** ou **Fetch**
4. Reproduire l'erreur
5. Cliquer sur la requête en erreur
6. Vérifier :
   - **Headers** : Méthode, URL, Status
   - **Payload** : Données envoyées
   - **Response** : Réponse du serveur

**Exemple** :
```
PUT /api/experiences/3
Status: 500 Internal Server Error

Response:
{
  "error": "Failed to update experience"
}
```

---

### 4. **Tester avec cURL**

Tester les API directement en ligne de commande.

```bash
# Test GET
curl -s http://localhost:3000/api/experiences/3 | python3 -m json.tool

# Test PUT
curl -X PUT http://localhost:3000/api/experiences/3 \
  -H "Content-Type: application/json" \
  -d '{"company":"Test","position":"Dev","start_date":"2025-01-01","skills":[]}'

# Test avec affichage du status code
curl -i http://localhost:3000/api/experiences
```

---

### 5. **Vérifier la Base de Données**

Accéder directement à la base D1 locale.

```bash
# Console SQL interactive
cd /home/user/webapp
npx wrangler d1 execute career-manager-production --local

# Exécuter une requête
npx wrangler d1 execute career-manager-production --local \
  --command="SELECT * FROM experiences WHERE id=3"

# Vérifier les compétences
npx wrangler d1 execute career-manager-production --local \
  --command="SELECT * FROM skills"

# Vérifier les associations
npx wrangler d1 execute career-manager-production --local \
  --command="SELECT * FROM experience_skills WHERE experience_id=3"
```

---

## 🔍 Cas d'Erreur : "Erreur d'enregistrement"

### Symptôme
Lors de la modification d'une expérience, un message "Erreur d'enregistrement" apparaît après avoir cliqué sur "Enregistrer".

### Diagnostic

#### Étape 1 : Vérifier les Logs PM2
```bash
pm2 logs career-manager --nostream --lines 50 | grep ERROR
```

**Erreur trouvée** :
```
✘ [ERROR] Error updating experience: Error: D1_ERROR: FOREIGN KEY constraint failed: SQLITE_CONSTRAINT
```

#### Étape 2 : Comprendre l'Erreur

**FOREIGN KEY constraint failed** signifie :
- On essaie d'insérer un `skill_id` qui n'existe pas dans la table `skills`
- Ou un `experience_id` qui n'existe pas dans la table `experiences`

#### Étape 3 : Vérifier les Données

```bash
# Vérifier que l'expérience existe
npx wrangler d1 execute career-manager-production --local \
  --command="SELECT id FROM experiences WHERE id=3"

# Vérifier que les compétences existent
npx wrangler d1 execute career-manager-production --local \
  --command="SELECT id, name FROM skills WHERE id IN (1,3,4)"
```

#### Étape 4 : Identifier le Code Problématique

Vérifier la requête SQL dans `src/index.tsx` :

```typescript
// GET all skills - ERREUR ICI
app.get('/api/skills', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT s.*, COUNT(DISTINCT es.experience_id) as usage_count
    FROM skills s
    LEFT JOIN experience_skills es ON s.id = es.id  ❌ ERREUR
    GROUP BY s.id
  `).all()
})
```

**Problème** : `es.id` devrait être `es.skill_id`

#### Étape 5 : Correction

```typescript
// Correct
LEFT JOIN experience_skills es ON s.id = es.skill_id ✅
```

### Solution

1. Corriger le code dans `src/index.tsx`
2. Rebuild : `npm run build`
3. Redémarrer : `pm2 restart career-manager`
4. Tester à nouveau

---

## 🛠️ Erreurs Courantes et Solutions

### Erreur 1 : "FOREIGN KEY constraint failed"

**Cause** : Tentative d'insertion d'un ID qui n'existe pas dans la table référencée

**Solution** :
- Vérifier que les IDs existent dans les tables liées
- Corriger les requêtes JOIN
- Vérifier la logique de création/mise à jour

### Erreur 2 : "Failed to fetch experiences"

**Cause** : Erreur dans la requête SQL ou la base de données

**Solution** :
```bash
# Vérifier les migrations
npm run db:migrate:local

# Vérifier la structure
npx wrangler d1 execute career-manager-production --local \
  --command="SELECT sql FROM sqlite_master WHERE type='table'"
```

### Erreur 3 : "Cannot read property 'id' of undefined"

**Cause** : Données manquantes ou mal structurées

**Solution** :
- Ajouter des vérifications null/undefined
- Utiliser l'optional chaining `?.`
- Valider les données côté serveur

### Erreur 4 : "Port 3000 already in use"

**Cause** : Un autre processus utilise le port 3000

**Solution** :
```bash
# Tuer le processus sur le port 3000
fuser -k 3000/tcp

# Ou supprimer tous les processus PM2
pm2 delete all

# Puis redémarrer
pm2 start ecosystem.config.cjs
```

---

## 📊 Checklist de Débogage

Lorsque vous rencontrez une erreur :

- [ ] Vérifier les logs PM2 : `pm2 logs career-manager --nostream --lines 50`
- [ ] Vérifier la console du navigateur (F12)
- [ ] Inspecter l'onglet Network (F12 → Network)
- [ ] Tester l'API avec cURL
- [ ] Vérifier la base de données D1
- [ ] Lire le message d'erreur complet
- [ ] Rechercher l'erreur dans le code source
- [ ] Corriger le code
- [ ] Rebuild : `npm run build`
- [ ] Redémarrer : `pm2 restart career-manager`
- [ ] Tester à nouveau

---

## 🔗 Commandes Rapides

```bash
# Voir les logs en temps réel
pm2 logs career-manager

# Redémarrer après correction
cd /home/user/webapp
npm run build && pm2 restart career-manager

# Tester l'API
curl http://localhost:3000/api/experiences

# Vérifier la DB
npx wrangler d1 execute career-manager-production --local \
  --command="SELECT * FROM experiences LIMIT 5"

# Réinitialiser la DB (ATTENTION: efface les données)
npm run db:reset
```

---

## 📞 Support

Si l'erreur persiste :

1. Copier le message d'erreur complet des logs PM2
2. Noter les étapes pour reproduire l'erreur
3. Vérifier les commits récents : `git log --oneline -10`
4. Restaurer une version précédente si nécessaire : `git checkout <commit-id>`

---

**Dernière mise à jour** : 2026-01-19  
**Version** : 1.0.2
