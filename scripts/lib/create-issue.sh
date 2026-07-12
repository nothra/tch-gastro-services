#!/usr/bin/env bash
# create-issue.sh – sourcebare Bibliothek: zentraler Seam für die Issue-Anlage (ADR-018).
#
# Diese Datei wird per `source`/`.` eingebunden und stellt EINE Funktion bereit:
#
#   create_issue <title> <body> <art-label> [aspekt-csv]
#     → legt ein GitHub-Issue an, setzt Art-Label + optionale Aspekt-Labels
#     → gibt die Issue-Nummer AUSSCHLIESSLICH auf stdout zurück (Exit 0)
#     → alle Warnungen/Diagnostik gehen auf stderr, damit `num=$(create_issue …)`
#       ausschließlich die reine Nummer erhält (stdout-Hygiene, ADR-018 §2)
#     → Exit ≠ 0 nur, wenn gar kein Issue entsteht (fail-closed auf die Anlage)
#
# Label-Degradation (fail-open aufs Label, ADR-018 §3) – das verpflichtende Art-Label
# wird nie durch ein fehlendes Aspekt-Label mitgerissen:
#
#   create mit  Art + allen Aspekt-Labels
#     └─ scheitert? → create nur mit Art-Label     (Warnung nennt die weggefallenen Aspekte)
#          └─ scheitert? → create ohne Label        (Warnung; die Anlage darf nicht scheitern)
#
# Repo-Bezug (ADR-018 §4): der Seam leitet den Slug NICHT selbst ab. Er nutzt
# `--repo "$FACTORY_REPO"` (sonst den vom Aufrufer gesetzten `$REPO`); ist beides leer,
# überlässt er `gh` die Auto-Erkennung aus dem Arbeitsverzeichnis.
#
# Die kanonische Label-Liste (genau ein Art-Label + null..n Aspekt-Labels) lebt allein in
# `docs/factory/guidelines/git-workflow.md` → „GitHub-Labels". Der Seam validiert bewusst
# nicht dagegen (keine Duplikation, kein Drift).

# _cri_issue_number <url> – extrahiert die abschließende Issue-Nummer aus der gh-Ausgabe.
_cri_issue_number() {
  printf '%s' "$1" | grep -oE '[0-9]+$'
}

# create_issue <title> <body> <art-label> [aspekt-csv]
create_issue() {
  local title="$1" body="$2" art_label="${3:-}" aspect_csv="${4:-}"

  command -v gh >/dev/null 2>&1 || {
    echo "create_issue: 'gh' nicht gefunden – Issue-Anlage nicht möglich." >&2
    return 1
  }

  # Repo-Slug aus der Umgebung (nicht selbst ableiten, ADR-018 §4).
  local repo="${FACTORY_REPO:-${REPO:-}}"
  local -a repo_args=()
  [ -n "$repo" ] && repo_args=(--repo "$repo")

  # Aspekt-CSV portabel in einzelne Labels zerlegen (leere Felder überspringen) –
  # ohne IFS-Spielereien, damit der Aufrufer-Kontext unberührt bleibt.
  local -a aspects=()
  local rest="$aspect_csv" tok
  while [ -n "$rest" ]; do
    tok="${rest%%,*}"
    [ -n "$tok" ] && aspects+=("$tok")
    [ "$tok" = "$rest" ] && break
    rest="${rest#*,}"
  done

  # Label-Arg-Sätze gestuft aufbauen: voll (Art + Aspekte) und nur-Art.
  local -a lbl_full=() lbl_art=() a
  if [ -n "$art_label" ]; then
    lbl_full+=(--label "$art_label")
    lbl_art+=(--label "$art_label")
  fi
  for a in ${aspects[@]+"${aspects[@]}"}; do
    lbl_full+=(--label "$a")
  done

  local url num

  # Stufe 1: Art + alle Aspekt-Labels (nur, wenn überhaupt Labels vorhanden sind).
  if [ "${#lbl_full[@]}" -gt 0 ]; then
    url=$(gh issue create "${repo_args[@]}" --title "$title" --body "$body" "${lbl_full[@]}" 2>/dev/null) || url=""
    num=$(_cri_issue_number "$url")
    [ -n "$num" ] && { printf '%s\n' "$num"; return 0; }
  fi

  # Stufe 2: nur Art-Label (Aspekte fallen weg) – nur sinnvoll, wenn es Aspekte UND ein
  # Art-Label gab (sonst wäre das identisch zu Stufe 1 bzw. Stufe 3).
  if [ "${#aspects[@]}" -gt 0 ] && [ "${#lbl_art[@]}" -gt 0 ]; then
    echo "create_issue: Aspekt-Label(s) '${aspects[*]}' nicht gesetzt (im Repo nicht vorhanden?) – versuche nur Art-Label '${art_label}'." >&2
    url=$(gh issue create "${repo_args[@]}" --title "$title" --body "$body" "${lbl_art[@]}" 2>/dev/null) || url=""
    num=$(_cri_issue_number "$url")
    [ -n "$num" ] && { printf '%s\n' "$num"; return 0; }
  fi

  # Stufe 3: ohne jedes Label – die Anlage darf nicht an Label-Kosmetik scheitern.
  if [ "${#lbl_full[@]}" -gt 0 ]; then
    echo "create_issue: Label(s) nicht gesetzt (im Repo nicht vorhanden?) – lege Issue ohne Label an; bitte manuell klassifizieren." >&2
  fi
  url=$(gh issue create "${repo_args[@]}" --title "$title" --body "$body" 2>/dev/null) || url=""
  num=$(_cri_issue_number "$url")
  [ -n "$num" ] && { printf '%s\n' "$num"; return 0; }

  echo "create_issue: Issue-Anlage fehlgeschlagen (keine Issue-Nummer erhalten)." >&2
  return 1
}
