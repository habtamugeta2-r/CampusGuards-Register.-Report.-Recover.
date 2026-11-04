'use client';

import { useState } from 'react';

/** Downloads everything CampusGuard holds about the signed-in student. */
export function ExportDataButton() {
  const [pending, setPending] = useState(false);

  return (
    <button
      className="btn-secondary btn-sm"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          const response = await fetch('/api/me/export');
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const anchor = document.createElement('a');
          anchor.href = url;
          anchor.download = `campusguard-my-data-${new Date().toISOString().slice(0, 10)}.json`;
          document.body.appendChild(anchor);
          anchor.click();
          anchor.remove();
          URL.revokeObjectURL(url);
        } finally {
          setPending(false);
        }
      }}
    >
      {pending ? 'Preparing…' : 'Download my data (JSON)'}
    </button>
  );
}
