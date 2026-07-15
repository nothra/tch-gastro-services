-- ADR-024 D7: Owner-Rolle `abrechner` → `veranstalter` umbenennen (Owner des ganzen
-- Veranstaltungs-Lebenszyklus – Anlage → Führen → Abrechnen – nicht nur der Abrechnungs-Phase).
-- Verlustfreie In-Place-Umbenennung des pgEnum-Werts: bestehende roles-Arrays bleiben erhalten.
-- Bewusst KEIN drop-and-recreate: das Muster aus Codify #48 galt dem *Entfernen* von Enum-Werten
-- (Postgres kann Werte nicht löschen) – hier wird nur umbenannt, RENAME VALUE ist der richtige,
-- datenerhaltende Weg. Von Hand geschrieben, da `drizzle-kit generate` bei Enum-Wert-Änderungen
-- interaktiv nachfragt bzw. inkohärentes SQL erzeugt (#48); der Snapshot 0007 ist konsistent.
ALTER TYPE "public"."user_role" RENAME VALUE 'abrechner' TO 'veranstalter';
