#!/bin/bash

# Test de modification (PUT) d'une expérience avec compétences existantes

echo "============================================"
echo "Test PUT: Modification avec compétences existantes"
echo "============================================"

# Étape 1: Créer une expérience de test
echo -e "\n📋 Étape 1: Créer une expérience de test"

CREATE_RESPONSE=$(curl -s -X POST http://localhost:3000/api/experiences \
  -H "Content-Type: application/json" \
  -d '{
    "company": "Test PUT Company",
    "position": "Test Position",
    "start_date": "2026-01-01",
    "is_current": true,
    "skills": [{"name": "Python", "category": "Programming"}]
  }')

EXP_ID=$(echo "$CREATE_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))")
echo "✅ Expérience créée avec ID: $EXP_ID"

# Vérifier la compétence initiale
echo -e "\n📋 Compétences initiales:"
curl -s http://localhost:3000/api/experiences/$EXP_ID | python3 -c "
import sys, json
exp = json.load(sys.stdin)
for skill in exp.get('skills', []):
    print(f'  - {skill[\"name\"]} (ID: {skill.get(\"id\")})')
"

# Étape 2: Vérifier les IDs des compétences cibles
echo -e "\n📋 Étape 2: Vérifier les IDs des compétences"
SKILLS_INFO=$(curl -s http://localhost:3000/api/skills | python3 -c "
import sys, json
skills = json.load(sys.stdin)['skills']
chatgpt = next((s for s in skills if s['name'] == 'ChatGPT'), None)
docker = next((s for s in skills if s['name'] == 'Docker'), None)
print(f'ChatGPT ID: {chatgpt[\"id\"] if chatgpt else \"N/A\"}')
print(f'Docker ID: {docker[\"id\"] if docker else \"N/A\"}')
")
echo "$SKILLS_INFO"

CHATGPT_ID=$(echo "$SKILLS_INFO" | grep "ChatGPT ID" | grep -oP '\d+')
DOCKER_ID=$(echo "$SKILLS_INFO" | grep "Docker ID" | grep -oP '\d+')

echo "Attendu: ChatGPT ID=$CHATGPT_ID, Docker ID=$DOCKER_ID"

# Étape 3: Modifier l'expérience avec ChatGPT et Docker
echo -e "\n📋 Étape 3: Modifier avec ChatGPT et Docker"

cat > /tmp/test_put.json << EOF
{
  "company": "Test PUT Company (Updated)",
  "position": "Senior Developer",
  "start_date": "2026-01-01",
  "is_current": true,
  "description": "Test de modification avec nouvelles compétences",
  "skills": [
    {"name": "ChatGPT", "category": "AI/ML"},
    {"name": "Docker", "category": "DevOps"}
  ]
}
EOF

echo "Envoi de la requête PUT..."
UPDATE_RESPONSE=$(curl -s -X PUT http://localhost:3000/api/experiences/$EXP_ID \
  -H "Content-Type: application/json" \
  -d @/tmp/test_put.json)

echo "$UPDATE_RESPONSE" | python3 -m json.tool

# Attendre un peu
sleep 1

# Étape 4: Vérifier les compétences après modification
echo -e "\n📋 Étape 4: Vérifier les compétences enregistrées"

EXP_DETAILS=$(curl -s http://localhost:3000/api/experiences/$EXP_ID)

echo "$EXP_DETAILS" | python3 << PYTHON_SCRIPT
import sys, json

exp = json.load(sys.stdin)
skills = exp.get('skills', [])

print(f"\nNombre de compétences: {len(skills)}")
print("\nCompétences enregistrées:")

chatgpt_id = $CHATGPT_ID
docker_id = $DOCKER_ID

success = True
for skill in skills:
    name = skill['name']
    skill_id = skill.get('id')
    category = skill['category']
    
    print(f"  - {name} (ID: {skill_id}, Category: {category})")
    
    if name == 'ChatGPT':
        if skill_id == chatgpt_id:
            print(f"    ✅ OK - ChatGPT correctement mappé (ID {chatgpt_id})")
        else:
            print(f"    ❌ ERREUR - Attendu ID {chatgpt_id}, reçu {skill_id}")
            success = False
    elif name == 'Docker':
        if skill_id == docker_id:
            print(f"    ✅ OK - Docker correctement mappé (ID {docker_id})")
        else:
            print(f"    ❌ ERREUR - Attendu ID {docker_id}, reçu {skill_id}")
            success = False

print("\n" + "="*50)
if success:
    print("✅ TEST PUT RÉUSSI!")
else:
    print("❌ TEST PUT ÉCHOUÉ")
print("="*50)
PYTHON_SCRIPT

# Cleanup
echo -e "\n🧹 Nettoyage..."
curl -s -X DELETE http://localhost:3000/api/experiences/$EXP_ID > /dev/null
echo "Expérience $EXP_ID supprimée"

echo -e "\n============================================"
echo "Test terminé"
echo "============================================"
