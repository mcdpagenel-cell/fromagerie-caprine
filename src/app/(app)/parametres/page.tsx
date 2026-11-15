import type { Metadata } from 'next';
import Link from 'next/link';

import { DataTools, SettingsForm } from '@/components/settings/SettingsPanels';
import { LogoutButton } from '@/components/settings/LogoutButton';
import { PageHeader, SectionCard } from '@/components/ui';
import { IconInfo, IconLeaf } from '@/components/icons';
import { getAvailableYears, getSettings, getStats } from '@/lib/repo';
import { authEnabled } from '@/lib/auth';
import { isRemoteDatabase } from '@/lib/db';
import { fmtNumber, formatDateLong } from '@/lib/format';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Réglages & sauvegarde' };

export default async function ParametresPage() {
  const [settings, stats, years] = await Promise.all([
    getSettings(),
    getStats(),
    getAvailableYears(),
  ]);
  const remote = isRemoteDatabase;
  const protectedAccess = authEnabled();

  return (
    <div className="mx-auto w-full max-w-4xl space-y-3.5">
      <PageHeader
        eyebrow="Configuration"
        title="Réglages & sauvegarde"
        subtitle="Identité de l’exploitation, stock de départ et sauvegarde des données"
      />

      <SectionCard
        title="Exploitation & stock de départ"
        subtitle="Le stock initial sert de base à tous les calculs de stock"
      >
        <SettingsForm settings={settings} />
      </SectionCard>

      <SectionCard
        title="Sauvegarde & restauration"
        subtitle="Un fichier JSON portable qui contient tout l’historique"
      >
        <DataTools dbLabel={stats.databaseLabel} daysCount={stats.days} remote={remote} />
      </SectionCard>

      <SectionCard title="Historique" subtitle="Années disponibles dans la base">
        <div className="flex flex-wrap gap-2">
          {years.map((year) => (
            <Link
              key={year}
              href={`/annee/${year}`}
              className="rounded-xl border border-line bg-cream/50 px-3 py-2 text-[12.5px] font-semibold text-ink transition hover:border-brand/40 hover:bg-brand-soft/40"
            >
              Année {year}
            </Link>
          ))}
        </div>
        <dl className="mt-3 grid grid-cols-2 gap-3 text-[11.5px] sm:grid-cols-4">
          <div>
            <dt className="text-ink-soft">Journées enregistrées</dt>
            <dd className="num font-bold text-ink">{fmtNumber(stats.days)}</dd>
          </div>
          <div>
            <dt className="text-ink-soft">Première saisie</dt>
            <dd className="font-semibold text-ink">
              {stats.firstDate ? formatDateLong(stats.firstDate) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-ink-soft">Dernière saisie</dt>
            <dd className="font-semibold text-ink">
              {stats.lastDate ? formatDateLong(stats.lastDate) : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-ink-soft">Stock de départ</dt>
            <dd className="font-semibold text-ink">{formatDateLong(settings.openingDate)}</dd>
          </div>
        </dl>
      </SectionCard>

      <SectionCard title="Accès & sécurité" subtitle="Mot de passe partagé">
        <div className="space-y-3 text-[12px] leading-relaxed text-ink-soft">
          <p>
            {protectedAccess ? (
              <>
                <span className="font-semibold text-ink">Accès protégé par mot de passe.</span> La
                session dure 30 jours sur cet appareil. Pour changer le mot de passe, modifiez la
                variable d’environnement <code className="rounded bg-cream px-1 py-0.5">APP_PASSWORD</code>{' '}
                sur l’hébergeur : toutes les sessions existantes seront déconnectées.
              </>
            ) : (
              <>
                <span className="font-semibold text-ink">Accès libre (développement).</span> Définissez{' '}
                <code className="rounded bg-cream px-1 py-0.5">APP_PASSWORD</code> dans
                l’environnement pour activer la protection par mot de passe.
              </>
            )}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <LogoutButton />
            <span className="text-[11px]">
              Stockage des données : <strong className="text-ink">{stats.databaseLabel}</strong>
            </span>
          </div>
        </div>
      </SectionCard>

      <div className="card overflow-hidden">
        <div className="flex gap-3 p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-olive-soft text-olive">
            <IconLeaf className="h-4 w-4" />
          </span>
          <div className="min-w-0 text-[12px] leading-relaxed text-ink-soft">
            <h2 className="text-[13px] font-bold text-ink">Fonctionnement des stocks</h2>
            <p className="mt-1">
              Stock du jour = stock de la veille + transformation − ventes − autoconsommation −
              pertes (si l’option de déduction est activée). Le report est automatique d’un mois à
              l’autre et d’une année à l’autre. Un stock négatif est signalé en rouge : il révèle
              généralement une vente ou une perte saisie par erreur.
            </p>
            <p className="mt-1.5">
              Les pertes de lait sont suivies séparément (1 litre = 2 fromages) et n’impactent pas
              directement le stock de pièces.
            </p>
          </div>
        </div>
        <div className="flex gap-3 border-t border-line/60 p-4">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-cream text-ink-soft">
            <IconInfo className="h-4 w-4" />
          </span>
          <div className="min-w-0 text-[12px] leading-relaxed text-ink-soft">
            <h2 className="text-[13px] font-bold text-ink">Application & données</h2>
            <p className="mt-1">
              Application Next.js / React / TypeScript. Les données sont conservées dans une base
              libSQL : {remote ? 'Turso, hébergée en ligne et persistante' : 'un fichier SQLite local'}.
              Les exports Excel contiennent de vraies formules (SOMME, MOYENNE, stocks ligne à
              ligne) et restent modifiables.
            </p>
            <p className="mt-1.5 text-[11px]">
              Sauvegarde recommandée chaque semaine :{' '}
              <strong className="text-ink">Réglages → Télécharger la sauvegarde (.json)</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
