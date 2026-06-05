import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Oshi Tune Card Studio",
  description: "YouTube URL로 오타쿠 감성 곡 카드를 만드는 웹앱"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
