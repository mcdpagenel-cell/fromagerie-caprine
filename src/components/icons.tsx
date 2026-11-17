import type { SVGProps } from 'react';

type P = SVGProps<SVGSVGElement>;

function base(props: P) {
  return {
    xmlns: 'http://www.w3.org/2000/svg',
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    ...props,
  };
}

export function IconCalendar(p: P) {
  return (
    <svg {...base(p)}>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M8 3v4M16 3v4M3 10h18" />
      <path d="M8 14h2M14 14h2M8 17.5h2M14 17.5h2" />
    </svg>
  );
}

export function IconGrid(p: P) {
  return (
    <svg {...base(p)}>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" />
    </svg>
  );
}

export function IconChart(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </svg>
  );
}

export function IconSettings(p: P) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.03 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 8.9 19.3a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.03H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.7 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34H9a1.7 1.7 0 0 0 1-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.03 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c.3.62.9 1 1.56 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1Z" />
    </svg>
  );
}

export function IconChevronLeft(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M15 5l-7 7 7 7" />
    </svg>
  );
}

export function IconChevronRight(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M9 5l7 7-7 7" />
    </svg>
  );
}

export function IconPlus(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export function IconMinus(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M5 12h14" />
    </svg>
  );
}

export function IconDownload(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M12 3v12m0 0 4.5-4.5M12 15l-4.5-4.5" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

export function IconCheck(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M4.5 12.5l5 5 10-11" />
    </svg>
  );
}

export function IconAlert(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}

export function IconSheet(p: P) {
  return (
    <svg {...base(p)}>
      <rect x="3" y="3" width="18" height="18" rx="2.5" />
      <path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
    </svg>
  );
}

export function IconDroplet(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M12 3s6 6.2 6 10.5A6 6 0 0 1 6 13.5C6 9.2 12 3 12 3Z" />
    </svg>
  );
}

export function IconWheel(p: P) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="3.4" />
      <path d="M12 3v5.5M12 15.5V21M3 12h5.5M15.5 12H21" />
    </svg>
  );
}

export function IconBasket(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M4 9h16l-1.6 9.2a2 2 0 0 1-2 1.8H7.6a2 2 0 0 1-2-1.8L4 9Z" />
      <path d="M8.5 9 11 3.5M15.5 9 13 3.5M9.5 13v3M14.5 13v3" />
    </svg>
  );
}

export function IconTrash(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M3.5 6.5h17M9 6.5V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2.5" />
      <path d="M5.5 6.5 6.8 20a1.6 1.6 0 0 0 1.6 1.5h7.2a1.6 1.6 0 0 0 1.6-1.5l1.3-13.5" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function IconSave(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M5 3h11l4 4v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M8 3v6h7V3M8 21v-7h8v7" />
    </svg>
  );
}

export function IconInfo(p: P) {
  return (
    <svg {...base(p)}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  );
}

export function IconUpload(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M12 17V5m0 0 4.5 4.5M12 5 7.5 9.5" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}

export function IconArrowUp(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M12 19V5m0 0 6 6M12 5l-6 6" />
    </svg>
  );
}

export function IconArrowDown(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M12 5v14m0 0 6-6M12 19l-6-6" />
    </svg>
  );
}

export function IconLogout(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" />
      <path d="M9 8l-4 4 4 4M5 12h10" />
    </svg>
  );
}

export function IconLeaf(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M20 4C10 4 4 9 4 16c0 2 1 4 1 4s3-7 15-9" />
      <path d="M5 20c0-5 3-9 9-12" />
    </svg>
  );
}

export function IconHome(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M3.5 10.5 12 3l8.5 7.5" />
      <path d="M5.5 9.5V20a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </svg>
  );
}

export function IconFlame(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M12 21c4 0 7-2.7 7-6.5 0-3-1.6-5-3.4-6.8C14.2 6.3 13 4.6 13 2c0 0-5 3-5 8 0 1.4.4 2.4 1 3-1.4.2-2.6-.7-3.2-1.8-.5 1-.8 2.1-.8 3.3C5 18.3 8 21 12 21Z" />
    </svg>
  );
}

export function IconPencil(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

export function IconEuro(p: P) {
  return (
    <svg {...base(p)}>
      <path d="M4 10h7M4 14h7" />
      <path d="M19 6a7.7 7.74 0 0 0-12 6 7.7 7.74 0 0 0 12 6" />
    </svg>
  );
}
