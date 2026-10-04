export type Route =
  | { view: "days" }
  | { view: "day"; id: string }
  | { view: "locations" }
  | { view: "location"; id: string }
  | { view: "categories" }
  | { view: "stays" }
  | { view: "map" };

export const DEFAULT_ROUTE: Route = { view: "days" };

export function parseHash(hash: string): Route {
  const path = hash.replace(/^#/, "").replace(/\/+$/, "");
  const [, name, rawId, ...rest] = path.split("/");
  if (rest.length) return DEFAULT_ROUTE;
  let id = rawId;
  if (id) {
    try {
      id = decodeURIComponent(id);
    } catch {
      return DEFAULT_ROUTE;
    }
  }
  switch (name) {
    case "day":
      return id ? { view: "day", id } : DEFAULT_ROUTE;
    case "location":
      return id ? { view: "location", id } : DEFAULT_ROUTE;
    case "locations":
    case "categories":
    case "stays":
    case "map":
      return id ? DEFAULT_ROUTE : { view: name };
    default:
      return DEFAULT_ROUTE;
  }
}
