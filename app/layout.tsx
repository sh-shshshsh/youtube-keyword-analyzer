import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YouTube Shorts 키워드 분석기",
  description: "YouTube 채널의 쇼츠 키워드를 분석하고 다음 키워드를 추천합니다",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
          rel="stylesheet"
        />
      </head>
      <body className="bg-zinc-950 text-zinc-100" style={{ fontFamily: "Pretendard, sans-serif" }}>
        {children}
      </body>
    </html>
  );
}
