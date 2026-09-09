// "by ApexHub Labs" credit — links to the maker. Uses the light logo on light backgrounds and
// the (white) dark logo on dark backgrounds. Assets live in /public.
export function MadeByApexHub({ className }: { className?: string }) {
  return (
    <a
      href="https://apexhub-labs.vercel.app/"
      target="_blank"
      rel="noreferrer"
      className={`inline-flex items-center gap-1.5 text-xs text-muted transition-opacity hover:opacity-80 ${className ?? ""}`}
    >
      <span>by</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/light_apex.png" alt="ApexHub Labs" className="h-6 w-auto dark:hidden" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/dark_apex.png" alt="ApexHub Labs" className="hidden h-6 w-auto dark:block" />
    </a>
  );
}
