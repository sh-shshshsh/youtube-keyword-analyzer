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
}
interface AnalysisResult {
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

  // 채널 검색
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

  // 채널 선택 후 분석 시작
  async function analyzeChannel(channel: Channel) {
    setSelectedChannel(channel);
    setChannels([]);
    setError("");
    setLoading("쇼츠 데이터 수집 및 분석 중... (1~2분 소요)");
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
    <main className="min-h-screen max-w-4xl mx-auto px-4 py-12">
      {/* 헤더 */}
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-2">
          <span className="text-red-500">YouTube Shorts</span> 키워드 분석기
        </h1>
        <p className="text-zinc-400">채널의 쇼츠 키워드를 분석하고 다음 키워드를 추천합니다</p>
      </div>

      {/* 검색 */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && searchChannel()}
          placeholder="채널명을 입력하세요 (예: 싱싱튼튼)"
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
        <div className="bg-red-900/30 border border-red-800 text-red-300 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {/* 채널 선택 리스트 */}
      {channels.length > 0 && (
        <div className="space-y-2 mb-6">
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
        <div className="space-y-8">
          {/* 요약 카드 */}
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "분석 영상", value: `${fmt(result.summary.totalVideos)}개` },
              { label: "총 조회수", value: `${fmt(result.summary.totalViews)}회` },
              { label: "평균 조회수", value: `${fmt(result.summary.avgViews)}회` },
            ].map((item) => (
              <div key={item.label} className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 text-center">
                <p className="text-zinc-500 text-sm mb-1">{item.label}</p>
                <p className="text-2xl font-bold">{item.value}</p>
              </div>
            ))}
          </div>

          {/* 제목 패턴 분석 */}
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-red-500 rounded-full inline-block" />
              제목 패턴 분석
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <PatternCard
                a={{ label: "숫자 포함", avg: result.patterns.numberAvg, count: result.patterns.numberCount }}
                b={{ label: "숫자 미포함", avg: result.patterns.noNumberAvg, count: result.patterns.noNumberCount }}
              />
              <PatternCard
                a={{ label: "질문형(?)", avg: result.patterns.questionAvg, count: result.patterns.questionCount }}
                b={{ label: "서술형", avg: result.patterns.statementAvg, count: result.patterns.statementCount }}
              />
            </div>
          </section>

          {/* 키워드 TOP 30 + TOP 20 */}
          <div className="grid grid-cols-2 gap-6">
            <section>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-red-500 rounded-full inline-block" />
                전체 키워드 TOP 30
              </h2>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                {result.allKeywords.map(([word, count], i) => (
                  <div key={word} className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 text-center text-sm font-bold ${i < 3 ? "text-red-400" : "text-zinc-500"}`}>
                        {i + 1}
                      </span>
                      <span className="font-medium">{word}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-red-500 rounded-full"
                          style={{ width: `${(count / result.allKeywords[0][1]) * 100}%` }}
                        />
                      </div>
                      <span className="text-zinc-400 text-sm w-10 text-right">{count}회</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <span className="w-1.5 h-6 bg-amber-500 rounded-full inline-block" />
                상위 20% 영상 키워드
              </h2>
              <div className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden">
                {result.topKeywords.map(([word, count], i) => (
                  <div key={word} className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800/50 last:border-0">
                    <div className="flex items-center gap-3">
                      <span className={`w-6 text-center text-sm font-bold ${i < 3 ? "text-amber-400" : "text-zinc-500"}`}>
                        {i + 1}
                      </span>
                      <span className="font-medium">{word}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${(count / result.topKeywords[0][1]) * 100}%` }}
                        />
                      </div>
                      <span className="text-zinc-400 text-sm w-10 text-right">{count}회</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* 조회수 TOP 10 */}
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-green-500 rounded-full inline-block" />
              조회수 TOP 10 영상
            </h2>
            <div className="space-y-2">
              {result.topVideos.map((v, i) => (
                <a
                  key={v.id}
                  href={`https://youtube.com/shorts/${v.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 p-4 bg-zinc-900 border border-zinc-800
                             hover:border-green-500/50 rounded-lg transition-colors"
                >
                  <span className={`text-lg font-bold mt-0.5 w-6 text-center ${i < 3 ? "text-green-400" : "text-zinc-500"}`}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{v.title}</p>
                    <div className="flex gap-4 mt-1 text-sm text-zinc-500">
                      <span>조회수 {fmt(v.views)}회</span>
                      <span>좋아요 {fmt(v.likes)}</span>
                      <span>{v.date}</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {v.keywords.map((kw, ki) => (
                        <span key={ki} className="px-2 py-0.5 bg-zinc-800 text-zinc-300 rounded text-xs">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </section>

          {/* 조회수 하위 10 */}
          <section>
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <span className="w-1.5 h-6 bg-zinc-600 rounded-full inline-block" />
              조회수 하위 10 영상 (피해야 할 패턴)
            </h2>
            <div className="space-y-2">
              {result.bottomVideos.map((v, i) => (
                <div
                  key={v.id}
                  className="flex items-start gap-4 p-3 bg-zinc-900/50 border border-zinc-800/50 rounded-lg opacity-70"
                >
                  <span className="text-sm text-zinc-600 w-6 text-center mt-0.5">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{v.title}</p>
                    <p className="text-xs text-zinc-600 mt-1">조회수 {fmt(v.views)}회 / {v.date}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 키워드 추천 */}
          <section className="bg-gradient-to-br from-red-950/30 to-zinc-900 border border-red-900/30 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">다음 키워드 추천</h2>
            <p className="text-zinc-400 text-sm mb-4">조회수 상위 20% 영상에서 반복적으로 등장하는 키워드입니다. 이 키워드를 중심으로 콘텐츠를 기획하세요.</p>
            <div className="flex flex-wrap gap-2">
              {result.recommendations.map(([word, count]) => (
                <span
                  key={word}
                  className="px-4 py-2 bg-red-600/20 border border-red-600/30 rounded-full text-red-300 font-medium"
                >
                  {word} <span className="text-red-500/60 text-sm ml-1">x{count}</span>
                </span>
              ))}
            </div>
          </section>
        </div>
      )}
    </main>
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
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5">
      <div className="flex justify-between items-end mb-3">
        <div>
          <p className={`text-sm ${winner === "a" ? "text-green-400 font-bold" : "text-zinc-400"}`}>
            {a.label} {winner === "a" && "+"}
          </p>
          <p className="text-xl font-bold">{fmt(a.avg)}회</p>
          <p className="text-xs text-zinc-500">{a.count}개 영상</p>
        </div>
        <p className="text-zinc-600 text-sm mb-1">vs</p>
        <div className="text-right">
          <p className={`text-sm ${winner === "b" ? "text-green-400 font-bold" : "text-zinc-400"}`}>
            {b.label} {winner === "b" && "+"}
          </p>
          <p className="text-xl font-bold">{fmt(b.avg)}회</p>
          <p className="text-xs text-zinc-500">{b.count}개 영상</p>
        </div>
      </div>
      <p className="text-center text-sm text-zinc-500">
        {winner === "a" ? a.label : b.label}이 <span className="text-green-400 font-bold">{ratio}배</span> 높음
      </p>
    </div>
  );
}
