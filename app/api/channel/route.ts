import { NextRequest, NextResponse } from "next/server";

// 채널 검색 API
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q");
  if (!q) return NextResponse.json({ error: "q 파라미터 필요" }, { status: 400 });

  const API_KEY = process.env.YOUTUBE_API_KEY;
  if (!API_KEY) return NextResponse.json({ error: "API 키 미설정" }, { status: 500 });

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("q", q);
  url.searchParams.set("type", "channel");
  url.searchParams.set("maxResults", "5");
  url.searchParams.set("key", API_KEY);

  const res = await fetch(url.toString());
  const data = await res.json();

  if (data.error) {
    return NextResponse.json({ error: data.error.message }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const channels = (data.items || []).map((item: any) => ({
    id: item.snippet.channelId,
    title: item.snippet.title,
    thumbnail: item.snippet.thumbnails?.["default"]?.url || "",
    description: item.snippet.description?.slice(0, 100) || "",
  }));

  return NextResponse.json({ channels });
}
