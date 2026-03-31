"use client";

import { useState } from "react";

interface Channel {
  id: string;
  title: string;
  thumbnail: string;
  description: string;
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
interface GroupResult {
  summary: { totalVideos: number; totalViews: number; avgViews: number };
  allKeywords: [string, number][];
  topKeywords: [string, number][];
  topVideos: VideoData[];
  bottomVideos: VideoData[];
  patterns: {
    numberAvg: number; numberCount: number;
    noNumberAvg: number; noNumberCount: number;
    questionAvg: number; questionCount: number;
    statementAvg: number; statementCount: number;
  };
  recommendations: [string, number][];
}
interface AnalysisResult {
  all: GroupResult;
  shorts: GroupResult;
  regular: GroupResult;
}

function fmt(n: number) {
  return n.toLocaleString("ko-KR");
}

export default function Home() {
  const [query, setQuery] = useState("");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<Channel | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  async function searchChannel() {
    if (!query.trim()) return;
    setError("");
    setLoading("채널 검색 중...");
    setChannels([]);
    setResult(null);
    setSelectedChannel(null);

    try {
      const res = await fetch(`/api/channel?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setChannels(data.channels);
    } catch (e) {
      setError(e instanceof Error ? e.message : "검색 실패");
    } finally {
      setLoading("");
    }
  }

  async function analyzeChannel(channel: Channel) {
    setSelectedChannel(channel);
    setChannels([]);
    setError("");
    setLoading("영상 데이터 수집 및 분석 중... (1~2분 소요)");
    setResult(null);

    try {
      const res = await fetch(`/api/analyze?channelId=${channel.id}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "분석 실패");
    } finally {
      setLoading("");
    }
  }

  return (
    <main className="min-h-screen max-w-7xl mx-auto px-4 py-12">
      {/* 헤더 */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-2">
          <span className="text-red-500">YouTube</span> 키워드 분석기
        </h1>
        <p className="text-zinc-400">채널의 쇼츠 + 일반 영상 키워드를 분석하고 다음 키워드를 추천합니다</p>
      </div>

      {/* 검색 */}
      <div className="flex gap-2 mb-6 max-w-2xl mx-auto">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && searchChannel()}
          placeholder="채널명을 입력하세요"
          className="flex-1 px-4 py-3 bg-zinc-900 border border-zinc-700 rounded-lg
                     focus:outline-none focus:border-red-500 text-zinc-100 placeholder-zinc-500"
        />
        <button
          onClick={searchChannel}
          disabled={!!loading}
          className="px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-zinc-700
                     rounded-lg font-medium transition-colors"
        >
          검색
        </button>
      </div>

      {/* 로딩 */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-4 border-red-500 border-t-transparent rounded-full animate-spin mb-4" />
          <p className="text-zinc-400">{loading}</p>
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg mb-6 max-w-2xl mx-auto">
          {error}
        </div>
      )}

      {/* 채널 선택 */}
      {channels.length > 0 && (
        <div className="space-y-2 mb-6 max-w-2xl mx-auto">
          <p className="text-zinc-400 text-sm mb-2">분석할 채널을 선택하세요:</p>
          {channels.map((ch) => (
            <button
              key={ch.id}
              onClick={() => analyzeChannel(ch)}
              className="w-full flex items-center gap-4 p-4 bg-zinc-900 border border-zinc-800
                         hover:border-red-500 rounded-lg transition-colors text-left"
            >
              {ch.thumbnail && (
                <img src={ch.thumbnail} alt="" className="w-10 h-10 rounded-full" />
              )}
              <div>
                <p className="font-medium">{ch.title}</p>
                <p className="text-zinc-500 text-sm">{ch.description}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 분석 결과 */}
      {result && selectedChannel && (
        <div className="space-y-10">
          {/* 전체 요약 */}
          <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto">
            <SummaryCard label="전체" data={result.all.summary} border="border-zinc-800" />
            <SummaryCard label="쇼츠" data={result.shorts.summary} border="border-rose-800/50" />
            <SummaryCard label="일반 영상" data={result.regular.summary} border="border-blue-800/50" />
          </div>

          {/* ===== 쇼츠 vs 일반 영상: 나란히 ===== */}
          <div className="grid grid-cols-2 gap-8">
            {/* 왼쪽: 쇼츠 */}
            <div className="space-y-8">
              <SectionHeader label="쇼츠 분석" color="bg-rose-500" count={result.shorts.summary.totalVideos} />

              {result.shorts.summary.totalVideos > 0 ? (
                <>
                  {/* 제목 패턴 */}
                  <PatternCard
                    a={{ label: "숫자 포함", avg: result.shorts.patterns.numberAvg, count: result.shorts.patterns.numberCount }}
                    b={{ label: "숫자 미포함", avg: result.shorts.patterns.noNumberAvg, count: result.shorts.patterns.noNumberCount }}
                  />

                  {/* 키워드 TOP */}
                  <div>
                    <h3 className="text-sm font-bold text-zinc-400 mb-3">전체 키워드 TOP 20</h3>
                    <KeywordList items={result.shorts.allKeywords.slice(0, 20)} barColor="bg-rose-500" topColor="text-rose-400" />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-zinc-400 mb-3">상위 20% 영상 키워드</h3>
                    <KeywordList items={result.shorts.topKeywords.slice(0, 15)} barColor="bg-amber-500" topColor="text-amber-400" />
                  </div>

                  {/* TOP 10 영상 */}
                  <div>
                    <h3 className="text-sm font-bold text-zinc-400 mb-3">조회수 TOP 10</h3>
                    <VideoList videos={result.shorts.topVideos} type="top" />
                  </div>

                  {/* 하위 영상 */}
                  <div>
                    <h3 className="text-sm font-bold text-zinc-400 mb-3">조회수 하위 (피해야 할 패턴)</h3>
                    <VideoList videos={result.shorts.bottomVideos} type="bottom" />
                  </div>

                  {/* 추천 */}
                  {result.shorts.recommendations.length > 0 && (
                    <RecommendBox items={result.shorts.recommendations} label="쇼츠" color="rose" />
                  )}
                </>
              ) : (
                <Empty />
              )}
            </div>

            {/* 오른쪽: 일반 영상 */}
            <div className="space-y-8">
              <SectionHeader label="일반 영상 분석" color="bg-blue-500" count={result.regular.summary.totalVideos} />

              {result.regular.summary.totalVideos > 0 ? (
                <>
                  <PatternCard
                    a={{ label: "숫자 포함", avg: result.regular.patterns.numberAvg, count: result.regular.patterns.numberCount }}
                    b={{ label: "숫자 미포함", avg: result.regular.patterns.noNumberAvg, count: result.regular.patterns.noNumberCount }}
                  />

                  <div>
                    <h3 className="text-sm font-bold text-zinc-400 mb-3">전체 키워드 TOP 20</h3>
                    <KeywordList items={result.regular.allKeywords.slice(0, 20)} barColor="bg-blue-500" topColor="text-blue-400" />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-zinc-400 mb-3">상위 20% 영상 키워드</h3>
                    <KeywordList items={result.regular.topKeywords.slice(0, 15)} barColor="bg-amber-500" topColor="text-amber-400" />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-zinc-400 mb-3">조회수 TOP 10</h3>
                    <VideoList videos={result.regular.topVideos} type="top" />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-zinc-400 mb-3">조회수 하위 (피해야 할 패턴)</h3>
                    <VideoList videos={result.regular.bottomVideos} type="bottom" />
                  </div>

                  {result.regular.recommendations.length > 0 && (
                    <RecommendBox items={result.regular.recommendations} label="일반 영상" color="blue" />
                  )}
                </>
              ) : (
                <Empty />
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

/* ===== 컴포넌트 ===== */

function SummaryCard({
  label,
  data,
  border,
}: {
  label: string;
  data: { totalVideos: number; totalViews: number; avgViews: number };
  border: string;
}) {
  return (
    <div className={`bg-zinc-900 border ${border} rounded-lg p-5`}>
      <p className="text-zinc-500 text-xs mb-2">{label}</p>
      <p className="text-2xl font-bold">
        {fmt(data.totalVideos)}<span className="text-sm text-zinc-500 font-normal">개</span>
      </p>
      <div className="flex justify-between mt-1 text-xs text-zinc-500">
        <span>총 {fmt(data.totalViews)}회</span>
        <span>평균 {fmt(data.avgViews)}회</span>
      </div>
    </div>
  );
}

function SectionHeader({ label, color, count }: { label: string; color: string; count: number }) {
  return (
    <div className="flex items-center gap-3 pb-4 border-b border-zinc-800">
      <span className={`w-2 h-8 ${color} rounded-full`} />
      <h2 className="text-xl font-bold">{label}</h2>
      <span className="text-sm text-zinc-500">{fmt(count)}개 영상</span>
    </div>
  );
}

function KeywordList({
  items,
  barColor,
  topColor,
}: {
  items: [string, number][];
  barColor: string;
  topColor: string;
}) {
  if (items.length === 0) return <p className="text-zinc-600 text-sm py-2">데이터 없음</p>;
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
      {items.map(([word, count], i) => (
        <div key={word} className="flex items-center justify-between px-4 py-2 border-b border-zinc-800/50 last:border-0">
          <div className="flex items-center gap-3">
            <span className={`w-5 text-center text-xs font-bold ${i < 3 ? topColor : "text-zinc-500"}`}>
              {i + 1}
            </span>
            <span className="text-sm font-medium">{word}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-20 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className={`h-full ${barColor} rounded-full`}
                style={{ width: `${(count / items[0][1]) * 100}%` }}
              />
            </div>
            <span className="text-zinc-400 text-xs w-8 text-right">{count}회</span>
          </div>
        </div>
      ))}
    </div>
  );
}

function VideoList({ videos, type }: { videos: VideoData[]; type: "top" | "bottom" }) {
  if (videos.length === 0) return <p className="text-zinc-600 text-sm py-2">데이터 없음</p>;

  if (type === "bottom") {
    return (
      <div className="space-y-1.5">
        {videos.map((v, i) => (
          <div key={v.id} className="flex items-start gap-3 p-2.5 bg-zinc-900/50 border border-zinc-800/50 rounded-lg opacity-70">
            <span className="text-xs text-zinc-600 w-4 text-center mt-0.5">{i + 1}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs truncate">{v.title}</p>
              <p className="text-[10px] text-zinc-600 mt-0.5">조회수 {fmt(v.views)}회 / {v.date}</p>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {videos.map((v, i) => (
        <a
          key={v.id}
          href={v.type === "shorts" ? `https://youtube.com/shorts/${v.id}` : `https://youtube.com/watch?v=${v.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-start gap-3 p-3 bg-zinc-900 border border-zinc-800
                     hover:border-zinc-600 rounded-lg transition-colors block"
        >
          <span className={`text-sm font-bold mt-0.5 w-5 text-center ${i < 3 ? "text-green-400" : "text-zinc-500"}`}>
            {i + 1}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{v.title}</p>
            <div className="flex gap-3 mt-1 text-xs text-zinc-500">
              <span>{fmt(v.views)}회</span>
              <span>좋아요 {fmt(v.likes)}</span>
              <span>{v.date}</span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {v.keywords.map((kw, ki) => (
                <span key={ki} className="px-1.5 py-0.5 bg-zinc-800 text-zinc-400 rounded text-[10px]">
                  {kw}
                </span>
              ))}
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}

function RecommendBox({
  items,
  label,
  color,
}: {
  items: [string, number][];
  label: string;
  color: "rose" | "blue";
}) {
  const bg = color === "rose" ? "from-rose-950/30" : "from-blue-950/30";
  const border = color === "rose" ? "border-rose-900/30" : "border-blue-900/30";
  const tagBg = color === "rose" ? "bg-rose-600/20 border-rose-600/30 text-rose-300" : "bg-blue-600/20 border-blue-600/30 text-blue-300";
  const countColor = color === "rose" ? "text-rose-500/60" : "text-blue-500/60";

  return (
    <div className={`bg-gradient-to-br ${bg} to-zinc-900 border ${border} rounded-xl p-5`}>
      <h3 className="text-base font-bold mb-2">{label} 다음 키워드 추천</h3>
      <p className="text-zinc-400 text-xs mb-3">조회수 상위 20% 영상의 반복 키워드</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map(([word, count]) => (
          <span key={word} className={`px-3 py-1.5 border rounded-full text-sm font-medium ${tagBg}`}>
            {word} <span className={`text-xs ml-1 ${countColor}`}>x{count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function PatternCard({
  a,
  b,
}: {
  a: { label: string; avg: number; count: number };
  b: { label: string; avg: number; count: number };
}) {
  const winner = a.avg >= b.avg ? "a" : "b";
  const ratio = Math.max(a.avg, b.avg) > 0
    ? (Math.max(a.avg, b.avg) / Math.max(Math.min(a.avg, b.avg), 1)).toFixed(1)
    : "0";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-4">
      <div className="flex justify-between items-end mb-2">
        <div>
          <p className={`text-xs ${winner === "a" ? "text-green-400 font-bold" : "text-zinc-400"}`}>
            {a.label} {winner === "a" && "+"}
          </p>
          <p className="text-lg font-bold">{fmt(a.avg)}회</p>
          <p className="text-[10px] text-zinc-500">{a.count}개</p>
        </div>
        <p className="text-zinc-600 text-xs mb-1">vs</p>
        <div className="text-right">
          <p className={`text-xs ${winner === "b" ? "text-green-400 font-bold" : "text-zinc-400"}`}>
            {b.label} {winner === "b" && "+"}
          </p>
          <p className="text-lg font-bold">{fmt(b.avg)}회</p>
          <p className="text-[10px] text-zinc-500">{b.count}개</p>
        </div>
      </div>
      <p className="text-center text-xs text-zinc-500">
        {winner === "a" ? a.label : b.label}이 <span className="text-green-400 font-bold">{ratio}배</span> 높음
      </p>
    </div>
  );
}

function Empty() {
  return <p className="text-zinc-600 text-center py-8">해당 유형의 영상이 없습니다</p>;
}
