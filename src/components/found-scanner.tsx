'use client';

import { useState } from 'react';
import { PublicScanner } from './public-forms';
import { FoundReportForm } from './public-forms';

export function FoundScanner() {
  const [token, setToken] = useState<string | null>(null);

  if (token) {
    return (
      <>
        <p className="mb-3 text-sm text-slate-600">
          Code read: <span className="font-mono text-xs">{token}</span>{' '}
          <button onClick={() => setToken(null)} className="ml-2 text-xs font-medium text-brand-700 hover:underline">
            change
          </button>
        </p>
        <FoundReportForm token={token} showTokenField={false} />
      </>
    );
  }

  return (
    <div className="space-y-4">
      <PublicScanner onResult={setToken} />
      <div className="border-t border-slate-100 pt-4">
        <FoundReportForm showTokenField />
      </div>
    </div>
  );
}
