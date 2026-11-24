# python3 tomodule.py <wide/sala.png> <src/components/art/rooms/landX.js> <day|still>
# O PNG da sala num módulo do jogo, em data URL. A pixel art cabe em 256 cores (paleta por
# cobertura + k-means, sem pontilhado: o erro fica em poucos níveis), o que corta o PNG em ~4×;
# nas salas de dia o buraco do céu e do mar vira o índice transparente da paleta. Se a paleta
# errar demais numa sala, fica o PNG sem perda.
import base64, io, sys
import numpy as np
from PIL import Image

src, out, kind = sys.argv[1:4]
im = Image.open(src).convert('RGBA')
A = np.asarray(im)
alpha = A[..., 3]
day = kind == 'day'
if day:
    assert set(np.unique(alpha)) <= {0, 255}, 'o alfa da sala de dia tem de ser 0 ou 255'
    hole = alpha == 0
else:
    hole = np.zeros(alpha.shape, bool)

rgb = A[..., :3].copy()
if hole.any():
    # o buraco pega a cor de um pixel cheio (não gasta entrada da paleta)
    rgb[hole] = rgb[~hole][0]
base = Image.fromarray(rgb, 'RGB')
colors = 255 if day else 256
q = base.quantize(colors=colors, method=Image.Quantize.MAXCOVERAGE, kmeans=6, dither=Image.Dither.NONE)
err = np.abs(np.asarray(q.convert('RGB')).astype(int) - rgb.astype(int)).max(axis=2)[~hole]
p99 = float(np.percentile(err, 99))
p999 = float(np.percentile(err, 99.9))
# (uns poucos pixels no miolo do neon podem errar até ~25 níveis: não se vê; o que vale é o p99,9)
ok = err.max() <= 32 and p99 <= 10 and p999 <= 14

buf = io.BytesIO()
if ok:
    if day:
        idx = np.asarray(q).copy()
        idx[hole] = 255
        pal = q.getpalette()[: 255 * 3]
        pal += [0] * (255 * 3 - len(pal)) + [0, 0, 0]  # a paleta inteira: o 255 é o buraco
        q = Image.fromarray(idx, 'P')
        q.putpalette(pal)
        q.save(buf, 'PNG', optimize=True, transparency=255)
    else:
        q.save(buf, 'PNG', optimize=True)
else:
    (im if day else base).save(buf, 'PNG', optimize=True)

data = buf.getvalue()
# conferência: o que sai decodifica igual ao que entrou (a menos do erro da paleta)
back = np.asarray(Image.open(io.BytesIO(data)).convert('RGBA'))
assert back.shape == A.shape
assert (back[..., 3][hole] == 0).all() and (back[..., 3][~hole] == 255).all()

b64 = base64.b64encode(data).decode()
w, h = im.size
name = out.rsplit('/', 1)[-1][:-3]
note = f"{w} × {h}, {'256 cores' if ok else 'sem perda'}{', com buraco no céu' if day else ''}"
open(out, 'w').write(f"// gerado por tools/volume/cena (a sala {name} em volume, {note})\nexport default 'data:image/png;base64,{b64}';\n")
print(name, w, h, 'paleta' if ok else 'SEM PERDA', 'max', int(err.max()), 'p99', p99, 'p999', p999, 'png', len(data), 'b64', len(b64))
