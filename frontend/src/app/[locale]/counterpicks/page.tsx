import { Suspense } from 'react';
import CounterPicksView from '@/components/CounterPicksView';

export const revalidate = 300;

export default function CounterPicksPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-[1600px] px-4 py-12 text-center text-zinc-400">
          Loading CounterPicks...
        </div>
      }
    >
      <CounterPicksView />
    </Suspense>
  );
}
