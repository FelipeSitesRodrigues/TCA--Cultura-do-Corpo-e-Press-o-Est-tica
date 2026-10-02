/* TCA 2026 · motor da apresentação
   Seta, espaço, Page Down (passador de slide), clique ou arrasto avançam.
   Seta pra esquerda, Page Up ou clique no quinto esquerdo da tela voltam.
   F liga a tela cheia. Home e End vão pro começo e pro fim.
   ?estatico na URL (ou "reduzir movimento" no sistema) mostra cada slide já
   no estado final: é o modo do print e do PDF.
   Script clássico, sem módulo: a pasta dist abre direto do disco se a
   internet da escola cair. */
(function () {
  'use strict'

  var palco = document.getElementById('palco')
  var slides = Array.prototype.slice.call(palco.querySelectorAll('.slide'))
  var params = new URLSearchParams(location.search)
  var reduz = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  var estatico = params.has('estatico') || reduz
  if (estatico) document.documentElement.classList.add('estatico')

  var QUEM = {
    felipe: { nome: 'Felipe', completo: 'Felipe Rodrigues', parte: '01', titulo: 'O corpo é construído' },
    davi: { nome: 'Davi', completo: 'Davi Borges', parte: '02', titulo: 'O corpo à venda' },
    gabriel: { nome: 'Gabriel', completo: 'Gabriel Macário', parte: '03', titulo: 'A tela engana' },
    brenno: { nome: 'Brenno', completo: 'Brenno Veiga', parte: '04', titulo: 'O preço e a saída' }
  }

  // posição de cada slide dentro do bloco do apresentador (a capa não conta)
  var totalQuem = {}
  var numerados = 0
  slides.forEach(function (s) {
    if (s.hasAttribute('data-capa')) return
    var q = s.dataset.quem
    totalQuem[q] = (totalQuem[q] || 0) + 1
    s._iq = totalQuem[q]
    s._num = ++numerados
  })

  /* ---------- escala do palco ---------- */
  function ajusta() {
    var k = Math.min(window.innerWidth / 1920, window.innerHeight / 1080)
    var x = (window.innerWidth - 1920 * k) / 2
    var y = (window.innerHeight - 1080 * k) / 2
    palco.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(' + k + ')'
  }
  window.addEventListener('resize', ajusta)
  ajusta()

  /* ---------- títulos: cada linha (separada por <br>) sobe de trás de uma máscara ---------- */
  Array.prototype.forEach.call(palco.querySelectorAll('.titulo'), function (t) {
    var linhas = t.innerHTML.split(/<br\s*\/?>/i)
    t.innerHTML = linhas
      .map(function (l, i) {
        return '<span class="l"><span class="li" style="--i:' + i + '">' + l.trim() + '</span></span>'
      })
      .join('')
  })

  /* ---------- HUD ---------- */
  var hud = palco.querySelector('.hud')
  var hudNome = hud.querySelector('.hud-nome')
  var hudConta = hud.querySelector('.hud-conta')
  var hudParte = hud.querySelector('.hud-parte')
  var hudNum = hud.querySelector('.hud-num')
  var hudBarra = hud.querySelector('.hud-barra')
  var hudPag = hud.querySelector('.hud-pag')

  // marquinhas na barra onde um apresentador passa pro outro
  ;(function () {
    var ant = null
    slides.forEach(function (s) {
      if (s.hasAttribute('data-capa')) return
      if (ant && s.dataset.quem !== ant) {
        var b = document.createElement('b')
        b.style.left = ((s._num - 1) / numerados) * 100 + '%'
        hudBarra.appendChild(b)
      }
      ant = s.dataset.quem
    })
  })()

  function dois(n) {
    return (n < 10 ? '0' : '') + n
  }

  function atualizaHud(s, mudouNum) {
    var capa = s.hasAttribute('data-capa')
    if (capa) palco.setAttribute('data-capa', '')
    else palco.removeAttribute('data-capa')
    if (capa) return
    var q = QUEM[s.dataset.quem]
    hudNome.textContent = q.nome
    hudConta.textContent = dois(s._iq) + '/' + dois(totalQuem[s.dataset.quem])
    hudParte.textContent = q.titulo
    hudBarra.style.setProperty('--prog', s._num / numerados)
    var restam = (+s.dataset.passos || 0) - passo
    var pontos = ''
    for (var i = 0; i < restam; i++) pontos += '<i></i>'
    hudPag.innerHTML = (restam > 0 ? '<span class="hud-passos" title="cliques restantes neste slide">' + pontos + '</span>' : '') + dois(s._num) + ' / ' + dois(numerados)
    if (mudouNum) hudNum.innerHTML = '<span class="entra">' + dois(s._num) + '</span>'
  }

  /* ---------- navegação ---------- */
  var atual = -1
  var passo = 0
  var travado = false

  function aplicaPassos(s) {
    var max = +s.dataset.passos || 0
    for (var i = 1; i <= 3; i++) s.classList.toggle('p' + i, i <= passo && i <= max)
  }

  function vai(n, opts) {
    opts = opts || {}
    n = Math.max(0, Math.min(slides.length - 1, n))
    if (n === atual || travado) return
    var ant = slides[atual]
    var nov = slides[n]
    var dir = n > atual ? 1 : -1
    var trocaQuem = ant && ant.dataset.quem !== nov.dataset.quem
    palco.style.setProperty('--dir', dir)

    if (ant) {
      ant.classList.remove('ativo')
      ant.classList.add('saindo')
      sai(ant)
      setTimeout(function () {
        ant.classList.remove('saindo')
      }, 950)
    }

    passo = opts.passoFinal || estatico ? +nov.dataset.passos || 0 : 0
    aplicaPassos(nov)
    atual = n

    function mostra() {
      palco.dataset.tema = nov.dataset.quem
      document.body.dataset.quem = nov.dataset.quem
      atualizaHud(nov, true)
      // um quadro de folga pro navegador registrar o estado inicial antes da transição
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          nov.classList.add('ativo')
          entra(nov)
        })
      })
    }

    if (trocaQuem && !estatico && !opts.semCortina) cortina(nov, dir, mostra)
    else mostra()

    if (history.replaceState) history.replaceState(null, '', location.pathname + location.search + '#' + n)
  }

  function proximo() {
    var s = slides[atual]
    var max = +s.dataset.passos || 0
    if (passo < max) {
      passo++
      aplicaPassos(s)
      atualizaHud(s, false)
      entraPasso(s, passo)
      return
    }
    vai(atual + 1)
  }

  function anterior() {
    var s = slides[atual]
    if (passo > 0) {
      passo--
      aplicaPassos(s)
      atualizaHud(s, false)
      return
    }
    vai(atual - 1, { passoFinal: true })
  }

  /* ---------- cortina entre apresentadores ---------- */
  var cortinaEl = palco.querySelector('.cortina')
  function cortina(nov, dir, depois) {
    var q = QUEM[nov.dataset.quem]
    travado = true
    cortinaEl.dataset.tema = nov.dataset.quem
    cortinaEl.style.setProperty('--dir', dir)
    cortinaEl.querySelector('.cortina-num').textContent = q.parte
    cortinaEl.querySelector('.cortina-nome').textContent = q.completo
    cortinaEl.querySelector('.cortina-parte').textContent = q.titulo
    cortinaEl.classList.remove('sai')
    void cortinaEl.offsetWidth
    cortinaEl.classList.add('entra')
    setTimeout(function () {
      depois()
      cortinaEl.classList.remove('entra')
      cortinaEl.classList.add('sai')
      travado = false
    }, 1250)
    setTimeout(function () {
      cortinaEl.classList.remove('sai')
    }, 2000)
  }

  /* ---------- o que roda quando o slide entra e sai ---------- */
  function dentroDePassoFechado(el, s) {
    var p = el.closest('[data-p]')
    return p && !s.classList.contains('p' + p.dataset.p)
  }

  function entra(s) {
    Array.prototype.forEach.call(s.querySelectorAll('[data-conta]'), function (el) {
      if (!dentroDePassoFechado(el, s)) conta(el)
      else zera(el)
    })
    Array.prototype.forEach.call(s.querySelectorAll('video'), function (v) {
      try {
        v.currentTime = 0
        var p = v.play()
        if (p && p.catch) p.catch(function () {})
      } catch (e) {}
    })
    Array.prototype.forEach.call(s.querySelectorAll('.comparador'), function (c) {
      if (c._varre) c._varre()
    })
  }

  function entraPasso(s, n) {
    Array.prototype.forEach.call(s.querySelectorAll('[data-p="' + n + '"] [data-conta], [data-p="' + n + '"][data-conta]'), conta)
  }

  function sai(s) {
    Array.prototype.forEach.call(s.querySelectorAll('[data-conta]'), function (el) {
      el._vivo = false
    })
    Array.prototype.forEach.call(s.querySelectorAll('video'), function (v) {
      try {
        v.pause()
      } catch (e) {}
    })
    Array.prototype.forEach.call(s.querySelectorAll('.comparador'), function (c) {
      if (c._para) c._para()
    })
  }

  /* ---------- contadores ---------- */
  function formata(el, v) {
    var casas = +(el.dataset.casas || 0)
    return v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })
  }
  function zera(el) {
    el._vivo = false
    el.textContent = formata(el, 0)
  }
  function conta(el) {
    var alvo = parseFloat(el.dataset.conta)
    if (estatico) {
      el.textContent = formata(el, alvo)
      return
    }
    var dur = +(el.dataset.dur || 1800)
    var atraso = +(el.dataset.atraso || 0) + 250
    var t0 = performance.now() + atraso
    el._vivo = true
    el.textContent = formata(el, 0)
    function quadro(t) {
      if (!el._vivo) return
      var p = Math.min(1, Math.max(0, (t - t0) / dur))
      var e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p)
      el.textContent = formata(el, alvo * e)
      if (p < 1) requestAnimationFrame(quadro)
    }
    requestAnimationFrame(quadro)
  }

  /* ---------- grade de pontos (212 meninas) ---------- */
  Array.prototype.forEach.call(palco.querySelectorAll('.waffle'), function (w) {
    var total = +w.dataset.total
    var marca = +w.dataset.marca
    var anel = +(w.dataset.anel || 0)
    var cols = +(w.dataset.cols || 18)
    var html = ''
    for (var i = 0; i < total; i++) {
      var col = i % cols
      var lin = Math.floor(i / cols)
      var cls = (i < marca ? 'on' : '') + (i < anel ? ' anel' : '')
      html += '<i class="' + cls + '" style="--o:' + (col + lin) + '"></i>'
    }
    w.innerHTML = html
  })

  /* ---------- comparador antes e depois ---------- */
  Array.prototype.forEach.call(palco.querySelectorAll('.comparador'), function (c) {
    var raf = 0
    function poe(p) {
      p = Math.max(0, Math.min(100, p))
      c.style.setProperty('--pos', p + '%')
    }
    function dePonteiro(e) {
      var r = c.getBoundingClientRect()
      poe(((e.clientX - r.left) / r.width) * 100)
    }
    c.addEventListener('pointerdown', function (e) {
      e.stopPropagation()
      cancelAnimationFrame(raf)
      c.setPointerCapture(e.pointerId)
      c.classList.add('arrastando')
      dePonteiro(e)
    })
    c.addEventListener('pointermove', function (e) {
      if (c.classList.contains('arrastando')) dePonteiro(e)
    })
    c.addEventListener('pointerup', function () {
      c.classList.remove('arrastando')
    })
    c.addEventListener('click', function (e) {
      e.stopPropagation()
    })
    // varredura automática quando o slide entra: mostra a luz comum, depois a de cima, para no meio
    c._varre = function () {
      if (estatico) return poe(50)
      cancelAnimationFrame(raf)
      var trilha = [
        [0, 100],
        [900, 100],
        [2700, 0],
        [3500, 0],
        [4700, 50]
      ]
      var t0 = performance.now()
      function quadro(t) {
        var dt = t - t0
        for (var i = 1; i < trilha.length; i++) {
          if (dt <= trilha[i][0]) {
            var a = trilha[i - 1]
            var b = trilha[i]
            var p = (dt - a[0]) / (b[0] - a[0])
            var e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2
            poe(a[1] + (b[1] - a[1]) * e)
            raf = requestAnimationFrame(quadro)
            return
          }
        }
        poe(50)
      }
      poe(100)
      raf = requestAnimationFrame(quadro)
    }
    c._para = function () {
      cancelAnimationFrame(raf)
    }
    poe(50)
  })

  /* ---------- controles ---------- */
  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return
    var k = e.key
    if (k === 'ArrowRight' || k === 'ArrowDown' || k === 'PageDown' || k === ' ' || k === 'Enter') {
      e.preventDefault()
      proximo()
    } else if (k === 'ArrowLeft' || k === 'ArrowUp' || k === 'PageUp' || k === 'Backspace') {
      e.preventDefault()
      anterior()
    } else if (k === 'Home') {
      vai(0, { semCortina: true })
    } else if (k === 'End') {
      vai(slides.length - 1, { semCortina: true, passoFinal: true })
    } else if (k === 'f' || k === 'F') {
      telaCheia()
    }
  })

  document.addEventListener('click', function (e) {
    if (e.target.closest('a, button, video, .comparador')) return
    if (e.clientX < window.innerWidth * 0.2) anterior()
    else proximo()
  })

  var toque = null
  document.addEventListener(
    'touchstart',
    function (e) {
      if (e.target.closest('.comparador')) return
      toque = { x: e.touches[0].clientX, y: e.touches[0].clientY }
    },
    { passive: true }
  )
  document.addEventListener('touchend', function (e) {
    if (!toque) return
    var dx = e.changedTouches[0].clientX - toque.x
    var dy = e.changedTouches[0].clientY - toque.y
    toque = null
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx < 0) proximo()
      else anterior()
    }
  })

  function telaCheia() {
    var d = document
    if (!d.fullscreenElement) {
      if (d.documentElement.requestFullscreen) d.documentElement.requestFullscreen().catch(function () {})
    } else if (d.exitFullscreen) d.exitFullscreen()
  }

  window.addEventListener('hashchange', function () {
    var n = parseInt(location.hash.slice(1), 10)
    if (!isNaN(n) && n !== atual) vai(n, { semCortina: true })
  })

  /* ---------- começo ---------- */
  var inicio = parseInt(location.hash.slice(1), 10)
  vai(isNaN(inicio) ? 0 : inicio, { semCortina: true })

  var dica = document.querySelector('.dica')
  if (dica) {
    if (estatico || params.has('limpo')) dica.remove()
    else
      setTimeout(function () {
        dica.classList.add('some')
      }, 4500)
  }

  // pra o print poder pular de slide sem simular tecla
  window.deck = { vai: vai, proximo: proximo, anterior: anterior, total: slides.length }
})()
