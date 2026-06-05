import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "OC Setlist",
  description: "내가 만든 집에서 모두 함께 주박을 합시다"
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
