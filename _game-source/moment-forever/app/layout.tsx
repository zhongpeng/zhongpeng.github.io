import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'Moment & Forever · 潮汐之间',
  description:
    '在一座会呼吸的小岛上，走过童年、相遇与后来的自己。关于瞬间、选择与和解的治愈探索游戏。',
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
