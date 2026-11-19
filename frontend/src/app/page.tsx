import { fetchRecentSummoners } from '@/lib/api';
import HomeView from '@/components/HomeView';

export const revalidate = 0; // live data

export default async function HomePage() {
  const recentSummoners = await fetchRecentSummoners(9);

  return <HomeView recentSummoners={recentSummoners} />;
}
