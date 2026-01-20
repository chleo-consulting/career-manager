#!/bin/bash
# Script pour vérifier la version déployée de Career Manager

echo "=============================================="
echo "🔍 VERSION DÉPLOYÉE - Career Manager"
echo "=============================================="
echo ""

# Récupérer le commit actuel
COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_SHORT=$(git rev-parse --short HEAD)
COMMIT_MESSAGE=$(git log -1 --pretty=format:"%s")
COMMIT_DATE=$(git log -1 --pretty=format:"%ad" --date=format:"%Y-%m-%d %H:%M")

# Vérifier si un tag existe pour ce commit
TAG=$(git tag --points-at HEAD)

echo "📍 Commit actuel:"
echo "   Hash: $COMMIT_HASH"
echo "   Court: $COMMIT_SHORT"
echo "   Message: $COMMIT_MESSAGE"
echo "   Date: $COMMIT_DATE"
echo ""

if [ -n "$TAG" ]; then
    echo "🏷️  Version (Tag): $TAG"
else
    echo "⚠️  Aucun tag pour ce commit"
    # Trouver le dernier tag
    LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "Aucun tag")
    echo "   Dernier tag: $LAST_TAG"
fi

echo ""
echo "📦 Versions disponibles:"
git tag -l -n1

echo ""
echo "🌐 URLs:"
echo "   Application: https://3000-ieorxtkymg9b9ldepsjp5-6532622b.e2b.dev"
echo "   GitHub: https://github.com/chleo-consulting/career-manager"
echo ""
echo "=============================================="
