// node pack.mjs <out.js> name=file.rgba:w:h ... — empacota os quadros (paleta + RLE, base64)
import { readFileSync, writeFileSync } from 'node:fs';
const out = process.argv[2];
const frames = {};
let total = 0;
for (const arg of process.argv.slice(3)) {
  const [name, spec] = arg.split('=');
  const [file, w, h] = spec.split(':');
  const rgba = readFileSync(file);
  const pal = new Map([['0,0,0,0', 0]]);
  const idx = new Uint16Array(+w * +h);
  for (let p = 0; p < idx.length; p += 1) {
    const a = rgba[p * 4 + 3];
    const key = a === 0 ? '0,0,0,0' : `${rgba[p * 4]},${rgba[p * 4 + 1]},${rgba[p * 4 + 2]},${a}`;
    if (!pal.has(key)) pal.set(key, pal.size);
    idx[p] = pal.get(key);
  }
  const wide = pal.size > 255;
  const bytes = [];
  for (let p = 0; p < idx.length; ) {
    let n = 1;
    while (p + n < idx.length && idx[p + n] === idx[p] && n < 255) n += 1;
    bytes.push(n);
    if (wide) bytes.push(idx[p] >> 8, idx[p] & 255);
    else bytes.push(idx[p]);
    p += n;
  }
  const palBytes = [];
  for (const key of pal.keys()) palBytes.push(...key.split(',').map(Number));
  const f = { w: +w, h: +h, i: wide ? 2 : 1, p: Buffer.from(palBytes).toString('base64'), d: Buffer.from(bytes).toString('base64') };
  total += f.p.length + f.d.length;
  frames[name] = f;
  console.log(name, w, h, 'pal', pal.size, 'bytes', f.d.length + f.p.length);
}
const body = Object.entries(frames)
  .map(([k, f]) => `  ${JSON.stringify(k)}: Object.freeze({ w: ${f.w}, h: ${f.h}, i: ${f.i}, p: '${f.p}', d: '${f.d}' }),`)
  .join('\n');
writeFileSync(out, `// PRÉVIA (gerado): o Tio Zé refeito em volume — de frente (o busto) e de perfil sentado (as\n// camadas da cadeira, das pernas e do corpo de cima). Cada quadro: paleta RGBA + RLE, em base64.\nexport const TIOZE_HD = Object.freeze({\n${body}\n});\n`);
console.log('total', total);
