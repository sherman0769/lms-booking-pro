import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: "Li's Meet Coach Dashboard｜教練排程管理後台",
  description: '管理固定課、單次停課與排程健康檢查。',
  openGraph: {
    title: "Li's Meet Coach Dashboard｜教練排程管理後台",
    description: '管理固定課、單次停課與排程健康檢查。',
    url: '/coach',
    images: [
      {
        url: '/og/coach-og.png',
        width: 1200,
        height: 630,
        alt: "Li's Meet Coach Dashboard 教練排程管理後台",
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: "Li's Meet Coach Dashboard｜教練排程管理後台",
    description: '管理固定課、單次停課與排程健康檢查。',
    images: ['/og/coach-og.png'],
  },
};

export default function CoachLayout({ children }: { children: React.ReactNode }) {
  return children;
}
