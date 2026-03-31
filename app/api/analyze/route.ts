import { NextRequest, NextResponse } from "next/server";

const API_KEY = process.env.YOUTUBE_API_KEY || "";

const STOPWORDS = new Set([
  "이", "그", "저", "을", "를", "에", "의", "로", "와", "과", "도", "는", "은", "가",
  "한", "할", "하는", "합니다", "있는", "없는", "이런", "저런", "그런",
  "더", "매우", "정말", "진짜", "너무", "완전", "아주",
  "the", "a", "an", "is", "are", "in", "on", "for", "and", "or", "but",
  "shorts", "short", "쇼츠", "구독", "좋아요",
]);

interface YTSearchItem {
  id: { videoId: string };
  snippet: { title: string; publishedAt: string };
}
interface YTVideoItem {
  id: string;
  contentDetails: { duration: string };
  statistics: { viewCount?: string; likeCount?: string; commentCount?: string };
}
interface VideoData {
  id: string;
  title: string;
  date: string;
  views: number;
  likes: number;
  keywords: string[];
  type: "shorts" | "regular";
}

// ISO 8601 duration을 초로 변환
function parseDuration(iso: string): number {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const h = parseInt(match[1] || "0");
  const m = parseInt(match[2] || "0");
  const s = parseInt(match[3] || "0");
  return h * 3600 + m * 60 + s;
}

// 쇼츠 + 일반영상 모두 수집 (duration 필터 없이)
async function fetchVideos(channelId: string, max: number = 200): Promise<YTSearchItem[]> {
  const videos: YTSearchItem[] = [];
  let pageToken = "";

  while (videos.length < max) {
    const url = new URL("https://www.googleapis.com/youtube/v3/search");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("channelId", channelId);
    url.searchParams.set("order", "date");
    url.searchParams.set("type", "video");
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("key", API_KEY);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.toString());
    const data = await res.json();
    if (data.error) throw new Error(data.error.message);

    const items: YTSearchItem[] = data.items || [];
    if (items.length === 0) break;
    videos.push(...items);

    pageToken = data.nextPageToken || "";
    if (!pageToken) break;
  }

  return videos.slice(0, max);
}

// 통계 + contentDetails(duration) 한번에 수집
async function fetchDetails(videoIds: string[]): Promise<Record<string, { views: number; likes: number; duration: number }>> {
  const details: Record<string, { views: number; likes: number; duration: number }> = {};

  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "statistics,contentDetails");
    url.searchParams.set("id", batch.join(","));
    url.searchParams.set("key", API_KEY);

    const res = await fetch(url.toString());
    const data = await res.json();

    for (const item of (data.items || []) as YTVideoItem[]) {
      details[item.id] = {
        views: parseInt(item.statistics.viewCount || "0"),
        likes: parseInt(item.statistics.likeCount || "0"),
        duration: parseDuration(item.contentDetails.duration),
      };
    }
  }

  return details;
}

function extractKeywords(title: string): string[] {
  const matches = title.match(/[가-힣]{2,}|[a-zA-Z]{2,}/g) || [];
  return matches.filter((w) => !STOPWORDS.has(w.toLowerCase()));
}

function countKeywords(words: string[]): [string, number][] {
  const map: Record<string, number> = {};
  for (const w of words) {
    map[w] = (map[w] || 0) + 1;
  }
  return Object.entries(map).sort((a, b) => b[1] - a[1]);
}

function analyzeGroup(videoData: VideoData[]) {
  const allKeywords: string[] = [];
  const topKeywords: string[] = [];

  const viewCounts = videoData.map((v) => v.views).sort((a, b) => b - a);
  const topThreshold = viewCounts[Math.floor(viewCounts.length / 5)] || 0;

  for (const v of videoData) {
    allKeywords.push(...v.keywords);
    if (v.views >= topThreshold) topKeywords.push(...v.keywords);
  }

  const allKw = countKeywords(allKeywords);
  const topKw = countKeywords(topKeywords);
  const sortedVideos = [...videoData].sort((a, b) => b.views - a.views);

  const withNumber = videoData.filter((v) => /\d/.test(v.title));
  const withoutNumber = videoData.filter((v) => !/\d/.test(v.title));
  const withQuestion = videoData.filter((v) => v.title.includes("?"));
  const withoutQuestion = videoData.filter((v) => !v.title.includes("?"));

  const avg = (arr: VideoData[]) =>
    arr.length ? Math.round(arr.reduce((s, v) => s + v.views, 0) / arr.length) : 0;

  return {
    summary: {
      totalVideos: videoData.length,
      totalViews: videoData.reduce((s, v) => s + v.views, 0),
      avgViews: avg(videoData),
    },
    allKeywords: allKw.slice(0, 30),
    topKeywords: topKw.slice(0, 20),
    topVideos: sortedVideos.slice(0, 10),
    bottomVideos: sortedVideos.slice(-10).reverse(),
    patterns: {
      numberAvg: avg(withNumber),
      numberCount: withNumber.length,
      noNumberAvg: avg(withoutNumber),
      noNumberCount: withoutNumber.length,
      questionAvg: avg(withQuestion),
      questionCount: withQuestion.length,
      statementAvg: avg(withoutQuestion),
      statementCount: withoutQuestion.length,
    },
    recommendations: topKw.slice(0, 10),
  };
}

export async function GET(req: NextRequest) {
  const channelId = req.nextUrl.searchParams.get("channelId");
  if (!channelId) return NextResponse.json({ error: "channelId 필요" }, { status: 400 });
  if (!API_KEY) return NextResponse.json({ error: "API 키 미설정" }, { status: 500 });

  try {
    // 1) 모든 영상 수집
    const allVideos = await fetchVideos(channelId);
    if (allVideos.length === 0) {
      return NextResponse.json({ error: "영상을 찾을 수 없습니다" }, { status: 404 });
    }

    // 2) 상세정보 수집 (조회수 + duration)
    const videoIds = allVideos.map((s) => s.id.videoId);
    const details = await fetchDetails(videoIds);

    // 3) 영상 데이터 구성 + 쇼츠/일반 분류 (60초 이하 = 쇼츠)
    const videoData: VideoData[] = [];
    for (const s of allVideos) {
      const vid = s.id.videoId;
      const title = s.snippet.title.replace(/&#39;/g, "'").replace(/&amp;/g, "&").replace(/&quot;/g, '"');
      const keywords = extractKeywords(title);
      const d = details[vid];
      if (!d) continue;

      videoData.push({
        id: vid,
        title,
        date: s.snippet.publishedAt.slice(0, 10),
        views: d.views,
        likes: d.likes,
        keywords,
        type: d.duration <= 60 ? "shorts" : "regular",
      });
    }

    const shortsData = videoData.filter((v) => v.type === "shorts");
    const regularData = videoData.filter((v) => v.type === "regular");

    // 4) 그룹별 분석
    return NextResponse.json({
      all: analyzeGroup(videoData),
      shorts: analyzeGroup(shortsData),
      regular: analyzeGroup(regularData),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "알 수 없는 오류";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
