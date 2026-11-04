import type { ReactNode } from 'react';
import type { ProductType } from '@/lib/types';

/**
 * The CampusGuard icon set.
 *
 * Hand-inlined 24×24 outline glyphs (heroicons-style geometry) so the app has
 * zero icon dependencies, works offline, and every icon inherits currentColor
 * and the same stroke weight. All icons are decorative by default
 * (aria-hidden); label the control that contains them, not the icon itself.
 */

export type IconProps = { className?: string };

function Svg({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

export function ShieldIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 3.2 5 6v5.4c0 4.2 2.9 7.9 7 9.4 4.1-1.5 7-5.2 7-9.4V6l-7-2.8Z" />
      <path d="M9.2 12.2l2 2 3.6-4" />
    </Svg>
  );
}

export function HomeIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M2.25 12l8.954-8.955a1.126 1.126 0 011.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
    </Svg>
  );
}

export function LaptopIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />
    </Svg>
  );
}

export function PhoneIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M10.5 1.5H8.25A2.25 2.25 0 006 3.75v16.5a2.25 2.25 0 002.25 2.25h7.5A2.25 2.25 0 0018 20.25V3.75a2.25 2.25 0 00-2.25-2.25H13.5m-3 0V3h3V1.5m-3 0h3m-3 18.75h3" />
    </Svg>
  );
}

export function TabletIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M7.5 2.25h9A2.25 2.25 0 0118.75 4.5v15a2.25 2.25 0 01-2.25 2.25h-9A2.25 2.25 0 015.25 19.5v-15A2.25 2.25 0 017.5 2.25z" />
      <path d="M10.5 18.75h3" />
    </Svg>
  );
}

export function MonitorIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3.75 4.5h16.5a1.5 1.5 0 011.5 1.5v9a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5V6a1.5 1.5 0 011.5-1.5z" />
      <path d="M9 20.25h6M12 16.5v3.75" />
    </Svg>
  );
}

export function CameraIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
      <path d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
    </Svg>
  );
}

export function HeadphonesIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4.5 13.5V12a7.5 7.5 0 0115 0v1.5" />
      <path d="M4.5 13.5a2.25 2.25 0 00-2.25 2.25v1.5A2.25 2.25 0 004.5 19.5h.75a.75.75 0 00.75-.75v-4.5a.75.75 0 00-.75-.75H4.5zm15 0a2.25 2.25 0 012.25 2.25v1.5a2.25 2.25 0 01-2.25 2.25h-.75a.75.75 0 01-.75-.75v-4.5a.75.75 0 01.75-.75h.75z" />
    </Svg>
  );
}

export function WatchIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M17.25 12a5.25 5.25 0 11-10.5 0 5.25 5.25 0 0110.5 0z" />
      <path d="M12 9.75V12l1.5 1.5M9 6.9l.45-3.65h5.1L15 6.9M9 17.1l.45 3.65h5.1L15 17.1" />
    </Svg>
  );
}

export function CubeIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
    </Svg>
  );
}

export function TagIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
      <path d="M6 6h.008v.008H6V6z" />
    </Svg>
  );
}

export function FileTextIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </Svg>
  );
}

export function BellIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
    </Svg>
  );
}

export function SwapIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
    </Svg>
  );
}

export function LockIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
    </Svg>
  );
}

export function QrIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z" />
      <path d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z" />
    </Svg>
  );
}

export function ScanIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M7.5 3.75H6A2.25 2.25 0 003.75 6v1.5M16.5 3.75H18A2.25 2.25 0 0120.25 6v1.5m0 9V18A2.25 2.25 0 0118 20.25h-1.5m-9 0H6A2.25 2.25 0 013.75 18v-1.5" />
      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </Svg>
  );
}

export function HistoryIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
    </Svg>
  );
}

export function BookIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
    </Svg>
  );
}

export function ChartIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </Svg>
  );
}

export function UsersIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </Svg>
  );
}

export function UserIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </Svg>
  );
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
    </Svg>
  );
}

export function AuditIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M8.25 6.75h12M8.25 12h12m-12 5.25h12M3.75 6.75h.008v.008H3.75V6.75zm0 5.25h.008v.008H3.75V12zm0 5.25h.008v.008H3.75v-.008z" />
    </Svg>
  );
}

export function MapPinIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
      <path d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
    </Svg>
  );
}

export function BuildingIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </Svg>
  );
}

export function GlobeIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m-18.432 0A17.919 17.919 0 0112 16.5c3.162 0 6.133.815 8.716 2.247m-18.432 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
    </Svg>
  );
}

export function InboxIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M2.25 13.5h3.86a2.25 2.25 0 012.012 1.244l.256.512a2.25 2.25 0 002.013 1.244h3.218a2.25 2.25 0 002.013-1.244l.256-.512a2.25 2.25 0 012.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 00-2.15-1.588H6.911a2.25 2.25 0 00-2.15 1.588L2.35 13.177a2.25 2.25 0 00-.1.661z" />
    </Svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </Svg>
  );
}

export function PlusIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 4.5v15m7.5-7.5h-15" />
    </Svg>
  );
}

export function ArrowRightIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
    </Svg>
  );
}

export function ArrowLeftIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
    </Svg>
  );
}

export function DownloadIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
    </Svg>
  );
}

export function UploadIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </Svg>
  );
}

export function CheckIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M4.5 12.75l6 6 9-13.5" />
    </Svg>
  );
}

export function CheckCircleIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </Svg>
  );
}

export function AlertTriangleIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </Svg>
  );
}

export function AlertCircleIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
    </Svg>
  );
}

export function InfoIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
    </Svg>
  );
}

export function XIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M6 18L18 6M6 6l12 12" />
    </Svg>
  );
}

export function MenuIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
    </Svg>
  );
}

export function LogOutIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </Svg>
  );
}

export function WifiOffIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M3 3l18 18M8.288 15.038a5.25 5.25 0 017.424 0M5.106 11.856c3.807-3.808 9.98-3.808 13.788 0M1.924 8.674c5.565-5.565 14.587-5.565 20.152 0M12.53 18.22l-.53.53-.53-.53a.75.75 0 011.06 0z" />
    </Svg>
  );
}

export function RefreshIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </Svg>
  );
}

export function PrinterIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M6.72 13.829c-.24.03-.48.062-.72.096m.72-.096a42.415 42.415 0 0110.56 0m-10.56 0L6.34 18m10.94-4.171c.24.03.48.062.72.096m-.72-.096L17.66 18m0 0l.229 2.523a1.125 1.125 0 01-1.12 1.227H7.231c-.662 0-1.18-.568-1.12-1.227L6.34 18m11.318 0h1.091A2.25 2.25 0 0021 15.75V9.456c0-1.081-.768-2.015-1.837-2.175a48.055 48.055 0 00-1.913-.247M6.34 18H5.25A2.25 2.25 0 013 15.75V9.456c0-1.081.768-2.015 1.837-2.175a48.041 48.041 0 011.913-.247m10.5 0a48.536 48.536 0 00-10.5 0m10.5 0V3.375c0-.621-.504-1.125-1.125-1.125h-8.25c-.621 0-1.125.504-1.125 1.125v3.659M18 10.5h.008v.008H18V10.5z" />
    </Svg>
  );
}

export function EyeIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
      <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </Svg>
  );
}

export function KeyIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
    </Svg>
  );
}

export function ChevronRightIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </Svg>
  );
}

export function ExternalLinkIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
    </Svg>
  );
}

export function SparklesIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456z" />
    </Svg>
  );
}

export function HandIcon({ className }: IconProps) {
  return (
    <Svg className={className}>
      <path d="M10.05 4.575a1.575 1.575 0 10-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 013.15 0v1.5m-3.15 0l.075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 013.15 0V15M6.9 7.575a1.575 1.575 0 10-3.15 0v8.175a6.75 6.75 0 006.75 6.75h2.018a5.25 5.25 0 003.712-1.538l1.732-1.732a5.25 5.25 0 001.538-3.712l.003-2.024a.668.668 0 01.198-.471 1.575 1.575 0 10-2.228-2.228 3.818 3.818 0 00-1.12 2.687M6.9 7.575V12m6.27 4.318A4.49 4.49 0 0116.35 15m.002 0h-.002" />
    </Svg>
  );
}

/** Icon for a registered device type. */
export function DeviceTypeIcon({ type, className }: IconProps & { type: ProductType | string }) {
  switch (type) {
    case 'LAPTOP':
      return <LaptopIcon className={className} />;
    case 'PHONE':
      return <PhoneIcon className={className} />;
    case 'TABLET':
      return <TabletIcon className={className} />;
    case 'MONITOR':
      return <MonitorIcon className={className} />;
    case 'CAMERA':
      return <CameraIcon className={className} />;
    case 'AUDIO':
      return <HeadphonesIcon className={className} />;
    case 'WATCH':
      return <WatchIcon className={className} />;
    default:
      return <CubeIcon className={className} />;
  }
}
