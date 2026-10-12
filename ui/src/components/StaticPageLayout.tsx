import { Helmet } from 'react-helmet';
import type { ReactNode } from 'react';
import { APP_NAME } from '../constants/brand';

type Props = {
  title: string;
  description: string;
  children: ReactNode;
  maxWidth?: 'md' | 'lg' | 'xl' | '2xl' | '4xl';
};

const widthClass = {
  md: 'max-w-2xl',
  lg: 'max-w-3xl',
  xl: 'max-w-4xl',
  '2xl': 'max-w-5xl',
  '4xl': 'max-w-4xl',
} as const;

export default function StaticPageLayout({
  title,
  description,
  children,
  maxWidth = '4xl',
}: Props) {
  const fullTitle = title.includes(APP_NAME) ? title : `${title} - ${APP_NAME}`;

  return (
    <>
      <Helmet>
        <title>{fullTitle}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={fullTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:type" content="website" />
      </Helmet>
      <div className="container mx-auto px-4 py-16 text-white bg-[#2b2b2b] min-h-[60vh]">
        <div className={`${widthClass[maxWidth]} mx-auto`}>{children}</div>
      </div>
    </>
  );
}
