#!/bin/bash
# Script pour générer version.json à partir de Git

# Récupérer les informations Git
COMMIT_HASH=$(git rev-parse HEAD)
COMMIT_SHORT=$(git rev-parse --short HEAD)
TAG=$(git describe --tags --exact-match 2>/dev/null || git describe --tags --abbrev=0 2>/dev/null || echo "dev")
COMMIT_MESSAGE=$(git log -1 --pretty=format:"%s")
COMMIT_DATE=$(git log -1 --date=iso8601 --pretty=format:"%ad")
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Créer version.json
cat > dist/version.json <<EOF
{
  "version": "$TAG",
  "commit": {
    "hash": "$COMMIT_HASH",
    "short": "$COMMIT_SHORT",
    "message": "$COMMIT_MESSAGE",
    "date": "$COMMIT_DATE"
  },
  "build": {
    "date": "$BUILD_DATE"
  },
  "urls": {
    "app": "https://3000-ieorxtkymg9b9ldepsjp5-6532622b.e2b.dev",
    "github": "https://github.com/chleo-consulting/career-manager"
  }
}
EOF

echo "✅ version.json généré dans dist/"
cat dist/version.json
