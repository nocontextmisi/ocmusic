"use client";

import { ChangeEvent, useMemo, useState } from "react";

type SongCard = {
  id: string;
  youtubeUrl: string;
  videoId: string;
  title: string;
  artist: string;
  comment: string;
  characters: string[];
};

const emptyCard = (): SongCard => ({
  id: crypto.randomUUID(),
  youtubeUrl: "",
  videoId: "",
  title: "",
  artist: "",
  comment: "",
  characters: []
});

function extractVideoId(input: string) {
  const trimmed = input.trim();

  if (!trimmed) {
    return "";
  }

  try {
    const url = new URL(trimmed);
    const host = url.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return url.pathname.split("/").filter(Boolean)[0] ?? "";
    }

    if (host.endsWith("youtube.com")) {
      if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) {
        return url.pathname.split("/").filter(Boolean)[1] ?? "";
      }

      return url.searchParams.get("v") ?? "";
    }
  } catch {
    const directId = trimmed.match(/^[a-zA-Z0-9_-]{11}$/);
    return directId ? directId[0] : "";
  }

  return "";
}

function thumbnailUrl(videoId: string) {
  return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : "";
}

function proxiedImageUrl(url: string) {
  return `/api/image?url=${encodeURIComponent(url)}`;
}

function readFiles(files: FileList | null) {
  if (!files) {
    return Promise.resolve<string[]>([]);
  }

  return Promise.all(
    Array.from(files).map(
      (file) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
    )
  );
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  const tokens = text.split(/(\s+)/).filter(Boolean);
  const lines: string[] = [];
  let line = "";

  for (const token of tokens) {
    const trial = `${line}${token}`;
    if (ctx.measureText(trial).width > maxWidth && line) {
      lines.push(line.trim());
      line = token.trimStart();
    } else {
      line = trial;
    }

    if (lines.length === maxLines) {
      break;
    }
  }

  if (line && lines.length < maxLines) {
    lines.push(line.trim());
  }

  lines.forEach((lineText, index) => {
    const suffix = index === maxLines - 1 && lines.length === maxLines && tokens.join("").length > lines.join("").length ? "..." : "";
    ctx.fillText(`${lineText}${suffix}`, x, y + index * lineHeight);
  });
}

async function exportCards(cards: SongCard[]) {
  const visibleCards = cards.filter((card) => card.videoId || card.title || card.artist || card.comment || card.characters.length);

  if (!visibleCards.length) {
    return;
  }

  const width = 1200;
  const cardHeight = 520;
  const gap = 44;
  const padding = 52;
  const height = padding * 2 + visibleCards.length * cardHeight + (visibleCards.length - 1) * gap;
  const canvas = document.createElement("canvas");
  const scale = 2;
  canvas.width = width * scale;
  canvas.height = height * scale;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return;
  }

  ctx.scale(scale, scale);
  ctx.fillStyle = "#fff8fb";
  ctx.fillRect(0, 0, width, height);

  for (let y = 0; y < height; y += 28) {
    ctx.strokeStyle = "rgba(71, 90, 150, 0.08)";
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }

  for (let x = 0; x < width; x += 28) {
    ctx.strokeStyle = "rgba(71, 90, 150, 0.08)";
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  ctx.textBaseline = "top";

  for (const [index, card] of visibleCards.entries()) {
    const cardY = padding + index * (cardHeight + gap);

    ctx.save();
    ctx.shadowColor = "rgba(27, 37, 89, 0.16)";
    ctx.shadowBlur = 26;
    ctx.shadowOffsetY = 14;
    ctx.fillStyle = "#ffffff";
    roundedRect(ctx, 44, cardY, width - 88, cardHeight, 28);
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = "#ff7bac";
    ctx.lineWidth = 3;
    roundedRect(ctx, 44, cardY, width - 88, cardHeight, 28);
    ctx.stroke();

    const thumb = thumbnailUrl(card.videoId);
    if (thumb) {
      try {
        const image = await loadImage(proxiedImageUrl(thumb));
        ctx.save();
        roundedRect(ctx, 78, cardY + 58, 430, 242, 22);
        ctx.clip();
        ctx.drawImage(image, 78, cardY + 58, 430, 242);
        ctx.restore();
      } catch {
        ctx.fillStyle = "#eef5ff";
        roundedRect(ctx, 78, cardY + 58, 430, 242, 22);
        ctx.fill();
      }
    }

    ctx.fillStyle = "#ffedf5";
    roundedRect(ctx, 78, cardY + 326, 430, 122, 20);
    ctx.fill();

    const characterSlots = card.characters.slice(0, 5);
    for (let slot = 0; slot < 5; slot += 1) {
      const size = 76;
      const x = 98 + slot * 80;
      const y = cardY + 348;

      ctx.fillStyle = "#ffffff";
      roundedRect(ctx, x, y, size, size, 18);
      ctx.fill();

      if (characterSlots[slot]) {
        try {
          const image = await loadImage(characterSlots[slot]);
          ctx.save();
          roundedRect(ctx, x, y, size, size, 18);
          ctx.clip();
          ctx.drawImage(image, x, y, size, size);
          ctx.restore();
        } catch {
          ctx.fillStyle = "#f7dce8";
          ctx.fillRect(x, y, size, size);
        }
      }
    }

    ctx.fillStyle = "#ff4f95";
    ctx.font = "700 24px Arial";
    ctx.fillText(`#${String(index + 1).padStart(2, "0")}  推し TUNE`, 552, cardY + 60);

    ctx.fillStyle = "#241d3f";
    ctx.font = "800 48px Arial";
    drawWrappedText(ctx, card.title || "Untitled Song", 552, cardY + 104, 560, 56, 2);

    ctx.fillStyle = "#45506f";
    ctx.font = "700 28px Arial";
    ctx.fillText(card.artist || "Artist", 552, cardY + 226);

    ctx.fillStyle = "#f4fbff";
    roundedRect(ctx, 552, cardY + 286, 526, 134, 20);
    ctx.fill();

    ctx.fillStyle = "#303854";
    ctx.font = "500 24px Arial";
    drawWrappedText(ctx, card.comment || "코멘트를 입력해 주세요.", 580, cardY + 314, 472, 34, 3);
  }

  const link = document.createElement("a");
  link.download = "oshi-tune-cards.png";
  link.href = canvas.toDataURL("image/png");
  link.click();
}

export default function Home() {
  const [cards, setCards] = useState<SongCard[]>([emptyCard()]);
  const hasExportableCards = useMemo(
    () => cards.some((card) => card.videoId || card.title || card.artist || card.comment || card.characters.length),
    [cards]
  );

  const updateCard = (id: string, patch: Partial<SongCard>) => {
    setCards((current) => current.map((card) => (card.id === id ? { ...card, ...patch } : card)));
  };

  const handleYoutubeUrl = (id: string, value: string) => {
    updateCard(id, {
      youtubeUrl: value,
      videoId: extractVideoId(value)
    });
  };

  const handleCharacterUpload = async (id: string, event: ChangeEvent<HTMLInputElement>) => {
    const images = await readFiles(event.target.files);
    updateCard(id, {
      characters: [...(cards.find((card) => card.id === id)?.characters ?? []), ...images]
    });
    event.target.value = "";
  };

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-10">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="overflow-hidden rounded-[28px] border-2 border-pink-200 bg-white/86 shadow-kawaii backdrop-blur">
          <div className="checker flex flex-col gap-5 px-5 py-6 sm:px-8 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.28em] text-pink-500">Oshi Tune Card Studio</p>
              <h1 className="mt-3 text-3xl font-black text-[#241d3f] sm:text-5xl">OC 세트리스트</h1>
              <p className="mt-3 max-w-2xl text-sm font-semibold leading-6 text-[#56607d] sm:text-base">
                테마곡이나 어울리는 곡들을 추천합시다...ദ്ദി ՞• ·̫ •՞ ꒱
              </p>
            </div>
            <button
              className="h-12 rounded-full bg-[#241d3f] px-6 text-sm font-black text-white shadow-lg shadow-pink-200 transition hover:-translate-y-0.5 hover:bg-[#ff4f95] disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={!hasExportableCards}
              onClick={() => exportCards(cards)}
            >
              전체 PNG 저장
            </button>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
          <section className="flex flex-col gap-5">
            {cards.map((card, index) => (
              <article key={card.id} className="rounded-[24px] border-2 border-pink-100 bg-white/92 p-4 shadow-kawaii sm:p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.2em] text-sky-500">Card {index + 1}</p>
                    <h2 className="text-xl font-black text-[#241d3f]">곡 카드 편집</h2>
                  </div>
                  <button
                    className="h-10 rounded-full border-2 border-pink-200 px-4 text-sm font-black text-pink-500 transition hover:bg-pink-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                    disabled={cards.length === 1}
                    onClick={() => setCards((current) => current.filter((item) => item.id !== card.id))}
                  >
                    삭제
                  </button>
                </div>

                <div className="grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
                  <div className="space-y-3">
                    <div className="aspect-video overflow-hidden rounded-2xl border-2 border-[#ffd5e5] bg-[#f3f8ff]">
                      {card.videoId ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="h-full w-full object-cover" src={thumbnailUrl(card.videoId)} alt="YouTube thumbnail" />
                      ) : (
                        <div className="sparkle-grid flex h-full items-center justify-center px-6 text-center text-sm font-bold text-[#7b83a0]">
                          YouTube URL을 입력하면 썸네일이 표시됩니다
                        </div>
                      )}
                    </div>
                    <div className="rounded-2xl bg-pink-50 px-4 py-3 text-xs font-black text-pink-500">
                      videoId: <span className="text-[#241d3f]">{card.videoId || "대기 중"}</span>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    <label className="grid gap-2">
                      <span className="text-sm font-black text-[#38405f]">YouTube URL</span>
                      <input
                        className="h-12 rounded-2xl border-2 border-pink-100 bg-white px-4 font-semibold outline-none transition focus:border-pink-400"
                        placeholder="https://www.youtube.com/watch?v=..."
                        value={card.youtubeUrl}
                        onChange={(event) => handleYoutubeUrl(card.id, event.target.value)}
                      />
                    </label>

                    <div className="grid gap-3 sm:grid-cols-2">
                      <label className="grid gap-2">
                        <span className="text-sm font-black text-[#38405f]">곡 제목</span>
                        <input
                          className="h-12 rounded-2xl border-2 border-pink-100 bg-white px-4 font-semibold outline-none transition focus:border-pink-400"
                          placeholder="Song title"
                          value={card.title}
                          onChange={(event) => updateCard(card.id, { title: event.target.value })}
                        />
                      </label>
                      <label className="grid gap-2">
                        <span className="text-sm font-black text-[#38405f]">가수명</span>
                        <input
                          className="h-12 rounded-2xl border-2 border-pink-100 bg-white px-4 font-semibold outline-none transition focus:border-pink-400"
                          placeholder="Artist"
                          value={card.artist}
                          onChange={(event) => updateCard(card.id, { artist: event.target.value })}
                        />
                      </label>
                    </div>

                    <label className="grid gap-2">
                      <span className="text-sm font-black text-[#38405f]">캐릭터 이미지</span>
                      <input
                        className="block w-full cursor-pointer rounded-2xl border-2 border-dashed border-sky-200 bg-sky-50 p-3 text-sm font-bold text-[#38405f] file:mr-4 file:rounded-full file:border-0 file:bg-sky-400 file:px-4 file:py-2 file:font-black file:text-white"
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(event) => handleCharacterUpload(card.id, event)}
                      />
                    </label>

                    {card.characters.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {card.characters.map((image, imageIndex) => (
                          <div key={`${image}-${imageIndex}`} className="group relative h-16 w-16 overflow-hidden rounded-2xl border-2 border-pink-100 bg-white">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img className="h-full w-full object-cover" src={image} alt="" />
                            <button
                              className="absolute inset-0 hidden bg-[#241d3f]/72 text-xs font-black text-white group-hover:block"
                              onClick={() =>
                                updateCard(card.id, {
                                  characters: card.characters.filter((_, currentIndex) => currentIndex !== imageIndex)
                                })
                              }
                            >
                              제거
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <label className="grid gap-2">
                      <span className="text-sm font-black text-[#38405f]">코멘트</span>
                      <textarea
                        className="min-h-28 resize-y rounded-2xl border-2 border-pink-100 bg-white px-4 py-3 font-semibold leading-6 outline-none transition focus:border-pink-400"
                        placeholder="이 곡에 대한 감상, 추천 포인트, 가사 등..."
                        value={card.comment}
                        onChange={(event) => updateCard(card.id, { comment: event.target.value })}
                      />
                    </label>
                  </div>
                </div>
              </article>
            ))}

            <button
              className="h-14 rounded-[22px] border-2 border-dashed border-pink-300 bg-white/70 text-base font-black text-pink-500 transition hover:border-pink-500 hover:bg-pink-50"
              onClick={() => setCards((current) => [...current, emptyCard()])}
            >
              곡 카드 추가
            </button>
          </section>

          <aside className="xl:sticky xl:top-6 xl:h-fit">
            <div className="rounded-[24px] border-2 border-sky-100 bg-white/92 p-4 shadow-kawaii sm:p-5">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-pink-500">Preview</p>
                  <h2 className="text-xl font-black text-[#241d3f]">결과 미리보기</h2>
                </div>
                <span className="rounded-full bg-sky-100 px-3 py-1 text-xs font-black text-sky-600">{cards.length} cards</span>
              </div>

              <div className="max-h-[calc(100vh-180px)] space-y-4 overflow-auto pr-1">
                {cards.map((card, index) => (
                  <div key={card.id} className="overflow-hidden rounded-[22px] border-2 border-pink-100 bg-white">
                    <div className="aspect-video bg-[#f3f8ff]">
                      {card.videoId ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className="h-full w-full object-cover" src={thumbnailUrl(card.videoId)} alt="" />
                      ) : (
                        <div className="sparkle-grid flex h-full items-center justify-center text-sm font-black text-[#7b83a0]">No Thumbnail</div>
                      )}
                    </div>
                    <div className="p-4">
                      <p className="text-xs font-black uppercase tracking-[0.18em] text-pink-500">NOW PLAYING... #{index + 1}</p>
                      <h3 className="mt-2 break-words text-xl font-black text-[#241d3f]">{card.title || "Untitled Song"}</h3>
                      <p className="mt-1 break-words text-sm font-bold text-[#56607d]">{card.artist || "Artist"}</p>
                      {card.characters.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {card.characters.slice(0, 6).map((image, imageIndex) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img key={`${image}-${imageIndex}`} className="h-10 w-10 rounded-xl object-cover ring-2 ring-pink-100" src={image} alt="" />
                          ))}
                        </div>
                      )}
                      <p className="mt-3 break-words rounded-2xl bg-sky-50 p-3 text-sm font-semibold leading-6 text-[#38405f]">
                        {card.comment || "코멘트를 입력해 주세요."}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}
