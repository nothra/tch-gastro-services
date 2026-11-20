#!/usr/bin/env bash
# dependency-floor-tests.sh – Abhängigkeits-Floor-Tests zu pnpm-workspace.yaml/package.json/pnpm-lock.yaml (#428, AK2.18b)
#
# Wird von run-project-tests.sh gesourct (teilt PASS/FAIL und die Prüf-Helfer), nie direkt ausgeführt.
# Die Fälle stammen aus #291/#337/#339/#390/#412/#444/#447/#448 und prüfen TCH-Abhängigkeiten, nicht die
# Factory – sie lagen bis #428 in der Factory-Suite (run-tests.sh) und sind hier byte-identisch verschoben.

# ─── #291/#337: Dependency-Security-Floors (Dependabot-Alerts) ───────────────
# Die Alerts aus #291 sind über einen next-Bump plus konditionale Overrides in
# pnpm-workspace.yaml geschlossen. Ohne Guard rutscht eine dieser Auflösungen bei der
# nächsten Lockfile-Erneuerung lautlos wieder unter ihren Patch-Floor zurück. Geprüft wird
# deshalb die im Lockfile AUFGELÖSTE Version (Spec-291: ein Override wirkt erst, wenn er im
# Lockfile ankommt), nicht die Deklaration in package.json.
# #337 hat denselben Guard weitergenutzt statt einen zweiten daneben zu stellen: die Floors
# von sharp und js-yaml sind ANGEHOBEN (Muster „Floor angehoben statt zweiter Eintrag daneben",
# #169/#291), browserslist/baseline-browser-mapping/vitest/@vitest/mocker sind als Fälle
# ergänzt, und der next-Pin-Floor steht auf 16.3.3 (GHSA-2xp9-vwfh-vxw4, GHSA-p293-qw3h-jr36).
# #339 nutzt denselben Guard ebenso weiter: drei brace-expansion-Fälle für die 3er- und die
# 4.x/5.x-Linie. Die Floors kommen beide aus GHSA-rgw5-rvv9-x895 (5.0.9 bzw. 3.0.6);
# GHSA-mh99-v99m-4gvg liegt mit 5.0.8 / 3.0.3 darunter und ist damit mitgedeckt.
# #390 hebt die Floors erneut statt Fälle daneben zu stellen: brace-expansion auf
# 1.1.21 / 2.1.7 / 3.0.9 / 5.0.12 (GHSA-q2hr-2g5m-vwhr; schließt GHSA-qhr7-859c-m2p7 und
# GHSA-6j4f-fj2g-mc7p mit niedrigeren Floors ein), undici auf 7.29.1 (GHSA-w293-vg96-wgc3 u. a.)
# und den next-Pin-Floor auf 16.3.6 (GHSA-vcvr-r3jv-pc5j, kritische RCE in next/og).
echo "#291/#337 Dependency-Security-Floors (aufgelöste Lockfile-Versionen):"

LOCKFILE_291="$FACTORY_ROOT/pnpm-lock.yaml"
PKG_JSON_291="$FACTORY_ROOT/package.json"
WORKSPACE_YAML_291="$FACTORY_ROOT/pnpm-workspace.yaml"

# Fail-closed: ohne lesbare Quellen ist keine Aussage möglich – ein stiller Leer-Durchlauf
# wäre grün aus dem falschen Grund (Lesson testing.md, #214).
assert_true "$([ -r "$LOCKFILE_291" ] && [ -r "$PKG_JSON_291" ] && [ -r "$WORKSPACE_YAML_291" ]; echo $?)" \
  "#291: pnpm-lock.yaml, package.json und pnpm-workspace.yaml sind lesbar (Voraussetzung der Floor-Prüfung)"

# lock_versions_291 <paket> <major> <lockfile> – alle aufgelösten Versionen des Pakets
# innerhalb EINER Major-Linie, aufsteigend sortiert, eine je Zeile. Die Major-Linie gehört zum
# Schlüssel, weil derselbe Paketname mehrfach mit unterschiedlichen Floors im Baum liegt
# (brace-expansion trägt in 1.x, 2.x, 3.x und 4.x/5.x je eigene Floors). Peer-Suffixe wie
# "(react@19.2.4)" und der abschließende Doppelpunkt werden abgeschnitten.
# Scoped-Pakete schreibt pnpm quotiert ('@vitest/mocker@4.1.11':) – die Quotes fallen vorab
# aus dem Strom, sonst liefe der Fall lautlos ins Leere (kein Treffer = scheinbar sauber, #337).
lock_versions_291() {
  tr -d "'" < "$3" | grep -E "^  $1@$2\." | sed -E "s|^  $1@||; s|[(:].*$||" | sort -u -V
}

# version_below_291 <version> <floor> – 0, wenn version echt kleiner als floor ist.
version_below_291() {
  [ "$1" != "$2" ] && [ "$(printf '%s\n%s\n' "$1" "$2" | sort -V | head -1)" = "$1" ]
}

# versions_below_floor_291 <paket> <major> <floor> <lockfile> – gibt die aufgelösten
# Versionen unterhalb des Floors aus (leer = sauber). Kein Fund bei komplett fehlendem Paket
# ist korrekt: dann existiert auch keine verwundbare Kopie mehr.
versions_below_floor_291() {
  local v below=""
  while read -r v; do
    [ -n "$v" ] || continue
    version_below_291 "$v" "$3" && below="$below $v"
  done <<< "$(lock_versions_291 "$1" "$2" "$4")"
  printf '%s' "$below"
}

# Format: "<paket>|<major>|<floor>|<herkunft im Baum>"
# #339: die 4.x/5.x-Linie deckt EIN Override-Selektor (seit #390 >=4.0.0 <5.0.12) ab, hier stehen aber
# DREI Fälle, weil lock_versions_291 je Major-Linie filtert (grep "^  <paket>@<major>\.") und
# ein Fall damit nur seine eigene Linie sieht. Gemessen wird allein vom Major-5-Fall: er traf
# im RED-Lauf die real aufgelöste 5.0.7, während der Major-4-Fall prompt grün war. Die Fälle
# für Major 4 und 3 sind Vorsorge gegen ein künftiges Hereinziehen – heute löst der Baum in
# beiden Linien keine Kopie auf (minimatch@10 deklariert ^5.0.5 und kann selbst keine 4.x
# ziehen). Für Major 3 ist dieser Fall die EINZIGE Deckung: die 3er-Linie hat bewusst keinen
# Override-Selektor (Begründung in pnpm-workspace.yaml), eine 3.0.x zöge sonst still ein.
# #390: dieselbe Lage für undici@6.x – der Selektor ist seit #390 auf >=7.0.0 begrenzt, der
# Major-6-Fall ist damit die EINZIGE Deckung der 6er-Linie (eigener Fix 6.28.1, GHSA-r53p-7pc4-xj5r;
# die übrigen fünf undici-Advisories aus #390 betreffen 6.x nicht).
# #447: GHSA-xjj6-f33q-929c hebt die Floors auf 6.29.1 / 7.30.1 / 8.12.2. Der Selektor reicht
# nach oben nur bis <7.30.1, der Major-8-Fall ist damit – wie der Major-6-Fall – die EINZIGE
# Deckung seiner Linie (heute keine 8.x-Kopie im Baum; jsdom 30 würde auf ^8 wechseln).
# #444: vitest/@vitest/mocker auf 4.1.12 (GHSA-qxg6-89mg-rqv8, GHSA-xp26-3454-mjgp), neu vite
# auf 8.1.6 (GHSA-rq7h-c2jc-7f22, GHSA-9jrq-w75r-8gcw und die im vite-Bundle steckenden
# launch-editor-Advisories GHSA-r825-w8mm-5pxw, GHSA-587h-7wmj-h5pm, GHSA-698v-4r3x-3vcv).
# @vitest/coverage-v8 trägt keinen eigenen Advisory, erwartet vitest aber versionsgleich als Peer.
floor_cases_291=(
  "postcss|8|8.5.23|runtime, via next"
  "nanoid|3|3.3.17|runtime, via postcss"
  "brace-expansion|1|1.1.21|runtime, via minimatch@3, Floor aus #390"
  "brace-expansion|2|2.1.7|runtime, via minimatch@5, Floor aus #390"
  "brace-expansion|3|3.0.9|Vorsorge, heute keine 3.x-Kopie im Baum, kein Override-Selektor (#339/#390)"
  "brace-expansion|4|5.0.12|Vorsorge, heute keine 4.x-Kopie im Baum, Floor in der 5er-Linie (#339/#390)"
  "brace-expansion|5|5.0.12|development, via minimatch@10 (typescript-eslint), Floor aus #390"
  "sharp|0|0.35.4|runtime, via next (Bildoptimierung), Floor aus #337"
  "undici|6|6.29.1|Vorsorge, heute keine 6.x-Kopie im Baum, kein Override-Selektor (#390), Floor aus #447"
  "undici|7|7.30.1|development, via jsdom, Floor aus #447"
  "undici|8|8.12.2|Vorsorge, heute keine 8.x-Kopie im Baum, kein Override-Selektor (#447)"
  "js-yaml|4|4.3.2|development, via eslint, Floor aus #337"
  "browserslist|4|4.28.7|runtime, via next, Floor aus #337/#329"
  "baseline-browser-mapping|2|2.11.0|runtime, via browserslist/caniuse, Floor aus #337"
  "vitest|4|4.1.12|development, direkt deklariert, Floor aus #444"
  "@vitest/coverage-v8|4|4.1.12|development, direkt deklariert, Gleichschritt mit vitest (#444)"
  "@vitest/mocker|4|4.1.12|development, via vitest, Floor aus #444"
  "vite|8|8.1.6|development, via vitest/@vitejs/plugin-react, Floor aus #444"
  "source-map-js|1|1.2.2|runtime-Build + development, via postcss/css-tree/magicast, Floor aus #412"
)

for case_291 in "${floor_cases_291[@]}"; do
  IFS='|' read -r pkg_291 major_291 floor_291 herkunft_291 <<< "$case_291"
  below_291="$(versions_below_floor_291 "$pkg_291" "$major_291" "$floor_291" "$LOCKFILE_291")"
  assert_true "$([ -z "$below_291" ]; echo $?)" \
    "#291/#337 AK3/AK4/AK6: keine aufgelöste ${pkg_291}@${major_291}.x-Kopie unter ${floor_291} (${herkunft_291})${below_291:+ – gefunden:${below_291}}"
done

# Mutationsbeleg für den Floor-Vergleich: dieselbe Extraktions-/Vergleichskette gegen eine
# Fixture mit einer bewusst zu alten Kopie MUSS anschlagen. Ohne diesen Beleg wiese ein
# tippfehlerhaftes Extraktionsmuster (das nie etwas findet) sieben grüne, vakuose Tests aus.
mut_lock_291="$(mktemp)"
printf '  postcss@8.5.16:\n  postcss@8.5.23:\n' > "$mut_lock_291"
mut_below_291="$(versions_below_floor_291 postcss 8 8.5.23 "$mut_lock_291")"
assert_true "$([ "$mut_below_291" = " 8.5.16" ]; echo $?)" \
  "#291 Mutationsbeleg: Floor-Kette meldet auf einer Fixture mit postcss@8.5.16 genau diese Version (ist: '${mut_below_291}')"
rm -f "$mut_lock_291"

# Mutationsbeleg für die #339-Vorsorge-Fälle (Major 3 und Major 4): der Baum löst heute in
# beiden Linien keine Kopie auf, die Fälle sind im Ist-Lauf also zwangsläufig grün, ohne etwas
# zu messen (Lesson testing.md, #319 – In-Suite-Diskriminierungs-Kontrolle statt nur behaupteter
# Deckung). Je Fall eine Fixture mit einer Kopie unter dem Floor MUSS anschlagen, sonst wäre ein
# Tippfehler in Paketname/Major dauerhaft unsichtbar.
mut_vorsorge3_339="$(mktemp)"
printf '  brace-expansion@3.0.1:\n  brace-expansion@3.0.6:\n' > "$mut_vorsorge3_339"
mut_vorsorge3_below_339="$(versions_below_floor_291 brace-expansion 3 3.0.6 "$mut_vorsorge3_339")"
assert_true "$([ "$mut_vorsorge3_below_339" = " 3.0.1" ]; echo $?)" \
  "#339 Mutationsbeleg: Major-3-Vorsorge-Fall meldet auf einer Fixture mit brace-expansion@3.0.1 genau diese Version (ist: '${mut_vorsorge3_below_339}')"
mut_vorsorge3_clean_339="$(versions_below_floor_291 brace-expansion 3 3.0.1 "$mut_vorsorge3_339")"
assert_true "$([ -z "$mut_vorsorge3_clean_339" ]; echo $?)" \
  "#339 Diskriminierungs-Kontrolle: dieselbe Fixture ist gegen Floor 3.0.1 sauber (ist: '${mut_vorsorge3_clean_339}')"
rm -f "$mut_vorsorge3_339"

# Major-4-Fall zusätzlich mit einer 5.x-Nachbarzeile in derselben Fixture: belegt neben dem
# Floor-Vergleich auch, dass lock_versions_291 die Major-Linien trennt (die 5.0.12-Zeile darf
# beim Major-4-Filter nicht mitzählen, sonst wäre die Vorsorge-Zeile aus dem falschen Grund grün).
mut_vorsorge4_339="$(mktemp)"
printf '  brace-expansion@4.0.0:\n  brace-expansion@5.0.12:\n' > "$mut_vorsorge4_339"
mut_vorsorge4_below_339="$(versions_below_floor_291 brace-expansion 4 5.0.9 "$mut_vorsorge4_339")"
assert_true "$([ "$mut_vorsorge4_below_339" = " 4.0.0" ]; echo $?)" \
  "#339 Mutationsbeleg: Major-4-Vorsorge-Fall meldet auf einer Fixture mit brace-expansion@4.0.0 genau diese Version, nicht die 5.x-Nachbarzeile (ist: '${mut_vorsorge4_below_339}')"
mut_vorsorge4_clean_339="$(versions_below_floor_291 brace-expansion 5 5.0.9 "$mut_vorsorge4_339")"
assert_true "$([ -z "$mut_vorsorge4_clean_339" ]; echo $?)" \
  "#339 Diskriminierungs-Kontrolle: dieselbe Fixture ist für den Major-5-Filter gegen Floor 5.0.9 sauber (5.0.12 liegt darüber) (ist: '${mut_vorsorge4_clean_339}')"
rm -f "$mut_vorsorge4_339"

# Mutationsbeleg für den #412-Fall source-map-js: eine 1.2.1-Kopie neben 1.2.2 MUSS anschlagen,
# die 1.2.2-Nachbarzeile darf nicht mitzählen (sonst wäre der Ist-Lauf aus dem falschen Grund grün).
mut_smj_412="$(mktemp)"
printf '  source-map-js@1.2.1:\n  source-map-js@1.2.2:\n' > "$mut_smj_412"
mut_smj_below_412="$(versions_below_floor_291 source-map-js 1 1.2.2 "$mut_smj_412")"
assert_true "$([ "$mut_smj_below_412" = " 1.2.1" ]; echo $?)" \
  "#412 Mutationsbeleg: source-map-js-Fall meldet auf einer Fixture mit 1.2.1 genau diese Version, nicht die 1.2.2-Nachbarzeile (ist: '${mut_smj_below_412}')"
mut_smj_clean_412="$(versions_below_floor_291 source-map-js 1 1.2.1 "$mut_smj_412")"
assert_true "$([ -z "$mut_smj_clean_412" ]; echo $?)" \
  "#412 Diskriminierungs-Kontrolle: dieselbe Fixture ist gegen Floor 1.2.1 sauber – der Guard schlägt nur unter dem Floor an (ist: '${mut_smj_clean_412}')"
rm -f "$mut_smj_412"

# Mutationsbeleg für den #390-Vorsorge-Fall undici@6.x, nach dem Muster des Major-4-Falls: die
# 7.30.0-Nachbarzeile belegt zusätzlich die Trennung der Major-Linien – sie darf beim Major-6-
# Filter nicht mitzählen, sonst wäre der Ist-Lauf aus dem falschen Grund grün.
# #447: der Floor steigt auf 6.29.1, die Fixture-Version 6.28.0 liegt weiter darunter – der
# Beleg läuft gegen den aktuellen Floor, nicht gegen den historischen 6.28.1.
mut_vorsorge6_390="$(mktemp)"
printf '  undici@6.28.0:\n  undici@7.30.0:\n' > "$mut_vorsorge6_390"
mut_vorsorge6_below_390="$(versions_below_floor_291 undici 6 6.29.1 "$mut_vorsorge6_390")"
assert_true "$([ "$mut_vorsorge6_below_390" = " 6.28.0" ]; echo $?)" \
  "#390 Mutationsbeleg: undici-Major-6-Vorsorge-Fall meldet auf einer Fixture mit undici@6.28.0 genau diese Version, nicht die 7.x-Nachbarzeile (ist: '${mut_vorsorge6_below_390}')"
mut_vorsorge6_clean_390="$(versions_below_floor_291 undici 6 6.28.0 "$mut_vorsorge6_390")"
assert_true "$([ -z "$mut_vorsorge6_clean_390" ]; echo $?)" \
  "#390 Diskriminierungs-Kontrolle: dieselbe Fixture ist für den Major-6-Filter gegen Floor 6.28.0 sauber (ist: '${mut_vorsorge6_clean_390}')"
rm -f "$mut_vorsorge6_390"

# #447: 6.29.0 liegt zwischen altem (6.28.1) und neuem Floor (6.29.1) – nur der neue Floor meldet sie.
mut_major6_447="$(mktemp)"
printf '  undici@6.29.0:\n' > "$mut_major6_447"
mut_major6_new_447="$(versions_below_floor_291 undici 6 6.29.1 "$mut_major6_447")"
assert_true "$([ "$mut_major6_new_447" = " 6.29.0" ]; echo $?)" \
  "#447 Mutationsbeleg: undici-Major-6-Fall meldet 6.29.0 gegen den neuen Floor 6.29.1 (ist: '${mut_major6_new_447}')"
mut_major6_old_447="$(versions_below_floor_291 undici 6 6.28.1 "$mut_major6_447")"
assert_true "$([ -z "$mut_major6_old_447" ]; echo $?)" \
  "#447 Diskriminierungs-Kontrolle: 6.29.0 ist gegen den alten Floor 6.28.1 sauber – erst der Bump fängt sie (ist: '${mut_major6_old_447}')"
rm -f "$mut_major6_447"

# Mutationsbeleg für den #447-Floor der 7er-Linie: 7.30.0 ist genau die Version, die vor #447
# im Baum lag – der alte Floor 7.29.1 hätte sie durchgelassen, der neue MUSS sie melden.
mut_major7_447="$(mktemp)"
printf '  undici@7.30.0:\n' > "$mut_major7_447"
mut_major7_below_447="$(versions_below_floor_291 undici 7 7.30.1 "$mut_major7_447")"
assert_true "$([ "$mut_major7_below_447" = " 7.30.0" ]; echo $?)" \
  "#447 Mutationsbeleg: undici-Major-7-Fall meldet auf einer Fixture mit undici@7.30.0 genau diese Version (ist: '${mut_major7_below_447}')"
mut_major7_old_floor_447="$(versions_below_floor_291 undici 7 7.29.1 "$mut_major7_447")"
assert_true "$([ -z "$mut_major7_old_floor_447" ]; echo $?)" \
  "#447 Diskriminierungs-Kontrolle: dieselbe Fixture ist gegen den alten Floor 7.29.1 sauber – erst der neue Floor fängt 7.30.0 (ist: '${mut_major7_old_floor_447}')"
rm -f "$mut_major7_447"

# Mutationsbeleg für den #447-Vorsorge-Fall undici@8.x, nach dem Muster des Major-6-Falls: die
# 7.30.1-Nachbarzeile darf beim Major-8-Filter nicht mitzählen.
mut_vorsorge8_447="$(mktemp)"
printf '  undici@7.30.1:\n  undici@8.12.1:\n' > "$mut_vorsorge8_447"
mut_vorsorge8_below_447="$(versions_below_floor_291 undici 8 8.12.2 "$mut_vorsorge8_447")"
assert_true "$([ "$mut_vorsorge8_below_447" = " 8.12.1" ]; echo $?)" \
  "#447 Mutationsbeleg: undici-Major-8-Vorsorge-Fall meldet auf einer Fixture mit undici@8.12.1 genau diese Version, nicht die 7.x-Nachbarzeile (ist: '${mut_vorsorge8_below_447}')"
mut_vorsorge8_clean_447="$(versions_below_floor_291 undici 8 8.12.1 "$mut_vorsorge8_447")"
assert_true "$([ -z "$mut_vorsorge8_clean_447" ]; echo $?)" \
  "#447 Diskriminierungs-Kontrolle: dieselbe Fixture ist für den Major-8-Filter gegen Floor 8.12.1 sauber (ist: '${mut_vorsorge8_clean_447}')"
rm -f "$mut_vorsorge8_447"

# Mutationsbeleg für den QUOTIERTEN Scoped-Schlüssel (#337): @vitest/mocker steht im Lockfile
# als '@vitest/mocker@4.1.11': – ohne die Quote-Entfernung in lock_versions_291 fände die Kette
# nie einen Treffer und der zugehörige Floor-Fall wäre dauerhaft grün, ohne etwas zu messen.
# Die Gegenrichtung (gleiche Fixture, Version ÜBER dem Floor) belegt, dass der Treffer aus dem
# Vergleich kommt und nicht daraus, dass das Muster auf jede quotierte Zeile passt.
mut_scoped_337="$(mktemp)"
printf "  '@vitest/mocker@4.1.9':\n  '@vitest/mocker@4.1.11':\n" > "$mut_scoped_337"
mut_scoped_below_337="$(versions_below_floor_291 '@vitest/mocker' 4 4.1.11 "$mut_scoped_337")"
assert_true "$([ "$mut_scoped_below_337" = " 4.1.9" ]; echo $?)" \
  "#337 Mutationsbeleg: Floor-Kette liest quotierte Scoped-Schlüssel und meldet genau @vitest/mocker@4.1.9 (ist: '${mut_scoped_below_337}')"
mut_scoped_clean_337="$(versions_below_floor_291 '@vitest/mocker' 4 4.1.9 "$mut_scoped_337")"
assert_true "$([ -z "$mut_scoped_clean_337" ]; echo $?)" \
  "#337 Diskriminierungs-Kontrolle: dieselbe Fixture ist gegen Floor 4.1.9 sauber (ist: '${mut_scoped_clean_337}')"
rm -f "$mut_scoped_337"

# Mutationsbeleg für die #444-Floors: genau die Versionen, die vor #444 im Baum lagen, liegen
# zwischen altem und neuem Floor – nur der neue Floor darf sie melden (Lesson testing.md, #447).
mut_vite_444="$(mktemp)"
printf "  '@vitest/mocker@4.1.11':\n  vite@8.1.3:\n" > "$mut_vite_444"
mut_mocker_new_444="$(versions_below_floor_291 '@vitest/mocker' 4 4.1.12 "$mut_vite_444")"
assert_true "$([ "$mut_mocker_new_444" = " 4.1.11" ]; echo $?)" \
  "#444 Mutationsbeleg: @vitest/mocker-Fall meldet 4.1.11 gegen den neuen Floor 4.1.12 (ist: '${mut_mocker_new_444}')"
mut_mocker_old_444="$(versions_below_floor_291 '@vitest/mocker' 4 4.1.11 "$mut_vite_444")"
assert_true "$([ -z "$mut_mocker_old_444" ]; echo $?)" \
  "#444 Diskriminierungs-Kontrolle: 4.1.11 ist gegen den alten Floor 4.1.11 sauber – erst der Bump fängt sie (ist: '${mut_mocker_old_444}')"
mut_vite_below_444="$(versions_below_floor_291 vite 8 8.1.6 "$mut_vite_444")"
assert_true "$([ "$mut_vite_below_444" = " 8.1.3" ]; echo $?)" \
  "#444 Mutationsbeleg: vite-Fall meldet auf einer Fixture mit vite@8.1.3 genau diese Version (ist: '${mut_vite_below_444}')"
mut_vite_clean_444="$(versions_below_floor_291 vite 8 8.1.3 "$mut_vite_444")"
assert_true "$([ -z "$mut_vite_clean_444" ]; echo $?)" \
  "#444 Diskriminierungs-Kontrolle: dieselbe Fixture ist gegen Floor 8.1.3 sauber (ist: '${mut_vite_clean_444}')"
rm -f "$mut_vite_444"

# AK-1/AK-2: next exakt gepinnt, oberhalb des Floors, und eslint-config-next im Lockstep.
# pkg_pin_291 <paket> <package.json> – die deklarierte Version, ohne Range-Präfix zu raten.
pkg_pin_291() {
  grep -oE "\"$1\": \"[^\"]+\"" "$2" | head -1 | sed -E 's/^[^:]*: "//; s/"$//'
}

next_pin_291="$(pkg_pin_291 next "$PKG_JSON_291")"
eslint_next_pin_291="$(pkg_pin_291 eslint-config-next "$PKG_JSON_291")"

# Exakter Pin zuerst prüfen: gegen "^16.2.12" wäre der nachfolgende Floor-Vergleich bedeutungslos.
assert_true "$(printf '%s' "$next_pin_291" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; echo $?)" \
  "#291 AK1: package.json pinnt next exakt, ohne ^/~ (ist: '${next_pin_291}')"
# Floor angehoben 16.2.12 → 16.3.3 (#337): unterhalb 16.3.3 stehen zwei kritische unauth.
# RCE-Advisories offen (GHSA-2xp9-vwfh-vxw4 Image-Optimization/AVIF, GHSA-p293-qw3h-jr36).
# Erneut angehoben 16.3.3 → 16.3.6 (#390): GHSA-vcvr-r3jv-pc5j (kritische RCE in next/og).
assert_true "$([ -n "$next_pin_291" ] && ! version_below_291 "$next_pin_291" "16.3.6"; echo $?)" \
  "#291/#337/#390 AK1: package.json pinnt next auf >= 16.3.6 (ist: '${next_pin_291}')"
assert_true "$([ -n "$eslint_next_pin_291" ] && [ "$eslint_next_pin_291" = "$next_pin_291" ]; echo $?)" \
  "#291 AK2: eslint-config-next trägt dieselbe Version wie next (ist: '${eslint_next_pin_291}')"

# #444 AK1: vitest und @vitest/coverage-v8 als Caret in 4.x, Untergrenze >= 4.1.12, im
# Gleichschritt – coverage-v8 erwartet vitest versionsgleich als Peer.
vitest_spec_444="$(pkg_pin_291 vitest "$PKG_JSON_291")"
coverage_spec_444="$(pkg_pin_291 '@vitest/coverage-v8' "$PKG_JSON_291")"
assert_true "$(printf '%s' "$vitest_spec_444" | grep -qE '^\^4\.[0-9]+\.[0-9]+$' && ! version_below_291 "${vitest_spec_444#^}" "4.1.12"; echo $?)" \
  "#444 AK1: package.json deklariert vitest als Caret in 4.x mit Untergrenze >= 4.1.12 (ist: '${vitest_spec_444}')"
assert_true "$([ -n "$coverage_spec_444" ] && [ "$coverage_spec_444" = "$vitest_spec_444" ]; echo $?)" \
  "#444 AK1: @vitest/coverage-v8 trägt denselben Specifier wie vitest (ist: '${coverage_spec_444}')"

# Der Pin allein genügt nicht (AK-1 verlangt dieselbe Version im Lockfile): genau eine
# aufgelöste next-Version, und die deckungsgleich mit der Deklaration.
lock_next_291="$(lock_versions_291 next "${next_pin_291%%.*}" "$LOCKFILE_291")"
assert_true "$([ -n "$lock_next_291" ] && [ "$lock_next_291" = "$next_pin_291" ]; echo $?)" \
  "#291 AK1: pnpm-lock.yaml löst next auf genau die deklarierte Version auf (ist: '$(printf '%s' "$lock_next_291" | tr '\n' ' ')')"

# AK-5: jeder Override ist konditional, trägt also eine obere Schranke (@<floor bzw.
# @>=x <floor) – ein unbedingter Eintrag würde auch spätere legitime Upgrades der Parents
# festnageln (Muster aus #167).
# override_keys_291 <workspace-yaml> – alle Eintragszeilen des overrides:-Blocks. Bewusst
# NICHT auf /^  "/ verengt: YAML erlaubt unquotierte Schlüssel und Prettier ergänzt keine
# Quotes, ein solcher Eintrag fiele sonst aus der Extraktion und liefe damit lautlos an der
# Konditionalitäts-Prüfung vorbei, statt als Verstoß gemeldet zu werden.
override_keys_291() {
  awk '/^overrides:/{f=1; next} /^[^[:space:]#]/{f=0} f && /^  [^ #]/ {print}' "$1"
}

# unconditional_overrides_291 <eintragszeilen> – die Einträge OHNE obere Schranke im Selektor.
# `"?` und `[^:"]` decken quotierte wie unquotierte Schlüssel ab; die Zeichenklasse endet am
# Doppelpunkt, damit die Ziel-Range rechts davon den Selektor nicht scheinbar konditional macht.
unconditional_overrides_291() {
  printf '%s\n' "$1" | grep -vE '^  "?[^:"]*@[^:"]*<[0-9]' || true
}

overrides_keys_291="$(override_keys_291 "$WORKSPACE_YAML_291")"
assert_true "$([ -n "$overrides_keys_291" ]; echo $?)" \
  "#291 AK5: overrides:-Block in pnpm-workspace.yaml ist auslesbar und nicht leer"
unconditional_291="$(unconditional_overrides_291 "$overrides_keys_291")"
assert_true "$([ -z "$unconditional_291" ]; echo $?)" \
  "#291 AK5: alle overrides-Einträge sind konditional (obere Schranke im Selektor)${unconditional_291:+ – unbedingt: $(printf '%s' "$unconditional_291" | tr -d ' ')}"

# Negativ-Kontrolle zum Konditionalitäts-Guard: derselbe Ausdruck MUSS einen unbedingten
# Eintrag melden. Ohne sie wäre nicht unterscheidbar, ob der Guard prüft oder das Muster nur
# auf jede Zeile passt (Lesson testing.md: Mutationsbeleg mit demselben Assert-Ausdruck).
mut_ovr_291='  "postcss": "^8.5.23"'
assert_true "$([ -n "$(unconditional_overrides_291 "$mut_ovr_291")" ]; echo $?)" \
  "#291 Mutationsbeleg AK5: derselbe Ausdruck meldet einen unbedingten Eintrag ('postcss' ohne @<floor) als Verstoß"

# Blindfleck-Kontrolle für den unquotierten Fall, in beide Richtungen: die Extraktion muss
# beide Zeilen sehen, und der Konditionalitäts-Ausdruck darf davon GENAU den unbedingten
# Eintrag melden – sonst wäre nicht unterscheidbar, ob er unquotierte Schlüssel prüft oder
# pauschal durchwinkt bzw. pauschal meldet (Lesson testing.md, Diskriminierungs-Kontrolle).
mut_ws_291="$(mktemp)"
printf 'overrides:\n  nanoid@<3.3.17: "^3.3.17"\n  nanoid: "^3.3.17"\n' > "$mut_ws_291"
mut_keys_291="$(override_keys_291 "$mut_ws_291")"
assert_true "$([ "$(printf '%s\n' "$mut_keys_291" | grep -c .)" = "2" ]; echo $?)" \
  "#291 Mutationsbeleg AK5: die Extraktion sieht auch UNQUOTIERTE Override-Schlüssel (2 Einträge erwartet)"
assert_true "$([ "$(unconditional_overrides_291 "$mut_keys_291")" = '  nanoid: "^3.3.17"' ]; echo $?)" \
  "#291 Mutationsbeleg AK5: derselbe Ausdruck meldet vom unquotierten Paar nur den unbedingten Eintrag"
rm -f "$mut_ws_291"

# AK-5 zweite Hälfte: die Ziel-Range bleibt in derselben Major-Linie (Caret), sonst hebt pnpm
# über die Major-Grenze – in #291 empirisch passiert, als ">=2.1.4" die von minimatch@3
# erwartete brace-expansion@1.1.15 auf 2.x zog.
assert_true "$(grep -qxF -- '  "brace-expansion@<1.1.21": "^1.1.21"' "$WORKSPACE_YAML_291"; echo $?)" \
  "#291/#390 AK5: brace-expansion@1.x-Override hebt innerhalb der 1er-Linie (^1.1.21)"
assert_true "$(grep -qxF -- '  "brace-expansion@>=2.0.0 <2.1.7": "^2.1.7"' "$WORKSPACE_YAML_291"; echo $?)" \
  "#291/#390 AK5: brace-expansion@2.x-Override ist nach unten begrenzt (>=2.0.0) und greift nicht auf 1.x über"
# #339 AK1: dritter Selektor für die 4.x/5.x-Linie. Die untere Schranke prüft nur diese Zeile –
# der projektweite Konditionalitäts-Guard oben sieht ausschließlich die OBERE Schranke, ein
# versehentliches "brace-expansion@<5.0.9" (das auch 1.x/2.x über die Major-Grenze höbe)
# käme dort also unauffällig durch.
assert_true "$(grep -qxF -- '  "brace-expansion@>=4.0.0 <5.0.12": "^5.0.12"' "$WORKSPACE_YAML_291"; echo $?)" \
  "#339/#390 AK1: brace-expansion@4.x/5.x-Override ist nach unten begrenzt (>=4.0.0) und hebt in die Fix-Linie (5er, ^5.0.12) – 4.x hat keinen eigenen Fix"
# #390: undici-Selektor nach unten auf die 7er-Linie begrenzt. Das bisherige "undici@<7.29.0"
# griffe auch auf eine 6.x-Kopie und höbe sie über die Major-Grenze auf ^7 – dieselbe Klasse
# wie der 2er-brace-expansion-Selektor (#291). Die 6er-Linie trägt einen eigenen Fix (6.28.1,
# GHSA-r53p-7pc4-xj5r); heute löst der Baum keine 6.x-Kopie auf. #447 hebt den Floor auf
# 7.30.1 (GHSA-xjj6-f33q-929c), die untere Schranke bleibt.
assert_true "$(grep -qxF -- '  "undici@>=7.0.0 <7.30.1": "^7.30.1"' "$WORKSPACE_YAML_291"; echo $?)" \
  "#390/#447 AK1: undici-Override ist auf die 7er-Linie begrenzt (>=7.0.0) und hebt auf ^7.30.1"

# Caret-Regel projektweit für ALLE neuen #291-Einträge, nicht nur brace-expansion – sharp/
# undici/js-yaml tragen dieselbe Ziel-Range-Form und dürfen bei einem künftigen Umstellen auf
# ">=" nicht unbemerkt durchrutschen. Die Alt-Einträge esbuild/uuid behalten bewusst die offene
# Form (Kleinfund docs/factory/kleinfunde.md) und sind darum explizit ausgenommen.
# caret_violations_291 <eintragszeilen> – Einträge (außer esbuild/uuid), deren Ziel-Range
# NICHT als Caret geschrieben ist.
caret_violations_291() {
  printf '%s\n' "$1" | grep -vE '^  "?(esbuild|uuid)@' | grep -vE ': "\^[0-9]' || true
}

caret_violations_291="$(caret_violations_291 "$overrides_keys_291")"
assert_true "$([ -z "$caret_violations_291" ]; echo $?)" \
  "#291 AK5: alle Ziel-Ranges außer esbuild/uuid sind Caret-gebunden${caret_violations_291:+ – offen:${caret_violations_291}}"

# Diskriminierungs-Kontrolle: der Guard muss einen echten Verstoß melden UND die esbuild-
# Ausnahme unauffällig lassen – sonst wäre nicht unterscheidbar, ob er wirklich prüft oder
# die Ausnahmeliste einfach alles durchwinkt (Lesson testing.md, #286).
mut_caret_291='  "foo@<1.0.0": ">=1.0.0"
  "esbuild@<0.25.0": ">=0.25.0"'
mut_caret_viol_291="$(caret_violations_291 "$mut_caret_291")"
assert_true "$([ "$mut_caret_viol_291" = '  "foo@<1.0.0": ">=1.0.0"' ]; echo $?)" \
  "#291 Mutationsbeleg AK5: Caret-Guard meldet nur den nicht ausgenommenen Verstoß, esbuild-Ausnahme bleibt unauffällig (ist: '${mut_caret_viol_291}')"

# AK-7/AK-8 (#169/#337): postcss, sharp und js-yaml sind ENTFERNT, nicht mehr nur angehoben.
# next 16.3.5 pinnt postcss exakt auf 8.5.23 (= Floor, vorher 8.4.31) und verlangt sharp selbst
# als ^0.35.4; eslint zieht js-yaml auf 4.3.2. Alle drei sind damit messbar No-ops geworden
# (#337: Eintrag streichen, ohne Alt-Lockfile neu auflösen, aufgelöste Version prüfen) – das in
# #169/#291 als unerreichbar notierte Entfern-Kriterium ist für postcss erreicht. Dass die
# Floors OHNE die Einträge weiter halten, prüft die Floor-Schleife oben; hier steht nur, dass
# die Einträge wirklich verschwunden sind. Der esbuild-Eintrag BLEIBT: er ist nachweislich kein
# No-op (ohne ihn löst der Baum esbuild@0.18.20 auf, in #291 durch Entfernen + Neuinstallation
# verifiziert).
ovr_count_337() {
  printf '%s\n' "$overrides_keys_291" | grep -cE "^  \"?$1@" || true
}

for pkg_337 in postcss sharp js-yaml; do
  count_337="$(ovr_count_337 "$pkg_337")"
  assert_true "$([ "$count_337" = "0" ]; echo $?)" \
    "#337 AK7/AK8: kein ${pkg_337}-Override mehr in pnpm-workspace.yaml (gemessener No-op nach dem next-16.3.5-Bump, ist: $count_337)"
done

# Diskriminierungs-Kontrolle zu den drei Null-Zählungen: derselbe Ausdruck MUSS die weiterhin
# nötigen Einträge finden – sonst wären sie grün, weil die Extraktion gar nichts liefert.
undici_ovr_count_337="$(ovr_count_337 undici)"
assert_true "$([ "$undici_ovr_count_337" = "1" ]; echo $?)" \
  "#337 Diskriminierungs-Kontrolle: derselbe Zähl-Ausdruck findet den weiterhin nötigen undici-Override (ist: $undici_ovr_count_337)"

# Mutationsbeleg für die drei Null-Zählungen (Review-Runde-1-Finding #337): die undici-Kontrolle
# oben belegt nur, dass IRGENDEIN vorhandener Override gefunden wird – nicht spezifisch, dass ein
# postcss-Override (falls er zurückkäme) ebenfalls träfe. Synthetische Fixture mit genau einer
# postcss-Zeile schließt das.
overrides_keys_291_saved_337="$overrides_keys_291"
overrides_keys_291='  "postcss@<8.5.23": "^8.5.23"
  "undici@<7.29.0": "^7.29.0"'
mut_postcss_ovr_count_337="$(ovr_count_337 postcss)"
overrides_keys_291="$overrides_keys_291_saved_337"
assert_true "$([ "$mut_postcss_ovr_count_337" = "1" ]; echo $?)" \
  "#337 Mutationsbeleg: derselbe Zähl-Ausdruck findet einen zurückgekehrten postcss-Override auf einer Fixture (ist: $mut_postcss_ovr_count_337)"
assert_true "$(grep -qE '^  "esbuild@<0\.25\.0"' "$WORKSPACE_YAML_291"; echo $?)" \
  "#291 AK7: esbuild-Override bleibt erhalten (kein No-op – ohne ihn kommt esbuild@0.18.20 zurück)"
