import { db } from "@/lib/supabase";
import { etagFor, matchesEtag } from "@/lib/etag";
import { handler, json, readVersion, unwrap } from "@/lib/api-handler";
import { RESOURCES, normalizeRow } from "@/lib/resources";
import type { TripData } from "@/lib/types";

export const dynamic = "force-dynamic";

export const GET = handler("api.data", async ({ req }) => {
  const version = await readVersion();
  const headers = { ETag: etagFor(version), "Cache-Control": "private, no-cache" };
  if (matchesEtag(req.headers.get("if-none-match"), version)) {
    return new Response(null, { status: 304, headers });
  }
  const names = ["categories", "locations", "stays", "days", "items"] as const;
  const results = await Promise.all(
    names.map(async (n) => {
      const d = RESOURCES[n];
      const rows = unwrap(
        await db().from(d.table).select(d.columns).order(d.order.column, { ascending: d.order.ascending ?? true }),
      ) as unknown as Record<string, unknown>[];
      return rows.map((r) => normalizeRow(n, r));
    }),
  );
  const [categories, locations, stays, days, items] = results;
  const body = { version, categories, locations, stays, days, items } as unknown as TripData;
  return json(body, 200, headers);
});
