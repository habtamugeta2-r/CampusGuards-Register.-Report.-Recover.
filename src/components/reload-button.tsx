'use client';

export function ReloadButton({ className = 'btn-secondary' }: { className?: string }) {
  return (
    <button type="button" className={className} onClick={() => window.location.reload()}>
      Try again
    </button>
  );
}
