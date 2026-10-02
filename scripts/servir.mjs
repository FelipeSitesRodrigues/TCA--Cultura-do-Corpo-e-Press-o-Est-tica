/* Servidor estático pra revisar a apresentação.
   node scripts/servir.mjs [pasta=dist] [porta=4173]
   Responde Range (206), que o Chrome pede pra tocar e voltar o vídeo. */
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { createReadStream } from 'node:fs'
import { join, extname, resolve } from 'node:path'

const RAIZ = resolve(process.cwd(), process.argv[2] || 'dist')
const PORTA = Number(process.argv[3] || process.env.PORTA || 4173)

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.mp4': 'video/mp4',
  '.json': 'application/json',
}

createServer(async (req, res) => {
  try {
    const caminho = decodeURIComponent(new URL(req.url, 'http://x').pathname)
    let arquivo = join(RAIZ, caminho)
    if (!arquivo.startsWith(RAIZ)) return res.writeHead(403).end('403')
    let info = await stat(arquivo).catch(() => null)
    if (info?.isDirectory()) {
      arquivo = join(arquivo, 'index.html')
      info = await stat(arquivo)
    }
    if (!info) throw new Error('404')
    const tipo = TIPOS[extname(arquivo).toLowerCase()] || 'application/octet-stream'
    const faixa = req.headers.range && /bytes=(\d*)-(\d*)/.exec(req.headers.range)
    if (faixa) {
      const ini = faixa[1] ? Number(faixa[1]) : 0
      const fim = faixa[2] ? Number(faixa[2]) : info.size - 1
      res.writeHead(206, {
        'Content-Type': tipo,
        'Content-Range': `bytes ${ini}-${fim}/${info.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': fim - ini + 1,
        'Cache-Control': 'no-store',
      })
      return createReadStream(arquivo, { start: ini, end: fim }).pipe(res)
    }
    res.writeHead(200, { 'Content-Type': tipo, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store' })
    res.end(await readFile(arquivo))
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404')
  }
}).listen(PORTA, () => console.log(`servindo ${RAIZ} em http://localhost:${PORTA}`))
