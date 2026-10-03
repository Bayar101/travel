import { db } from "@/lib/supabase";
import { handler, HttpError, json, readJson, readVersion, unwrap } from "@/lib/api-handler";
import { getResource, normalizeRow } from "@/lib/resources";

export const dynamic = "force-dynamic";

export const POST = handler<{ resource: string }>("api.resource.create", async ({ req, params }) => {
  const def = getResource(params.resource);
  if (!def) throw new HttpError(404, "Not found");
  const parsed = def.validate(await readJson(req), "create");
  if (!parsed.ok) throw new HttpError(400, parsed.error);
  const row = unwrap(await db().from(def.table).insert(parsed.value).select(def.columns).single());
  return json({ row: normalizeRow(params.resource, row as unknown as Record<string, unknown>), version: await readVersion() }, 201);
});
