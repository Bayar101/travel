import "server-only";
import { NextResponse } from "next/server";
import { db } from "@/lib/supabase";
import { createLogger, type Logger } from "@/lib/logger";
import { mapPgError, type PgErrorLike } from "@/lib/resources";

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export interface RouteCtx<P> {
  req: Request;
  request_id: string;
  log: Logger;
  params: P;
}

const REQUEST_ID_RE = /^[\w:-]{1,128}$/;

export function getRequestId(req: Request): string {
  const v = req.headers.get("x-vercel-id");
  return v && REQUEST_ID_RE.test(v) ? v : crypto.randomUUID();
}

export const json = (body: unknown, status = 200, headers?: HeadersInit) =>
  NextResponse.json(body, { status, headers });

export function handler<P = Record<string, never>>(name: string, fn: (c: RouteCtx<P>) => Promise<Response>) {
  const log = createLogger(name);
  return async (req: Request, ctx: { params: Promise<P> }): Promise<Response> => {
    const request_id = getRequestId(req);
    try {
      return await fn({ req, request_id, log, params: await ctx.params });
    } catch (err) {
      if (err instanceof HttpError) return json({ error: err.message }, err.status);
      log.error("request_failed", { request_id, method: req.method, path: new URL(req.url).pathname }, err);
      return json({ error: "Something went wrong" }, 500);
    }
  };
}

export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}

// Unwrap a supabase-js result: known PG errors -> HttpError, others -> thrown (500, logged by handler).
export function unwrap<T>(res: { data: T; error: (PgErrorLike & { message: string }) | null }): T {
  if (res.error) {
    const mapped = mapPgError(res.error);
    if (mapped) throw new HttpError(mapped.status, mapped.message);
    throw new Error(`database error ${res.error.code ?? ""}: ${res.error.message}`);
  }
  return res.data;
}

export async function readVersion(): Promise<number> {
  const row = unwrap(await db().from("data_version").select("version").eq("id", 1).single());
  if (!row) throw new Error("data_version row missing");
  return Number(row.version);
}
