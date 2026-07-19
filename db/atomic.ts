import { db } from "./index";

// Erste atomare Multi-Write-Klammer im Projekt (F8, #55, ADR-033 D3). Die beiden Treiber
// (siehe db/index.ts) bieten unterschiedliche atomare Primitive:
//   - neon-http (INT/PRD): nur `.batch()` – eine interaktive `.transaction()` wirft dort
//     ("No transactions support in neon-http driver").
//   - node-postgres (DEV/Test): `.transaction()`, aber KEIN `.batch()`.
// `runAtomic` wählt zur Laufzeit die im aktuellen Treiber verfügbare Primitive – dieselbe SQL,
// ein Aufrufweg. Die Query-Builder werden lazy gegen den übergebenen Executor gebaut (kein Await)
// und erst von batch bzw. der Transaktion ausgeführt. Die Ergebnisse kommen in Reihenfolge der
// gebauten Queries zurück (so lässt sich z. B. ein `.returning()` an fester Position auslesen).
//
// Coverage-Hinweis: Der batch-Zweig (neon-http) wird nur produktiv/über /post-merge-verify
// ausgeführt; die lokalen Integrationstests laufen über node-postgres und decken den
// transaction-Zweig ab. Der Zweig-Selektor ist reine Treiber-Erkennung (analog db/index.ts).

type SqlExecutor = Pick<typeof db, "insert" | "update" | "delete" | "select">;

type Batchable = { batch?: (queries: readonly unknown[]) => Promise<unknown[]> };

export async function runAtomic(
  build: (exec: SqlExecutor) => readonly PromiseLike<unknown>[],
): Promise<unknown[]> {
  const batch = (db as unknown as Batchable).batch;
  if (typeof batch === "function") {
    return batch.call(db, build(db));
  }
  return db.transaction(async (tx) => {
    const results: unknown[] = [];
    for (const query of build(tx)) results.push(await query);
    return results;
  });
}
