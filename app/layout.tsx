import './globals.css';
import Providers from './providers';        // 👈 新增

export const metadata = {
  title: "LMS Booking Skeleton",
  description: "學生預約平台 (Next.js + Tailwind)",
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
