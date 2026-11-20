import { Suspense } from 'react';
import ItemsListView from '@/components/ItemsListView';

export const revalidate = 300;

export default function ItemsPage() {
  return (
    <Suspense fallback={null}>
      <ItemsListView />
    </Suspense>
  );
}
