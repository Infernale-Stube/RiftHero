import ChampionDetailView from '@/components/ChampionDetailView';

export const revalidate = 300;

interface PageProps {
  params: {
    locale: string;
    champion: string;
  };
}

export default function ChampionPage({ params }: PageProps) {
  return <ChampionDetailView slug={params.champion} />;
}
