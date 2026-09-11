'use client';

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="page">
      <div className="card">
        <h2>Dashboard failed to load</h2>
        <p className="hint">{error.message || 'Unexpected error during render.'}</p>
        <button className="btn" onClick={reset}>
          Retry
        </button>
      </div>
    </div>
  );
}
