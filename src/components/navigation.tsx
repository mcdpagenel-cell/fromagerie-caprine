'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ComponentType } from 'react';

import { IconBasket, IconCalendar, IconChart, IconGrid, IconSettings } from './icons';
import { LogoutButton } from './settings/LogoutButton';

type NavItem = { href: string; label: string; icon: ComponentType<{ className?: string }> };

const ITEMS: NavItem[] = [
  { href: '/jour', label: 'Jour', icon: IconCalendar },
  { href: '/mois', label: 'Mois', icon: IconGrid },
  { href: '/annee', label: 'Année', icon: IconChart },
  { href: '/ventes', label: 'Ventes', icon: IconBasket },
  { href: '/parametres', label: 'Réglages', icon: IconSettings },
];

function useActive() {
  const pathname = usePathname();
  return (href: string) => pathname === href || pathname.startsWith(`${href}/`);
}

export function Sidebar({
  farmName,
  tagline,
  storageLabel,
  showLogout,
}: {
  farmName: string;
  tagline: string;
  storageLabel: string;
  showLogout: boolean;
}) {
  const isActive = useActive();
  return (
    <aside className="no-print sticky top-0 hidden h-dvh w-[260px] shrink-0 flex-col border-r border-line/80 bg-paper/70 px-4 py-6 backdrop-blur lg:flex">
      <Link href="/jour" className="flex items-center gap-3 px-2">
        <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-2xl border border-line bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="Logo de la fromagerie" className="h-full w-full object-contain p-0.5" />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-display text-[17px] font-semibold leading-tight text-ink">
            {farmName}
          </span>
          <span className="block truncate text-[11px] text-ink-soft">{tagline}</span>
        </span>
      </Link>

      <nav className="mt-8 flex flex-col gap-1">
        {ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                active
                  ? 'bg-brand-soft text-brand-dark shadow-sm'
                  : 'text-ink-soft hover:bg-brand-soft/50 hover:text-ink'
              }`}
            >
              <Icon className={`h-[19px] w-[19px] ${active ? 'text-brand' : 'text-ink-soft group-hover:text-brand'}`} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2">
        <div className="rounded-xl border border-line/70 bg-cream/70 p-3 text-[11px] leading-relaxed text-ink-soft">
          <p className="font-semibold text-ink">Données</p>
          <p className="truncate">{storageLabel}</p>
          <p>Sauvegarde JSON et export Excel dans les réglages.</p>
        </div>
        {showLogout ? <LogoutButton className="w-full justify-center" /> : null}
      </div>
    </aside>
  );
}

export function MobileTopBar({ farmName, today }: { farmName: string; today: string }) {
  return (
    <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-line/70 bg-cream/90 px-4 py-2.5 backdrop-blur-lg lg:hidden">
      <Link href="/jour" className="flex min-w-0 items-center gap-2.5">
        <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="Logo" className="h-full w-full object-contain p-0.5" />
        </span>
        <span className="min-w-0">
          <span className="block truncate font-display text-[15px] font-semibold leading-tight">{farmName}</span>
          <span className="block text-[10px] uppercase tracking-wider text-ink-soft">Suivi de production</span>
        </span>
      </Link>
      <Link
        href={`/jour/${today}`}
        className="ml-auto grid h-10 w-10 place-items-center rounded-xl border border-line bg-white text-brand"
        aria-label="Aller à aujourd’hui"
      >
        <IconCalendar className="h-5 w-5" />
      </Link>
    </header>
  );
}

export function BottomNav() {
  const isActive = useActive();
  return (
    <nav className="no-print safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-line bg-paper/95 px-2 pt-1.5 backdrop-blur-lg lg:hidden">
      <div className="mx-auto flex max-w-lg items-stretch justify-around">
        {ITEMS.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex min-w-0 flex-1 flex-col items-center gap-1 rounded-xl px-1 py-1.5 text-[10px] font-semibold transition ${
                active ? 'text-brand' : 'text-ink-soft'
              }`}
            >
              <span
                className={`grid h-8 w-12 place-items-center rounded-lg transition ${
                  active ? 'bg-brand-soft' : 'bg-transparent'
                }`}
              >
                <Icon className="h-[19px] w-[19px]" />
              </span>
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
