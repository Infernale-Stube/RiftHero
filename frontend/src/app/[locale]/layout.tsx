import { ReactNode } from 'react';

export function generateStaticParams() {
  return [{ locale: 'de' }, { locale: 'en' }];
}

export default function LocaleLayout({
  children,
}: {
  children: ReactNode;
  params: { locale: string };
}) {
  return <>{children}</>;
}
