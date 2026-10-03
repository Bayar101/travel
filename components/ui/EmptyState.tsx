import Button from "./Button";

export default function EmptyState({
  emoji,
  text,
  cta,
}: {
  emoji: string;
  text: string;
  cta?: { label: string; onClick: () => void };
}) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      <div aria-hidden="true" className="text-5xl">
        {emoji}
      </div>
      <p className="text-base text-zinc-400">{text}</p>
      {cta && <Button onClick={cta.onClick}>{cta.label}</Button>}
    </div>
  );
}
