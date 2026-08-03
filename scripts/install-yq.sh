#!/usr/bin/env bash
# install-yq.sh – installiert eine fest gepinnte, SHA-256-verifizierte yq-Binary (#258)
#
# Verwendung:
#   bash scripts/install-yq.sh
#       lädt die gepinnte Version, verifiziert sie und installiert sie nach /usr/local/bin/yq
#       (Schreibrecht dort nötig – in CI: `sudo bash scripts/install-yq.sh`)
#   bash scripts/install-yq.sh --verify <binary> <checksums> <checksums_hashes_order>
#       prüft nur eine bereits vorliegende Datei – netzwerkfrei, für den Self-Test
#
# Einzige Quelle der yq-Bereitstellung in CI (factory-ci.yml: `config-validation`,
# `factory-self-test`; factory-poll.yml: `factory-poll`) – kein dreifach kopierter
# wget+chmod-Block mehr. Ein Versions-Bump ändert genau eine Stelle: YQ_VERSION.
#
# Warum überhaupt: `releases/latest` ohne Checksum-Vergleich hieß, dass ein manipuliertes
# Release-Asset unbemerkt in jedem CI-Lauf ausgeführt wird – mit Zugriff auf GITHUB_TOKEN
# bzw. ANTHROPIC_API_KEY. Verifiziert wird gegen die von mikefarah/yq zum selben Release
# veröffentlichten Dateien `checksums` + `checksums_hashes_order`; eine Signaturkette
# (cosign/GPG) ist bewusst nicht Teil dieser Stufe (spec-258 §Nicht inbegriffen).
#
# Fail-closed: jeder Fehlerfall (Mismatch, fehlender Eintrag, Format-Drift, abgebrochener
# Download) bricht mit Exit ≠ 0 ab, BEVOR das Ausführbar-Bit gesetzt wird.

set -euo pipefail

YQ_VERSION="v4.53.3"
YQ_BINARY="yq_linux_amd64"
YQ_INSTALL_PATH="/usr/local/bin/yq"
# Welche Hash-Spalte der `checksums`-Datei SHA-256 ist, sagt allein
# `checksums_hashes_order` – mikefarah/yq rotiert diese Reihenfolge pro Release.
YQ_HASH_ALGO="SHA-256"

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

fail() {
  echo -e "${RED}✗${NC} install-yq: $1" >&2
  exit 1
}

sha256_of() {
  local file="$1"
  # GNU-Coreutils (Linux/CI) vs. BSD/macOS – dieselbe Prüfsumme, anderes Werkzeug.
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum -- "$file" | awk '{print $1}'
  else
    shasum -a 256 -- "$file" | awk '{print $1}'
  fi
}

# expected_sha256 <checksums> <checksums_hashes_order> <dateiname>
# Gibt den veröffentlichten SHA-256-Wert für <dateiname> auf stdout aus.
expected_sha256() {
  local checksums_file="$1" order_file="$2" target="$3"
  local algo_line entry hash

  algo_line="$(awk -v algo="$YQ_HASH_ALGO" '$1 == algo { print NR; exit }' "$order_file")"
  [ -n "$algo_line" ] ||
    fail "'$order_file' enthält keine '$YQ_HASH_ALGO'-Zeile – ohne Spaltenzuordnung keine Verifikation möglich (Abbruch)."

  # Exakter Feldvergleich, nicht Präfix-Match: die Datei enthält auch Zeilen wie
  # '${target}.tar.gz', deren Hash für eine andere Datei gilt.
  entry="$(awk -v t="$target" '$1 == t { print; exit }' "$checksums_file")"
  [ -n "$entry" ] ||
    fail "'$checksums_file' enthält keinen Eintrag für '$target' – Abbruch statt Verifikation gegen einen leeren Erwartungswert."

  # Feld 1 ist der Dateiname, danach folgen die Hashes in der Reihenfolge des
  # order_file → dessen Zeile N liegt in Feld N+1.
  hash="$(printf '%s\n' "$entry" | awk -v col="$((algo_line + 1))" '{print $col}')"
  printf '%s' "$hash" | grep -qE '^[0-9a-f]{64}$' ||
    fail "Feld $((algo_line + 1)) der Zeile '$target' ist kein SHA-256-Wert ('${hash}') – Format-Drift, Abbruch."

  printf '%s' "$hash"
}

# verify_sha256 <binary> <checksums> <checksums_hashes_order>
# Netzwerkfreier Kern: genau diese Funktion fährt der Self-Test gegen Fixtures.
verify_sha256() {
  local binary="$1" checksums_file="$2" order_file="$3"
  local file target expected actual

  for file in "$binary" "$checksums_file" "$order_file"; do
    [ -r "$file" ] || fail "Datei nicht lesbar: '$file' – keine Verifikation möglich (Abbruch)."
  done

  target="$(basename -- "$binary")"
  expected="$(expected_sha256 "$checksums_file" "$order_file" "$target")"
  actual="$(sha256_of "$binary")"
  [ "$actual" = "$expected" ] ||
    fail "Checksum-Mismatch für '$binary': erwartet $expected, berechnet ${actual:-<leer>} – Abbruch ohne chmod."

  echo -e "${GREEN}✓${NC} install-yq: SHA-256 von '$target' verifiziert ($expected)"
}

if [ "${1:-}" = "--verify" ]; then
  [ "$#" -eq 4 ] || {
    echo "Verwendung: install-yq.sh --verify <binary> <checksums> <checksums_hashes_order>" >&2
    exit 2
  }
  verify_sha256 "$2" "$3" "$4"
  exit 0
fi

DOWNLOAD_DIR="$(mktemp -d)"
trap 'rm -rf "$DOWNLOAD_DIR"' EXIT

BASE_URL="https://github.com/mikefarah/yq/releases/download/$YQ_VERSION"
echo "install-yq: lade yq $YQ_VERSION ($YQ_BINARY) …"
wget -q -O "$DOWNLOAD_DIR/$YQ_BINARY" "$BASE_URL/$YQ_BINARY"
wget -q -O "$DOWNLOAD_DIR/checksums" "$BASE_URL/checksums"
wget -q -O "$DOWNLOAD_DIR/checksums_hashes_order" "$BASE_URL/checksums_hashes_order"

verify_sha256 "$DOWNLOAD_DIR/$YQ_BINARY" "$DOWNLOAD_DIR/checksums" "$DOWNLOAD_DIR/checksums_hashes_order"

# Ausführbar-Bit erst NACH erfolgreicher Verifikation: bricht die Prüfung oben ab, wurde
# nie eine ausführbare Datei erzeugt und nichts installiert (fail-closed).
chmod 0755 "$DOWNLOAD_DIR/$YQ_BINARY"
mv -- "$DOWNLOAD_DIR/$YQ_BINARY" "$YQ_INSTALL_PATH"
"$YQ_INSTALL_PATH" --version
