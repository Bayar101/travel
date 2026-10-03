import { addDays } from "./stay-dates";
import { isAirbnbUrl } from "./validation";
import type { Stay } from "./types";

export interface StayFormValues {
  location_id: string;
  name: string;
  airbnb_url: string;
  check_in: string;
  check_out: string;
}

export type StayFormErrors = Partial<Record<keyof StayFormValues, string>>;

export function validateStayForm(v: StayFormValues): StayFormErrors {
  const e: StayFormErrors = {};
  if (!v.location_id) e.location_id = "Choose a location";
  if (!v.name.trim()) e.name = "Name is required";
  if (!v.airbnb_url.trim()) e.airbnb_url = "Airbnb link is required";
  else if (!isAirbnbUrl(v.airbnb_url.trim())) e.airbnb_url = "Enter an Airbnb link (https://www.airbnb.com/...)";
  if (!v.check_in) e.check_in = "Check-in is required";
  if (!v.check_out) e.check_out = "Check-out is required";
  else if (v.check_in && v.check_out <= v.check_in) e.check_out = "Check-out must be after check-in";
  return e;
}

/** Set check-in; an empty check-out is prefilled with the next day (one night). */
export function withCheckIn(v: StayFormValues, check_in: string): StayFormValues {
  return { ...v, check_in, check_out: !v.check_out && check_in ? addDays(check_in, 1) : v.check_out };
}

// Call only after validateStayForm returned no errors.
export function stayPayload(v: StayFormValues): Omit<Stay, "id"> {
  return {
    location_id: v.location_id,
    name: v.name.trim(),
    airbnb_url: v.airbnb_url.trim(),
    check_in: v.check_in,
    check_out: v.check_out,
  };
}

export function stayToForm(s: Stay): StayFormValues {
  return { location_id: s.location_id, name: s.name, airbnb_url: s.airbnb_url, check_in: s.check_in, check_out: s.check_out };
}
