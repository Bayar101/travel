"use client";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Accessible name (icon-only button). */
  label: string;
}

/** 44px round icon-only button for headers and toolbars. */
export default function IconButton({ label, className = "", type = "button", children, ...rest }: IconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={`flex size-11 shrink-0 items-center justify-center rounded-full text-zinc-100 transition-colors active:bg-white/10 disabled:opacity-40 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
