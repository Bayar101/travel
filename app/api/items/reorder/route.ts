import { db } from "@/lib/supabase";
import { handler, HttpError, json, readJson, readVersion, unwrap } from "@/lib/api-handler";
import { isUuid } from "@/lib/resources";

export const dynamic = "force-dynamic";

const MAX_IDS = 100;

export const POST = handler("api.items.reorder", async ({ req }) => {
  const body = await readJson(req);
  const { day_id, ids } = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
  if (!isUuid(day_id)) throw new HttpError(400, "day_id must be a uuid");
  if (!Array.isArray(ids) || ids.length > MAX_IDS || !ids.every(isUuid)) {
    throw new HttpError(400, "ids must be an array of uuids");
  }
  if (new Set(ids).size !== ids.length) throw new HttpError(400, "ids must be unique");

  if (ids.length > 0) {
    const found = unwrap(await db().from("day_items").select("id").eq("day_id", day_id).in("id", ids));
    if (found?.length !== ids.length) throw new HttpError(404, "Item not found in day");
    await Promise.all(
      ids.map(async (id, position) => {
        unwrap(await db().from("day_items").update({ position }).eq("id", id).eq("day_id", day_id));
      }),
    );
  }
  return json({ version: await readVersion() });
});
