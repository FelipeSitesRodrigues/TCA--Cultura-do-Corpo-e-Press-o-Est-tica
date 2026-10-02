// Alinha o quadro "luz de cima" ao quadro "luz comum" (mesma pose, posição diferente)
// e grava os dois no mesmo enquadramento pro comparador do slide "mesmo corpo".
// Uso: node scripts/alinhar-luz.mjs escala,dx,dy   (o quadro escalado é colado em dx,dy)
// Antes, tirar os dois quadros do vídeo original (720x1280) com o ffmpeg:
//   ffmpeg -ss 1.6 -i video.mp4 -frames:v 1 -vf crop=720:400:0:220 scripts/_comum.png
//   ffmpeg -ss 8.5 -i video.mp4 -frames:v 1 -vf crop=720:400:0:220 scripts/_cima.png
// Valores usados no deck: 1.034,50,-17. O recorte final 4:3 é {left:100, top:28, width:500, height:372}.
import sharp from 'sharp'
const [escala, dx, dy] = (process.argv[2] || '1.034,50,-17').split(',').map(Number)
const W = 720, H = 400, M = 300
const cima = await sharp('scripts/_cima.png').resize(Math.round(W * escala)).png().toBuffer()
const tela = await sharp({ create: { width: W + 2 * M, height: H + 2 * M, channels: 3, background: '#000' } })
  .composite([{ input: cima, left: M + dx, top: M + dy }])
  .png().toBuffer()
const alinhado = await sharp(tela).extract({ left: M, top: M, width: W, height: H }).png().toBuffer()
await sharp(alinhado).toFile('scripts/_cima-alinhado.png')
if (process.env.PROVA) {
  const comum = await sharp('scripts/_comum.png').ensureAlpha(0.5).png().toBuffer()
  await sharp(alinhado).composite([{ input: comum }]).jpeg({ quality: 85 }).toFile(process.env.PROVA)
}
console.log('ok', escala, dx, dy)
