#!/bin/bash

# Test unitaire : Ajout de la compétence existante "SAP" à l'expérience "tefdf"
# Objectif : Vérifier que la compétence existante est correctement réutilisée (pas de duplication)

set -e  # Exit on error

API_URL="http://localhost:3000"
EXPERIENCE_ID=3
SKILL_ID=1
SKILL_NAME="SAP"

echo "========================================"
echo "🧪 TEST UNITAIRE - Ajout Compétence SAP"
echo "========================================"
echo ""

# Couleurs pour output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Fonction pour afficher les résultats
print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ️  $1${NC}"
}

# ÉTAPE 1 : Récupérer l'état initial de l'expérience
echo "📋 ÉTAPE 1 : Récupération de l'expérience 'tefdf' (ID: $EXPERIENCE_ID)"
INITIAL_DATA=$(curl -s "$API_URL/api/experiences/$EXPERIENCE_ID")
INITIAL_SKILLS=$(echo "$INITIAL_DATA" | python3 -c "import sys, json; data=json.load(sys.stdin); print(json.dumps(data['skills'], indent=2))")

echo "État initial des compétences :"
echo "$INITIAL_SKILLS"
echo ""

# ÉTAPE 2 : Vérifier que SAP existe dans la base
echo "🔍 ÉTAPE 2 : Vérification que la compétence 'SAP' existe (ID: $SKILL_ID)"
SAP_EXISTS=$(curl -s "$API_URL/api/skills" | python3 -c "import sys, json; data=json.load(sys.stdin); skills=[s for s in data['skills'] if s['id']==$SKILL_ID and s['name']=='$SKILL_NAME']; print('yes' if skills else 'no')")

if [ "$SAP_EXISTS" = "yes" ]; then
    print_success "La compétence SAP existe bien dans la base avec l'ID $SKILL_ID"
else
    print_error "La compétence SAP n'existe pas dans la base"
    exit 1
fi
echo ""

# ÉTAPE 3 : Compter le nombre total de compétences SAP avant modification
echo "📊 ÉTAPE 3 : Comptage des compétences 'SAP' dans la base"
SAP_COUNT_BEFORE=$(curl -s "$API_URL/api/skills" | python3 -c "import sys, json; data=json.load(sys.stdin); print(sum(1 for s in data['skills'] if s['name']=='$SKILL_NAME'))")
print_info "Nombre de compétences 'SAP' dans la base AVANT : $SAP_COUNT_BEFORE"
echo ""

# ÉTAPE 4 : Préparer la mise à jour avec ajout de SAP
echo "✏️  ÉTAPE 4 : Préparation de la mise à jour avec ajout de SAP"

# Extraire les données actuelles de l'expérience
COMPANY=$(echo "$INITIAL_DATA" | python3 -c "import sys, json; print(json.load(sys.stdin)['company'])")
POSITION=$(echo "$INITIAL_DATA" | python3 -c "import sys, json; print(json.load(sys.stdin)['position'])")
LOCATION=$(echo "$INITIAL_DATA" | python3 -c "import sys, json; loc=json.load(sys.stdin).get('location'); print(loc if loc else '')")
START_DATE=$(echo "$INITIAL_DATA" | python3 -c "import sys, json; print(json.load(sys.stdin)['start_date'])")
END_DATE=$(echo "$INITIAL_DATA" | python3 -c "import sys, json; ed=json.load(sys.stdin).get('end_date'); print(ed if ed else '')")
IS_CURRENT=$(echo "$INITIAL_DATA" | python3 -c "import sys, json; ic=json.load(sys.stdin)['is_current']; print('true' if ic else 'false')")
DESCRIPTION=$(echo "$INITIAL_DATA" | python3 -c "import sys, json; desc=json.load(sys.stdin).get('description'); print(desc if desc else '')")
ACHIEVEMENTS=$(echo "$INITIAL_DATA" | python3 -c "import sys, json; ach=json.load(sys.stdin).get('achievements'); print(ach if ach else '')")

# Extraire les compétences existantes
EXISTING_SKILLS=$(echo "$INITIAL_DATA" | python3 -c "
import sys, json
data = json.load(sys.stdin)
skills = []
for skill in data.get('skills', []):
    skills.append({
        'id': skill['id'],
        'name': skill['name'],
        'category': skill['category']
    })
print(json.dumps(skills))
")

# Créer le JSON de mise à jour avec SAP ajouté
UPDATE_JSON=$(python3 << EOF
import json

skills = json.loads('$EXISTING_SKILLS')

# Vérifier si SAP n'est pas déjà dans les compétences
has_sap = any(s['id'] == $SKILL_ID for s in skills)

if not has_sap:
    # Ajouter SAP avec son ID existant
    skills.append({
        'id': $SKILL_ID,
        'name': '$SKILL_NAME',
        'category': 'ERP & Data Platforms'
    })

update_data = {
    'company': '$COMPANY',
    'position': '$POSITION',
    'location': '$LOCATION' if '$LOCATION' else None,
    'start_date': '$START_DATE',
    'end_date': '$END_DATE' if '$END_DATE' else None,
    'is_current': '$IS_CURRENT' == 'true',
    'description': '$DESCRIPTION' if '$DESCRIPTION' else None,
    'achievements': '$ACHIEVEMENTS' if '$ACHIEVEMENTS' else None,
    'skills': skills
}

print(json.dumps(update_data, indent=2))
EOF
)

echo "Payload à envoyer :"
echo "$UPDATE_JSON" | head -20
echo "..."
echo ""

# ÉTAPE 5 : Effectuer la mise à jour
echo "🚀 ÉTAPE 5 : Envoi de la mise à jour à l'API"
UPDATE_RESPONSE=$(curl -s -X PUT "$API_URL/api/experiences/$EXPERIENCE_ID" \
    -H "Content-Type: application/json" \
    -d "$UPDATE_JSON")

echo "Réponse API : $UPDATE_RESPONSE"

if echo "$UPDATE_RESPONSE" | grep -q "successfully"; then
    print_success "Mise à jour effectuée avec succès"
else
    print_error "Échec de la mise à jour"
    exit 1
fi
echo ""

# ÉTAPE 6 : Vérifier que SAP est maintenant associé à l'expérience
echo "🔎 ÉTAPE 6 : Vérification que SAP est bien associé à l'expérience"
sleep 1  # Attendre que la DB soit à jour

UPDATED_DATA=$(curl -s "$API_URL/api/experiences/$EXPERIENCE_ID")
HAS_SAP=$(echo "$UPDATED_DATA" | python3 -c "
import sys, json
data = json.load(sys.stdin)
has_sap = any(s['id'] == $SKILL_ID and s['name'] == '$SKILL_NAME' for s in data.get('skills', []))
print('yes' if has_sap else 'no')
")

if [ "$HAS_SAP" = "yes" ]; then
    print_success "La compétence SAP est bien associée à l'expérience 'tefdf'"
else
    print_error "La compétence SAP n'a PAS été associée à l'expérience"
    exit 1
fi

UPDATED_SKILLS=$(echo "$UPDATED_DATA" | python3 -c "import sys, json; data=json.load(sys.stdin); print(json.dumps(data['skills'], indent=2))")
echo "Compétences après mise à jour :"
echo "$UPDATED_SKILLS"
echo ""

# ÉTAPE 7 : Vérifier qu'aucune duplication n'a été créée
echo "🔍 ÉTAPE 7 : Vérification de l'absence de duplication"
SAP_COUNT_AFTER=$(curl -s "$API_URL/api/skills" | python3 -c "import sys, json; data=json.load(sys.stdin); print(sum(1 for s in data['skills'] if s['name']=='$SKILL_NAME'))")
print_info "Nombre de compétences 'SAP' dans la base APRÈS : $SAP_COUNT_AFTER"

if [ "$SAP_COUNT_BEFORE" -eq "$SAP_COUNT_AFTER" ]; then
    print_success "Aucune duplication : le nombre de compétences SAP est resté identique ($SAP_COUNT_BEFORE → $SAP_COUNT_AFTER)"
else
    print_error "DUPLICATION DÉTECTÉE : le nombre de compétences SAP a changé ($SAP_COUNT_BEFORE → $SAP_COUNT_AFTER)"
    exit 1
fi
echo ""

# ÉTAPE 8 : Vérifier que l'ID de SAP est bien celui attendu
echo "🆔 ÉTAPE 8 : Vérification de l'ID de la compétence SAP"
SAP_ID_IN_EXPERIENCE=$(echo "$UPDATED_DATA" | python3 -c "
import sys, json
data = json.load(sys.stdin)
sap_skill = next((s for s in data.get('skills', []) if s['name'] == '$SKILL_NAME'), None)
print(sap_skill['id'] if sap_skill else 'not_found')
")

if [ "$SAP_ID_IN_EXPERIENCE" = "$SKILL_ID" ]; then
    print_success "L'ID de SAP dans l'expérience est correct : $SKILL_ID"
else
    print_error "L'ID de SAP dans l'expérience est incorrect : attendu $SKILL_ID, obtenu $SAP_ID_IN_EXPERIENCE"
    exit 1
fi
echo ""

# RÉSULTAT FINAL
echo "========================================"
echo -e "${GREEN}✅ TEST RÉUSSI !${NC}"
echo "========================================"
echo ""
echo "Résumé des vérifications :"
echo "  ✅ La compétence SAP existante (ID: $SKILL_ID) a été ajoutée"
echo "  ✅ Aucune duplication n'a été créée"
echo "  ✅ L'ID de la compétence est correct"
echo "  ✅ L'association est enregistrée dans la base"
echo ""
echo "🎉 Le bug de mapping est bien corrigé !"
