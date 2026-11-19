import HomeView from '@/components/HomeView';

export const revalidate = 300; // cache page

export default function HomePage() {
  return <HomeView />;
}
