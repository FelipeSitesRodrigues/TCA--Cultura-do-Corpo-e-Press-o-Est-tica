/**
 * Print de cada slide (puppeteer-core com o Chrome ou o Edge da máquina) e folha de contato.
 *
 *   node scripts/slides.mjs                       todos, modo estático (estado final), 1920x1080
 *   node scripts/slides.mjs --so 3,14,18          só esses
 *   node scripts/slides.mjs --movimento --esperar 2600   com animação, espera antes do print
 *   node scripts/slides.mjs --largura 1366 --altura 768  outra tela (projetor)
 *   node scripts/slides.mjs --pdf                 grava revisao/apresentacao.pdf (modo estático)
 *
 * Saída em revisao/: slide-NN.png e folha.jpg (todos numa grade).
 * Precisa do servidor no ar: node scripts/servir.mjs dist 4173
 */
import puppeteer from 'puppeteer-core'
import sharp from 'sharp'
import { existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'

const args = process.argv.slice(2)
const opt = (nome, padrao) => {
  const i = args.indexOf(`--${nome}`)
  if (i === -1) return padrao
  const v = args[i + 1]
  return v === undefined || v.startsWith('--') ? true : v
}
const largura = Number(opt('largura', 1920))
const altura = Number(opt('altura', 1080))
const movimento = opt('movimento', false) === true
const esperar = Number(opt('esperar', movimento ? 2600 : 350))
const base = opt('base', 'http://localhost:4173')
const so = opt('so', null)
const pdf = opt('pdf', false) === true
const OUT = path.resolve('revisao')
mkdirSync(OUT, { recursive: true })

const NAV = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
].find((p) => existsSync(p))

const browser = await puppeteer.launch({
  executablePath: NAV,
  headless: true,
  args: ['--hide-scrollbars', '--no-first-run', '--autoplay-policy=no-user-gesture-required'],
})

try {
  const page = await browser.newPage()
  const erros = []
  page.on('console', (m) => m.type() === 'error' && erros.push(m.text().slice(0, 200)))
  page.on('pageerror', (e) => erros.push('pageerror: ' + e.message.slice(0, 200)))
  await page.setViewport({ width: largura, height: altura, deviceScaleFactor: 1 })
  const url = `${base}/${movimento ? '?limpo' : '?estatico'}`
  await page.goto(url + '#0', { waitUntil: 'networkidle0', timeout: 60000 })
  await page.evaluate(() => document.fonts.ready)
  await page.evaluate(() => Promise.all([...document.images].map((i) => (i.complete ? null : new Promise((r) => (i.onload = i.onerror = r))))))

  if (pdf) {
    await page.emulateMediaType('screen')
    const total = await page.evaluate(() => window.deck.total)
    const quadros = []
    for (let n = 0; n < total; n++) {
      await page.evaluate((n) => window.deck.vai(n, { semCortina: true }), n)
      await new Promise((r) => setTimeout(r, 300))
      quadros.push(await page.screenshot({ type: 'jpeg', quality: 86 }))
    }
    // um PDF de imagens 16:9, uma página por slide
    const html = `<html><body style="margin:0">${quadros.map((b) => `<img src="data:image/jpeg;base64,${b.toString('base64')}" style="width:100vw;height:100vh;display:block;page-break-after:always">`).join('')}</body></html>`
    const p2 = await browser.newPage()
    await p2.setContent(html, { waitUntil: 'load' })
    await p2.pdf({ path: path.join(OUT, 'apresentacao.pdf'), width: '1920px', height: '1080px', printBackground: true })
    console.log('ok revisao/apresentacao.pdf')
  } else {
    const total = await page.evaluate(() => window.deck.total)
    const lista = so ? String(so).split(',').map(Number) : [...Array(total).keys()]
    const feitos = []
    for (const n of lista) {
      await page.evaluate((n) => window.deck.vai(n, { semCortina: true, passoFinal: true }), n)
      await new Promise((r) => setTimeout(r, esperar))
      const arq = path.join(OUT, `slide-${String(n).padStart(2, '0')}.png`)
      await page.screenshot({ path: arq })
      feitos.push(arq)
    }
    if (feitos.length > 1) {
      const W = 480, H = Math.round((W * altura) / largura), cols = 5, gap = 8
      const linhas = Math.ceil(feitos.length / cols)
      const pecas = await Promise.all(feitos.map((f) => sharp(f).resize(W, H).toBuffer()))
      await sharp({ create: { width: cols * (W + gap) + gap, height: linhas * (H + gap) + gap, channels: 3, background: '#3a3d44' } })
        .composite(pecas.map((input, i) => ({ input, left: gap + (i % cols) * (W + gap), top: gap + Math.floor(i / cols) * (H + gap) })))
        .jpeg({ quality: 82 })
        .toFile(path.join(OUT, 'folha.jpg'))
      console.log('ok revisao/folha.jpg')
    }
    console.log(`ok ${feitos.length} slides em revisao/`)
  }
  if (erros.length) console.log('ERROS de console:\n  ' + [...new Set(erros)].slice(0, 8).join('\n  '))
} finally {
  await browser.close()
}
