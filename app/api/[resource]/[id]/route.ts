import { db } from "@/lib/supabase";
import { handler, HttpError, json, readJson, readVersion, unwrap } from "@/lib/api-handler";
import { getResource, isUuid, normalizeRow } from "@/lib/resources";
import { isDeleteConfirmed } from "@/lib/validation";

export const dynamic = "force-dynamic";

type P = { resource: string; id: string };

function lookup(params: P) {
  const def = getResource(params.resource);
  if (!def || !isUuid(params.id)) throw new HttpError(404, "Not found");
  return def;
}

export const PATCH = handler<P>("api.resource.update", async ({ req, params }) => {
  const def = lookup(params);
  const parsed = def.validate(await readJson(req), "update");
  if (!parsed.ok) throw new HttpError(400, parsed.error);
  if (Object.keys(parsed.value).length === 0) throw new HttpError(400, "No fields to update");
  const row = unwrap(
    await db().from(def.table).update(parsed.value).eq("id", params.id).select(def.columns).maybeSingle(),
  );
  if (!row) throw new HttpError(404, "Not found");
  return json({ row: normalizeRow(params.resource, row as unknown as Record<string, unknown>), version: await readVersion() });
});

export const DELETE = handler<P>("api.resource.delete", async ({ req, params }) => {
  const def = lookup(params);
  if (!isDeleteConfirmed(await readJson(req))) throw new HttpError(400, 'Confirmation required: {"confirm":"delete me"}');
  const rows = unwrap(await db().from(def.table).delete().eq("id", params.id).select("id"));
  if (!rows || rows.length === 0) throw new HttpError(404, "Not found");
  return json({ version: await readVersion() });
});
