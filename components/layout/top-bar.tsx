interface TopBarProps {
  title: string;
  action?: React.ReactNode;
  back?: { href: string; label?: string };
}

export function TopBar({ title, action, back }: TopBarProps) {
  return (
    <header className="sticky top-0 z-40 bg-neutral-950/95 backdrop-blur border-b border-neutral-800 px-4 h-14 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {back && (
          <a
            href={back.href}
            className="text-neutral-400 hover:text-neutral-200 transition -ml-1 p-1"
          >
            <svg viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </a>
        )}
        <h1 className="text-base font-semibold tracking-tight">{title}</h1>
      </div>
      {action && <div>{action}</div>}
    </header>
  );
}
