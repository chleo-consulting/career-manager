#!/bin/bash

# Test de création d'une nouvelle expérience avec ChatGPT

echo "============================================"
echo "Test: Création expérience avec ChatGPT"
echo "============================================"

# Étape 1: Vérifier que ChatGPT existe dans la DB
echo -e "\n📋 Étape 1: Vérifier ChatGPT dans la base"
CHATGPT_INFO=$(curl -s http://localhost:3000/api/skills | python3 -c "
import sys, json
skills = json.load(sys.stdin)['skills']
chatgpt = next((s for s in skills if s['name'] == 'ChatGPT'), None)
if chatgpt:
    print(f\"ID: {chatgpt['id']}, Name: {chatgpt['name']}, Category: {chatgpt['category']}\")
else:
    print('ChatGPT not found')
")
echo "$CHATGPT_INFO"

CHATGPT_ID=$(echo "$CHATGPT_INFO" | grep -oP 'ID: \K\d+')
echo "ChatGPT ID: $CHATGPT_ID"

# Étape 2: Créer une nouvelle expérience avec ChatGPT
echo -e "\n📋 Étape 2: Créer nouvelle expérience avec ChatGPT"
cat > /tmp/test_create_exp.json << EOF
{
  "company": "Test Company",
  "position": "Test Position",
  "start_date": "2026-01-01",
  "end_date": "2026-12-31",
  "is_current": false,
  "description": "Test experience avec ChatGPT",
  "skills": [
    {
      "name": "ChatGPT",
      "category": "AI/ML"
    }
  ]
}
EOF

cat /tmp/test_create_exp.json

RESPONSE=$(curl -s -X POST http://localhost:3000/api/experiences \
  -H "Content-Type: application/json" \
  -d @/tmp/test_create_exp.json)

echo -e "\nRéponse API:"
echo "$RESPONSE" | python3 -m json.tool

NEW_EXP_ID=$(echo "$RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin).get('id', ''))")
echo -e "\nNouveau ID expérience: $NEW_EXP_ID"

# Étape 3: Vérifier la compétence enregistrée
echo -e "\n📋 Étape 3: Vérifier la compétence enregistrée"
sleep 1

EXP_DETAILS=$(curl -s http://localhost:3000/api/experiences/$NEW_EXP_ID)
echo "$EXP_DETAILS" | python3 -m json.tool | grep -A10 "skills"

# Extraire l'ID de la skill enregistrée
RECORDED_SKILL=$(echo "$EXP_DETAILS" | python3 -c "
import sys, json
exp = json.load(sys.stdin)
if 'skills' in exp and len(exp['skills']) > 0:
    skill = exp['skills'][0]
    print(f\"Skill enregistrée: {skill['name']} (ID: {skill.get('id', 'N/A')}, Category: {skill['category']})\")
else:
    print('Aucune skill enregistrée')
")

echo -e "\n$RECORDED_SKILL"

# Étape 4: Vérifier dans experience_skills
echo -e "\n📋 Étape 4: Vérifier la table experience_skills"
curl -s "http://localhost:3000/api/experiences/$NEW_EXP_ID" | python3 -c "
import sys, json
exp = json.load(sys.stdin)
if 'skills' in exp:
    for skill in exp['skills']:
        print(f\"  - {skill['name']} (ID: {skill.get('id', 'N/A')})\")
"

# Vérification finale
echo -e "\n============================================"
echo "🔍 VÉRIFICATION FINALE"
echo "============================================"

if echo "$RECORDED_SKILL" | grep -q "ChatGPT"; then
  if echo "$RECORDED_SKILL" | grep -q "ID: $CHATGPT_ID"; then
    echo "✅ TEST RÉUSSI: ChatGPT correctement enregistré avec l'ID $CHATGPT_ID"
  else
    echo "❌ TEST ÉCHOUÉ: ChatGPT enregistré mais avec un mauvais ID"
    echo "   Attendu: ID $CHATGPT_ID"
    echo "   Reçu: $RECORDED_SKILL"
  fi
else
  echo "❌ TEST ÉCHOUÉ: ChatGPT n'a pas été enregistré"
  echo "   Skill enregistrée: $RECORDED_SKILL"
fi

# Cleanup
echo -e "\n🧹 Nettoyage: Suppression de l'expérience de test"
curl -s -X DELETE http://localhost:3000/api/experiences/$NEW_EXP_ID
echo "Expérience $NEW_EXP_ID supprimée"
