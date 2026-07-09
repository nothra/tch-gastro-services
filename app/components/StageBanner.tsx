import { currentStage } from "@/lib/stage";

// Deutlich sichtbares Banner in DEV/INT (in PRD ausgeblendet), damit Nicht-Produktions-
// Umgebungen nie mit der Produktion verwechselt werden.
export function StageBanner() {
  if (!currentStage.showBanner) return null;
  return (
    <div
      role="status"
      style={{ backgroundColor: currentStage.color }}
      className="w-full px-3 py-1 text-center text-xs font-semibold tracking-wide text-white"
    >
      {currentStage.label} — keine Produktionsumgebung
    </div>
  );
}
