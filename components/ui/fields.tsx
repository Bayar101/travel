"use client";

import { useId } from "react";

const INPUT =
  "min-h-11 w-full rounded-lg border bg-zinc-950 px-3 text-base text-zinc-100 placeholder:text-zinc-600";

function Field({
  label,
  error,
  id,
  extra,
  children,
}: {
  label: string;
  error?: string;
  id: string;
  extra?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="block">
      <div className="mb-1 flex items-center justify-between">
        <label htmlFor={id} className="text-base text-zinc-400">
          {label}
        </label>
        {extra}
      </div>
      {children}
      {error && (
        <p id={`${id}-err`} role="alert" className="mt-1 text-base text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

const border = (error?: string) => (error ? "border-red-500" : "border-zinc-800");
const aria = (id: string, error?: string) => ({
  "aria-invalid": error ? true : undefined,
  "aria-describedby": error ? `${id}-err` : undefined,
});

interface Base { label: string; error?: string }

export function TextField({
  label, error, onChange, ...rest
}: Base & { value: string; onChange: (v: string) => void } & Omit<
  React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"
>) {
  const id = useId();
  return (
    <Field label={label} error={error} id={id}>
      <input id={id} {...aria(id, error)} {...rest} onChange={(e) => onChange(e.target.value)} className={`${INPUT} ${border(error)}`} />
    </Field>
  );
}

export function TextArea({
  label, error, onChange, ...rest
}: Base & { value: string; onChange: (v: string) => void } & Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onChange"
>) {
  const id = useId();
  return (
    <Field label={label} error={error} id={id}>
      <textarea id={id} rows={3} {...aria(id, error)} {...rest} onChange={(e) => onChange(e.target.value)} className={`${INPUT} py-2 ${border(error)}`} />
    </Field>
  );
}

export function SelectField({
  label, error, onChange, options, ...rest
}: Base & {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "value" | "onChange">) {
  const id = useId();
  return (
    <Field label={label} error={error} id={id}>
      <select id={id} {...aria(id, error)} {...rest} onChange={(e) => onChange(e.target.value)} className={`${INPUT} ${border(error)}`}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

export function DateField({
  label, error, value, onChange, ...rest
}: Base & { value: string; onChange: (v: string) => void } & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
>) {
  const id = useId();
  return (
    <Field label={label} error={error} id={id}>
      <input id={id} type="date" value={value} {...aria(id, error)} {...rest} onChange={(e) => onChange(e.target.value)} className={`${INPUT} ${border(error)}`} />
    </Field>
  );
}

export function TimeField({
  label, error, value, onChange, ...rest
}: Base & { value: string | null; onChange: (v: string | null) => void } & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type"
>) {
  const id = useId();
  return (
    <Field
      label={label}
      error={error}
      id={id}
      extra={
        value ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="flex min-h-11 items-center px-2 text-base text-red-400 active:text-red-300"
          >
            Clear
          </button>
        ) : null
      }
    >
      <input id={id} type="time" value={value ?? ""} {...aria(id, error)} {...rest} onChange={(e) => onChange(e.target.value || null)} className={`${INPUT} ${border(error)}`} />
    </Field>
  );
}

export function NumberField({
  label, error, onChange, ...rest
}: Base & { value: string; onChange: (v: string) => void } & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange" | "type" | "inputMode"
>) {
  const id = useId();
  return (
    <Field label={label} error={error} id={id}>
      <input id={id} type="text" inputMode="decimal" autoComplete="off" {...aria(id, error)} {...rest} onChange={(e) => onChange(e.target.value)} className={`${INPUT} ${border(error)}`} />
    </Field>
  );
}
