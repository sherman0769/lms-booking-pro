import './globals.css';
import type { Metadata, Viewport } from 'next';
import Providers from './providers';        // 👈 新增

const siteUrl = new URL('https://lms-booking-pro-5467.vercel.app');

export const metadata: Metadata = {
  metadataBase: siteUrl,
  title: "Li's Meet Pro Fitness｜個人行程與課程預約",
  description: '查看可預約時段、每週固定課與個人課程安排。',
  manifest: '/manifest.webmanifest',
  openGraph: {
    title: "Li's Meet Pro Fitness｜個人行程與課程預約",
    description: '查看可預約時段、每週固定課與個人課程安排。',
    url: '/',
    siteName: "Li's Meet Pro Fitness",
    images: [
      {
        url: '/og/front-og.png',
        width: 1200,
        height: 630,
        alt: "Li's Meet Pro Fitness 個人行程與課程預約",
      },
    ],
    locale: 'zh_TW',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: "Li's Meet Pro Fitness｜個人行程與課程預約",
    description: '查看可預約時段、每週固定課與個人課程安排。',
    images: ['/og/front-og.png'],
  },
  icons: {
    icon: [
      { url: '/favicon.ico' },
      { url: '/favicon.png', type: 'image/png', sizes: '64x64' },
      { url: '/icons/icon-192.png', type: 'image/png', sizes: '192x192' },
      { url: '/icons/icon-512.png', type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
  },
  appleWebApp: {
    capable: true,
    title: "Li's Meet",
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#1F3D36',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-Hant">
      <body className="min-h-screen bg-gray-50">
        {/* 用 Client Providers 包起來 */}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
