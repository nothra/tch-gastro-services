// Route-neutraler Vertrag der Verzehr-Erfassungs-UI (ADR-025 D5). Bewusst hier – nicht im
// Veranstaltungs-Feature – definiert, damit die präsentationalen Komponenten keine Auth-/
// Session-/Token-Annahme kennen und F7 (#54) dieselbe UI mit einer token-scoped Action
// wiederverwenden kann. Die Action ist bereits an ihren Scope gebunden (z. B. veranstaltungId);
// die UI liefert nur zeileId/catalogItemId/delta über das FormData.

export type VerzehrActionState = {
  ok?: boolean;
  // Vom Server zurückgegeben, aber in MengeControl bewusst nicht gerendert –
  // die Menge kommt immer aus der server-autoritativen Prop (revalidatePath, ADR-025 D4).
  menge?: number;
  error?: string;
};

export type VerzehrFormAction = (
  state: VerzehrActionState | undefined,
  formData: FormData,
) => Promise<VerzehrActionState>;
