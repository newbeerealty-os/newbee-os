// 拉取 MiSans（小米，免费商用）的 web 切片到 public/fonts/misans，并生成 app/fonts/misans.css。
// 来源：npm 包 misans（dsrkafuu 按 Google Fonts 的 unicode-range 切片）。包里 CSS 的字重是字体内部值（330/380/520），
// 这里改写成 CSS 语义的 400/500/600。只需要在升级字体版本时重跑：node apps/web/scripts/fetch-misans.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const VERSION = "4.1.0";
const BASE = `https://cdn.jsdelivr.net/npm/misans@${VERSION}/lib/Normal`;
const WEIGHTS = [["Regular", 400], ["Medium", 500], ["Semibold", 600]];

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = resolve(root, "public/fonts/misans");
mkdirSync(outDir, { recursive: true });

let css = `/* 自动生成：node apps/web/scripts/fetch-misans.mjs（MiSans ${VERSION}，切片来自 npm:misans）。不要手改。 */\n`;
let files = 0;
for (const [name, weight] of WEIGHTS) {
  const src = await (await fetch(`${BASE}/MiSans-${name}.min.css`)).text();
  for (const m of src.matchAll(/src: url\('([^']+)'\) format\('woff2'\);unicode-range:([^;]+);/g)) {
    const [, file, range] = m;
    const buf = Buffer.from(await (await fetch(`${BASE}/${file}`)).arrayBuffer());
    writeFileSync(resolve(outDir, file), buf);
    files++;
    css += `@font-face{font-family:"MiSans";font-style:normal;font-weight:${weight};font-display:swap;src:url(/fonts/misans/${file}) format("woff2");unicode-range:${range};}\n`;
  }
  console.log(`${name} → ${weight}`);
}
writeFileSync(resolve(root, "app/fonts/misans.css"), css);
console.log(`done: ${files} files → public/fonts/misans, css → app/fonts/misans.css`);
