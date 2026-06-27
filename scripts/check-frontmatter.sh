#!/usr/bin/env bash
set -euo pipefail
f="${1:?uso: check-frontmatter.sh <arquivo.md>}"
req=(title status version updated scope relates_to type)
# extrai bloco entre as duas primeiras linhas '---'
fm="$(awk 'NR==1&&$0!="---"{exit 1} NR==1{next} $0=="---"{exit} {print}' "$f")" || { echo "FALHA: $f não inicia com frontmatter ---"; exit 1; }
miss=()
for k in "${req[@]}"; do echo "$fm" | grep -qE "^${k}:" || miss+=("$k"); done
if ((${#miss[@]})); then echo "FALHA: $f faltando: ${miss[*]}"; exit 1; fi
echo "OK: $f"
