// Monta a apresentação em dist/.
//   node build.mjs
// - junta src/index.html com os slides de src/slides/ (ordem do nome do arquivo)
// - trata as fotos do manifesto src/img/imagens.json (recorte, cor, tamanho) e grava webp
// - troca src="@img/nome" pelo arquivo final, com width e height
// - troca <!-- @svg nome id --> pelo SVG de src/svg/nome.svg (o "ID" de dentro vira o id dado)
// - copia css, js, fontes e vídeo
// Foto que ainda não existe vira um quadro cinza com o nome, pra o layout não quebrar.
import { readdir, readFile, writeFile, mkdir, cp, rm } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'

const SRC = 'src'
const DIST = 'dist'

await rm(DIST, { recursive: true, force: true })
await mkdir(`${DIST}/assets/img`, { recursive: true })

/* ---------- fotos ---------- */
const manifesto = JSON.parse(await readFile(`${SRC}/img/imagens.json`, 'utf8'))
const medidas = {}
const faltando = []

async function trata(nome, cfg) {
  const entrada = path.join(SRC, 'img', cfg.de)
  const saida = path.join(DIST, 'assets/img', `${nome}.webp`)
  const largura = cfg.largura || 1600

  if (!existsSync(entrada)) {
    faltando.push(`${nome} (${cfg.de})`)
    const w = largura
    const h = Math.round(w / (cfg.proporcao || 1.5))
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="100%" height="100%" fill="#2a2f3a"/><text x="50%" y="50%" fill="#8b93a7" font-family="Arial" font-size="${Math.round(w / 18)}" text-anchor="middle" dominant-baseline="middle">${nome}</text></svg>`
    await sharp(Buffer.from(svg)).webp({ quality: 60 }).toFile(saida)
    medidas[nome] = { w, h }
    return
  }

  let img = sharp(entrada).rotate()
  const meta = await img.metadata()
  if (cfg.recorte) {
    // recorte em fração da foto original: [x, y, largura, altura]
    const [x, y, rw, rh] = cfg.recorte
    img = img.extract({
      left: Math.round(x * meta.width),
      top: Math.round(y * meta.height),
      width: Math.round(rw * meta.width),
      height: Math.round(rh * meta.height),
    })
  }
  if (cfg.espelhar) img = img.flop()
  img = img.resize({ width: largura, withoutEnlargement: !cfg.ampliar, kernel: 'lanczos3' })

  const cor = cfg.cor || 'frio'
  if (cor === 'mono') img = img.grayscale().modulate({ brightness: cfg.brilho ?? 1 })
  else if (cor === 'natural') img = img.modulate({ saturation: cfg.sat ?? 1, brightness: cfg.brilho ?? 1 })
  else img = img.modulate({ saturation: cfg.sat ?? 0.22, brightness: cfg.brilho ?? 0.92 })

  if (cfg.contraste) img = img.linear(cfg.contraste, -128 * (cfg.contraste - 1))

  let buf = await img.toBuffer({ resolveWithObject: true })
  // véu azul em soft-light: puxa a foto pro azul da paleta sem virar duotone
  if (cor === 'frio' && (cfg.tinta ?? 0.5) > 0) {
    const { width, height } = buf.info
    const veu = await sharp({ create: { width, height, channels: 4, background: { r: 30, g: 84, b: 230, alpha: cfg.tinta ?? 0.5 } } }).png().toBuffer()
    buf = await sharp(buf.data).composite([{ input: veu, blend: 'soft-light' }]).toBuffer({ resolveWithObject: true })
  }
  const info = await sharp(buf.data).webp({ quality: cfg.q || 80, effort: 5 }).toFile(saida)
  medidas[nome] = { w: info.width, h: info.height }
}

await Promise.all(Object.entries(manifesto).map(([n, c]) => trata(n, c)))

/* ---------- slides ---------- */
const arquivos = (await readdir(`${SRC}/slides`)).filter((f) => f.endsWith('.html')).sort()
const slides = await Promise.all(arquivos.map((f) => readFile(`${SRC}/slides/${f}`, 'utf8')))
let html = (await readFile(`${SRC}/index.html`, 'utf8')).replace('<!-- @slides -->', slides.join('\n'))

// desenho em SVG que entra inline (pra o CSS animar cada traço); ID evita id repetido na página
const svgs = {}
for (const [, nome] of html.matchAll(/<!-- @svg ([\w-]+) [\w-]+ -->/g))
  svgs[nome] ??= (await readFile(`${SRC}/svg/${nome}.svg`, 'utf8')).replace(/^<!--[\s\S]*?-->\s*/, '').trim()
html = html.replace(/<!-- @svg ([\w-]+) ([\w-]+) -->/g, (_, nome, id) => svgs[nome].replaceAll('ID-', id + '-'))

const semManifesto = new Set()
html = html.replace(/src="@img\/([\w-]+)"/g, (_, nome) => {
  const m = medidas[nome]
  if (!m) {
    semManifesto.add(nome)
    return `src="" data-falta="${nome}"`
  }
  return `src="assets/img/${nome}.webp" width="${m.w}" height="${m.h}" decoding="async"`
})
await writeFile(`${DIST}/index.html`, html)

/* ---------- arquivos estáticos ---------- */
await cp(`${SRC}/css`, `${DIST}/assets/css`, { recursive: true })
await cp(`${SRC}/js`, `${DIST}/assets/js`, { recursive: true })
await cp(`${SRC}/fonts`, `${DIST}/assets/fonts`, { recursive: true })
await cp(`${SRC}/video`, `${DIST}/assets/video`, { recursive: true })

console.log(`ok: ${arquivos.length} slides, ${Object.keys(medidas).length} imagens`)
if (faltando.length) console.log(`foto provisória (arquivo ainda não existe): ${faltando.join(', ')}`)
if (semManifesto.size) console.log(`ATENÇÃO, @img sem entrada no manifesto: ${[...semManifesto].join(', ')}`)
