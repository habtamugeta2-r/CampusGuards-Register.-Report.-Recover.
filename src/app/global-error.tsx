'use client';

/**
 * Last-resort boundary for errors in the root layout itself. It replaces the
 * layout, so it must render its own <html>/<body> and cannot rely on the
 * Tailwind stylesheet being present — inline styles only.
 */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#f6f7fb',
          color: '#0f172a',
          fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
          textAlign: 'center',
          padding: '24px',
        }}
      >
        <main>
          <p style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.12em', color: '#4f46e5', textTransform: 'uppercase' }}>
            CampusGuard
          </p>
          <h1 style={{ fontSize: 22, margin: '12px 0 8px' }}>Something went wrong</h1>
          <p style={{ fontSize: 14, color: '#475569', maxWidth: 420, margin: '0 auto', lineHeight: 1.6 }}>
            The application hit an unexpected error. Your data is safe — nothing was changed.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              padding: '10px 20px',
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
              background: '#4f46e5',
              border: 'none',
              borderRadius: 12,
              cursor: 'pointer',
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
