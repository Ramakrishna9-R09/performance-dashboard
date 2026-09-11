import { Suspense } from 'react';
import { generateInitialDataset, INITIAL_COUNT } from '@/lib/dataGenerator';
import Dashboard from '@/components/dashboard/Dashboard';

/**
 * Server Component: generates the deterministic initial dataset on the
 * server so the client hydrates with real data on first paint (no spinner
 * waterfall). All interactivity lives in the client <Dashboard /> subtree.
 */
export default async function DashboardPage() {
  const initialData = generateInitialDataset(INITIAL_COUNT, 42);

  return (
    <Suspense fallback={<div className="page"><div className="skeleton">Loading live dashboard…</div></div>}>
      <Dashboard initialData={initialData} />
    </Suspense>
  );
}
