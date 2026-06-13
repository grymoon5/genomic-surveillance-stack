#!/usr/bin/env bash

# Helper to add, commit, and push current changes to the repo.
# Edit the commit message or branch as needed.

set -euo pipefail

BRANCH=${1:-main}
MSG="Add deployment configs for Vercel + Render"

echo "Staging changes..."
git add .

echo "Committing..."
git commit -m "$MSG" || echo "No changes to commit"

echo "Pushing to origin/$BRANCH..."
git push origin "$BRANCH"

echo "Done. If the push failed, ensure you have the correct remote and permissions."
