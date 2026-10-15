/**
 * Tải âm thanh chương trình từ Ai là triệu phú Wiki -> public/audio/<khóa>.mp3
 *
 * Chạy: bun scripts/fetch-audio.ts   (cần ffmpeg trong PATH)
 * Danh sách tệp ở src/lib/audio-manifest.ts. Đổi sang MP3 vì Safari không phát được Ogg Vorbis.
 * Bỏ qua tệp đã có; xóa thư mục public/audio để tải lại.
 * Âm thanh thuộc bản quyền chương trình (Sony Pictures Television / VTV); public/audio được commit cùng repo.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { AUDIO_FILES, AUDIO_TRIM_SECONDS, type AudioKey } from "../src/lib/audio-manifest";

const API = "https://ailatrieuphu.fandom.com/vi/api.php";
const UA = "Mozilla/5.0 (ai-la-trieu-phu audio fetch)";
const OUT = resolve(import.meta.dir, "../public/audio");

async function resolveUrl(file: string): Promise<string> {
  const params = new URLSearchParams({
    action: "query",
    prop: "imageinfo",
    iiprop: "url",
    format: "json",
    titles: `Tập tin:${file}`,
  });
  const res = await fetch(`${API}?${params}`, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`API ${res.status}`);
  const json = (await res.json()) as {
    query: { pages: Record<string, { imageinfo?: { url: string }[] }> };
  };
  const url = Object.values(json.query.pages)[0]?.imageinfo?.[0]?.url;
  if (!url) throw new Error("không có tệp trên wiki");
  return url;
}

async function fetchOne(key: AudioKey, tmp: string): Promise<"ok" | "skip"> {
  const dest = join(OUT, `${key}.mp3`);
  if (existsSync(dest)) return "skip";
  const file = AUDIO_FILES[key];
  const url = await resolveUrl(file);
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (!res.ok) throw new Error(`tải ${res.status}`);
  const src = join(tmp, file.replace(/[^\w.-]/g, "_"));
  writeFileSync(src, Buffer.from(await res.arrayBuffer()));
  const trim = AUDIO_TRIM_SECONDS[key];
  const trimArgs = trim ? ["-t", String(trim), "-af", `afade=t=out:st=${trim - 1.5}:d=1.5`] : [];
  const ff = spawnSync(
    "ffmpeg",
    [
      "-y",
      "-loglevel",
      "error",
      "-i",
      src,
      "-vn",
      ...trimArgs,
      "-ac",
      "2",
      "-codec:a",
      "libmp3lame",
      "-q:a",
      "5",
      dest,
    ],
    { encoding: "utf8" },
  );
  if (ff.error) throw new Error(`không chạy được ffmpeg: ${ff.error.message}`);
  if (ff.status !== 0) throw new Error(`ffmpeg: ${ff.stderr.trim()}`);
  return "ok";
}

mkdirSync(OUT, { recursive: true });
const tmp = mkdtempSync(join(tmpdir(), "altp-audio-"));
const failed: string[] = [];
let done = 0;
try {
  const keys = Object.keys(AUDIO_FILES) as AudioKey[];
  // Vài tệp một lượt để không dồn quá nhiều yêu cầu vào wiki.
  for (let i = 0; i < keys.length; i += 4) {
    await Promise.all(
      keys.slice(i, i + 4).map(async (key) => {
        try {
          const r = await fetchOne(key, tmp);
          console.log(`${r === "ok" ? "tải" : "có sẵn"}  ${key}`);
        } catch (e) {
          failed.push(key);
          console.error(`LỖI   ${key} (${AUDIO_FILES[key]}): ${(e as Error).message}`);
        }
        done++;
      }),
    );
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
console.log(`Xong ${done - failed.length}/${done} tệp -> ${OUT}`);
if (failed.length > 0) process.exit(1);
