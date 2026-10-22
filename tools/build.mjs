// Bundles the game into single self-contained HTML files in dist/.
//   node tools/build.mjs
// dist/miller-branch-library.html  - full standalone page (double-click to play)
// dist/artifact.html               - same content without the <html>/<head>/<body> wrapper
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');
const css = readFileSync(join(root, 'style.css'), 'utf8');
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map((m) => m[1]);
const js = scripts.map((src) => `// ---- ${src}\n` + readFileSync(join(root, src), 'utf8')).join('\n');
const fonts = html.match(/<link rel="stylesheet" href="https:\/\/fonts[^>]+>/)[0];
const title = html.match(/<title>[^<]*<\/title>/)[0];
const body = html.match(/<body>([\s\S]*?)<script/)[1].trim();
const safeJs = js.replace(/<\/script/gi, '<\\/script');

const inner = `${title}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
${fonts}
<style>
${css}
</style>
${body}
<script>
${safeJs}
</script>
`;
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'artifact.html'), inner);
writeFileSync(
  join(root, 'dist', 'miller-branch-library.html'),
  `<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n${inner.replace(body, '').replace(/<script>[\s\S]*<\/script>\n$/, '')}</head>\n<body>\n${body}\n<script>\n${safeJs}\n</script>\n</body>\n</html>\n`
);
console.log(`bundled ${scripts.length} scripts -> dist/`);
