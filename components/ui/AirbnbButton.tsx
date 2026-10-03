export default function AirbnbButton({ url, className = "" }: { url: string; className?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex min-h-11 items-center justify-center rounded-xl bg-zinc-800 px-4 text-base font-medium text-zinc-100 active:bg-zinc-700 ${className}`}
    >
      Open in Airbnb
    </a>
  );
}
