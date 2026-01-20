# 🧪 Tests Career Manager

Ce répertoire contient tous les tests pour Career Manager.

## 📁 Structure

```
tests/
├── integration/     # Tests d'intégration (API, end-to-end)
└── unit/           # Tests unitaires (réservé pour le futur)
```

## 🔍 Tests d'Intégration

Les tests d'intégration valident le bon fonctionnement de l'API et des interactions entre les différents composants.

### Tests Disponibles

#### 1. Test d'Ajout de Compétence Existante
**Fichier** : `integration/test_add_sap_skill.sh`

**Objectif** : Vérifier que l'ajout d'une compétence existante (SAP) à une expérience réutilise correctement la compétence sans créer de doublon.

**Exécution** :
```bash
cd /home/user/webapp
./tests/integration/test_add_sap_skill.sh
```

**Ce qui est testé** :
- ✅ La compétence existante est réutilisée (pas de création de doublon)
- ✅ L'ID de la compétence est préservé
- ✅ L'association est correctement enregistrée dans la base
- ✅ Aucune duplication n'est créée dans la table `skills`

#### 2. Test de Création avec ChatGPT
**Fichier** : `integration/test_create_chatgpt.sh`

**Objectif** : Tester la création d'une nouvelle expérience avec des compétences existantes.

**Exécution** :
```bash
cd /home/user/webapp
./tests/integration/test_create_chatgpt.sh
```

#### 3. Test de Compétences Mixtes
**Fichier** : `integration/test_mixed_skills.sh`

**Objectif** : Tester l'ajout de compétences mixtes (existantes et nouvelles).

**Exécution** :
```bash
cd /home/user/webapp
./tests/integration/test_mixed_skills.sh
```

#### 4. Test PUT Skills
**Fichier** : `integration/test_put_skills.sh`

**Objectif** : Tester la mise à jour des compétences d'une expérience.

**Exécution** :
```bash
cd /home/user/webapp
./tests/integration/test_put_skills.sh
```

#### 5. Test Node.js d'Ajout SAP
**Fichier** : `integration/test_add_sap_skill.cjs`

**Objectif** : Version Node.js du test d'ajout de compétence SAP.

**Exécution** :
```bash
cd /home/user/webapp
node ./tests/integration/test_add_sap_skill.cjs
```

## ✅ Résultats Attendus

Tous les tests doivent retourner un code de sortie `0` et afficher des messages de succès :

```
✅ La compétence SAP existante (ID: 1) a été ajoutée
✅ Aucune duplication n'a été créée
✅ L'ID de la compétence est correct
✅ L'association est enregistrée dans la base
```

## 🐛 En Cas d'Échec

Si un test échoue :

1. **Vérifier que le serveur est lancé** :
   ```bash
   pm2 status
   ```

2. **Consulter les logs** :
   ```bash
   pm2 logs career-manager --nostream
   ```

3. **Vérifier la base de données** :
   ```bash
   npx wrangler d1 execute career-manager --local --command "SELECT * FROM skills;"
   ```

4. **Consulter le guide de débogage** : [../docs/guides/DEBUGGING_GUIDE.md](../docs/guides/DEBUGGING_GUIDE.md)

## 🔮 Tests Unitaires (À Venir)

Le répertoire `unit/` est réservé pour les futurs tests unitaires qui testeront les fonctions individuelles et les modules isolés.

## 📊 Résultats des Tests

Les résultats détaillés des tests sont documentés dans :
- [../docs/troubleshooting/TEST_RESULTS.md](../docs/troubleshooting/TEST_RESULTS.md)
- [../docs/troubleshooting/TEST_SUMMARY.md](../docs/troubleshooting/TEST_SUMMARY.md)

## 🔙 Retour

Retour à la [documentation principale](../README.md)
