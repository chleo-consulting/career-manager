#!/bin/bash

# Test complet: Création d'une expérience avec plusieurs skills existantes et nouvelles

echo "============================================"
echo "Test Complet: Création avec skills mixtes"
echo "============================================"

# Créer une nouvelle expérience avec :
# - ChatGPT (existante, ID 14)
# - Python (existante, ID 4)  
# - NouvelleTech (nouvelle)

echo -e "\n📋 Test: Créer expérience avec 3 skills (2 existantes + 1 nouvelle)"

cat > /tmp/test_mixed_skills.json << 'EOF'
{
  "company": "Test Mixte Co",
  "position": "Data Scientist",
  "start_date": "2026-01-01",
  "end_date": "2026-12-31",
  "is_current": false,
  "description": "Test avec skills mixtes",
  "skills": [
    {
      "name": "ChatGPT",
      "category": "AI/ML"
    },
    {
      "name": "Python",
      "category": "Programming"
    },
    {
      "name": "NouvelleTech2026",
      "category": "Emerging"
    }
  ]
}
EOF

# Afficher la requête
cat /tmp/test_mixed_skills.json

# Créer l'expérience
echo -e "\n\n🚀 Envoi de la requête..."
RESPONSE=$(curl -s -X POST http://localhost:3000/api/experiences \
  -H "Content-Type: application/json" \
  -d @/tmp/test_mixed_skills.json)

echo "$RESPONSE" | python3 -m json.tool

NEW_EXP_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))")
echo -e "\n✅ Expérience créée avec ID: $NEW_EXP_ID"

# Attendre un peu
sleep 1

# Vérifier les skills enregistrées
echo -e "\n📋 Vérification des skills enregistrées:"
EXP_DETAILS=$(curl -s http://localhost:3000/api/experiences/$NEW_EXP_ID)

echo "$EXP_DETAILS" | python3 << 'PYTHON_SCRIPT'
import sys, json

exp = json.load(sys.stdin)
skills = exp.get('skills', [])

print(f"\nNombre de skills: {len(skills)}")
print("\nDétails:")

expected = {
    'ChatGPT': 14,
    'Python': 4,
    'NouvelleTech2026': None  # ID inconnu car nouvelle
}

success = True
for skill in skills:
    name = skill['name']
    skill_id = skill.get('id')
    category = skill['category']
    
    print(f"  - {name} (ID: {skill_id}, Category: {category})")
    
    if name in expected:
        if expected[name] is not None and skill_id != expected[name]:
            print(f"    ❌ ERREUR: Attendu ID {expected[name]}, reçu {skill_id}")
            success = False
        else:
            print(f"    ✅ OK")

if success:
    print("\n✅ TOUS LES TESTS RÉUSSIS!")
else:
    print("\n❌ CERTAINS TESTS ONT ÉCHOUÉ")
PYTHON_SCRIPT

# Cleanup
echo -e "\n\n🧹 Nettoyage..."
curl -s -X DELETE http://localhost:3000/api/experiences/$NEW_EXP_ID > /dev/null
echo "Expérience $NEW_EXP_ID supprimée"

echo -e "\n============================================"
echo "Test terminé"
echo "============================================"
