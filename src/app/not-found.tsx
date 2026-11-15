import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center text-center">
      <p className="font-display text-[64px] font-semibold leading-none text-brand/30">404</p>
      <h1 className="mt-2 font-display text-xl font-semibold text-ink">Page introuvable</h1>
      <p className="mt-1.5 text-[13px] text-ink-soft">
        La date ou la page demandée n’existe pas. Revenez au journal de production.
      </p>
      <Link href="/jour" className="btn-primary mt-5 h-11 px-5">
        Retour au journal
      </Link>
    </div>
  );
}
