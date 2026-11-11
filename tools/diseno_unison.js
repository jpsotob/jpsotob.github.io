#!/usr/bin/env node
/**
 * Aplica el diseño institucional de la Universidad de Sonora al tablero
 * generado con Plotly (docs/index.html).
 *
 * Uso:
 *   node tools/diseno_unison.js <entrada.html> [salida.html]
 *
 * <entrada.html> debe ser el HTML tal como lo genera el script de Python
 * (tabla con logos, tarjetas de indicadores y la figura de Plotly).
 * Si se omite [salida.html] se sobrescribe la entrada.
 */
'use strict';
const fs = require('fs');

const [, , entrada, salidaArg] = process.argv;
if (!entrada) {
	console.error('Uso: node tools/diseno_unison.js <entrada.html> [salida.html]');
	process.exit(1);
}
const salida = salidaArg || entrada;
const html = fs.readFileSync(entrada, 'utf8');

if (html.includes('data-diseno-unison')) {
	console.error('La entrada ya tiene el diseño aplicado. Usa el HTML original generado por Python.');
	process.exit(1);
}

// ---------- Extracción de contenido ----------
const texto = (re, def = '') => {
	const m = html.match(re);
	return m ? m[1].trim() : def;
};

const titulo = texto(/<title>([^<]*)<\/title>/i, 'Campo experimental DAG - Unison');
const h1 = texto(/<h1>([^<]*)<\/h1>/i, 'Campo experimental del Departamento de Agricultura y Ganadería (DAG)');
const descripcion = texto(/<\/table>\s*<p>([\s\S]*?)<\/p>/i, '');

const kpis = [...html.matchAll(
	/<div>([^<]+)<\/div><div style="font-size:\d+px[^"]*">([^<]+)<\/div><small>([^<]*)<\/small>/g
)].map(([, etiqueta, valor, pie]) => {
	const [unidadOriginal, n] = pie.split('·').map((s) => s.trim());
	const abreviaturas = { 'milímetros': 'mm', 'milimetros': 'mm', 'w/m2': 'W/m²' };
	const unidad = abreviaturas[(unidadOriginal || '').toLowerCase()] || unidadOriginal;
	const mn = (n || '').match(/n=(\d+)\/(\d+)/);
	return {
		etiqueta: etiqueta.trim(),
		valor: valor.trim(),
		unidad: unidad || '',
		registros: mn ? `${mn[1]} de ${mn[2]} registros` : (n || ''),
	};
});

const aperturaFigura = html.match(/<div style="height:(\d+)px; width:100%;">/);
if (!aperturaFigura) {
	console.error('No se encontró el contenedor de la figura de Plotly.');
	process.exit(1);
}
const altoFigura = Number(aperturaFigura[1]);
const inicioFigura = aperturaFigura.index + aperturaFigura[0].length;
const finFigura = html.lastIndexOf('</div>', html.lastIndexOf('</body>'));
const figura = html.slice(inicioFigura, finFigura);

const periodo = texto(/"title":\{"text":"Periodo:\s*([^"]+)"\}/)
	.replace(/\\u002f/g, '/')
	.replace(/\\u2014/g, '—');

// ---------- Iconos ----------
const iconos = {
	temperatura: '<path d="M14 14.8V5a2 2 0 0 0-4 0v9.8a4 4 0 1 0 4 0z"/><path d="M12 9v7"/>',
	humedad: '<path d="M12 3s-6 6.5-6 11a6 6 0 0 0 12 0c0-4.5-6-11-6-11z"/>',
	radiacion: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
	precipitacion: '<path d="M7 15a4 4 0 0 1-.5-8A6 6 0 0 1 18 8a3.5 3.5 0 0 1-.5 7z"/><path d="M8 19l-1 2M12 19l-1 2M16 19l-1 2"/>',
	otro: '<path d="M4 19V5M4 19h16M8 15l3-4 3 2 4-6"/>',
};
const normalizar = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const icono = (etiqueta) => {
	const e = normalizar(etiqueta);
	const clave = ['temperatura', 'humedad', 'radiacion', 'precipitacion'].find((k) => e.includes(k)) || 'otro';
	return { clave, svg: iconos[clave] };
};

const tarjetas = kpis.map((k) => {
	const ic = icono(k.etiqueta);
	return `
        <article class="kpi kpi-${ic.clave}">
          <div class="kpi-icon" aria-hidden="true"><svg viewBox="0 0 24 24">${ic.svg}</svg></div>
          <div>
            <h3>${k.etiqueta}</h3>
            <p class="kpi-valor">${k.valor} <span>${k.unidad}</span></p>
            <p class="kpi-n">${k.registros}</p>
          </div>
        </article>`;
}).join('');

// ---------- Plantilla ----------
const salidaHtml = `<!doctype html>
<html lang="es" data-diseno-unison>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${titulo}</title>
  <meta name="description" content="${descripcion.replace(/"/g, '&quot;')}">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap">
  <style>
    /* Paleta tomada del sitio institucional unison.mx */
    :root {
      --azul: #0045a5;
      --azul-oscuro: #003580;
      --marino: #001149;
      --dorado: #f5b01d;
      --naranja: #e0671f;
      --verde: #1b998b;
      --texto: #202020;
      --suave: #5c5f66;
      --gris: #f4f6f9;
      --borde: #e3e6eb;
      --pie: #9e9e9d;
      --titulos: Optima, 'Zapf Humanist 601 BT', Candara, 'Segoe UI', 'Montserrat', sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Montserrat', 'Segoe UI', Arial, sans-serif; color: var(--texto); background: var(--gris); line-height: 1.55; }
    img { display: block; max-width: 100%; }
    a { color: var(--azul); text-decoration: none; }
    a:hover { color: #fe9b07; }
    .wrap { width: 100%; max-width: 1240px; margin: 0 auto; padding-inline: 20px; }

    /* Encabezado */
    .topbar { background: var(--marino); color: #fff; font-size: .8rem; }
    .topbar .wrap { display: flex; justify-content: space-between; gap: 12px; padding-block: 6px; }
    .brandbar { background: #fff; box-shadow: 1px 7px 18px rgba(24,16,16,.06); }
    .brandbar .wrap { display: flex; align-items: center; gap: 18px; padding-block: 14px; }
    .brandbar img { height: 72px; width: auto; }
    .brandbar .titulo { flex: 1; font-family: var(--titulos); }
    .brandbar .titulo strong { display: block; font-size: 1.35rem; line-height: 1.2; color: #000; }
    .brandbar .titulo span { display: block; font-size: 1rem; color: #444; }
    .brandbar .logo-dag { margin-left: auto; }
    .navband { background: var(--azul); border-bottom: 4px solid var(--dorado); }
    .navband ul { display: flex; flex-wrap: wrap; list-style: none; }
    .navband a { display: block; padding: 12px 16px; color: #fff; font-size: .85rem; font-weight: 600; letter-spacing: .05em; text-transform: uppercase; }
    .navband a:hover { background: var(--azul-oscuro); color: var(--dorado); }

    /* Portada */
    .hero { background: linear-gradient(110deg, var(--marino) 0%, var(--azul) 100%); color: #fff; padding-block: 48px 92px; }
    .eyebrow { color: var(--dorado); font-size: .8rem; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; }
    .hero h1 { font-family: var(--titulos); font-size: clamp(1.7rem, 4.2vw, 2.6rem); line-height: 1.15; margin: 10px 0 14px; max-width: 900px; }
    .hero p { max-width: 760px; color: rgba(255,255,255,.88); }
    .periodo { display: inline-flex; align-items: center; gap: 8px; margin-top: 20px; padding: 6px 14px; border: 1px solid rgba(255,255,255,.35); border-radius: 20px; font-size: .85rem; }
    .periodo svg { width: 16px; height: 16px; fill: none; stroke: var(--dorado); stroke-width: 2; }

    /* Indicadores */
    .kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 18px; margin-top: -56px; }
    .kpi { display: flex; gap: 16px; align-items: flex-start; background: #fff; border: 1px solid var(--borde); border-top: 4px solid var(--c, var(--azul)); border-radius: 6px; padding: 20px; box-shadow: 0 6px 18px rgba(16,24,40,.08); }
    .kpi-temperatura { --c: var(--naranja); }
    .kpi-humedad { --c: var(--verde); }
    .kpi-radiacion { --c: var(--dorado); }
    .kpi-precipitacion { --c: var(--azul); }
    .kpi-icon { flex: none; display: grid; place-items: center; width: 46px; height: 46px; border-radius: 50%; background: color-mix(in srgb, var(--c, var(--azul)) 14%, white); }
    .kpi-icon svg { width: 24px; height: 24px; fill: none; stroke: var(--c, var(--azul)); stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
    .kpi h3 { font-size: .85rem; font-weight: 500; color: var(--suave); }
    .kpi-valor { font-size: 1.9rem; font-weight: 700; color: var(--marino); line-height: 1.2; margin-top: 4px; }
    .kpi-valor span { font-size: 1rem; font-weight: 600; color: var(--azul); }
    .kpi-n { font-size: .8rem; color: var(--suave); margin-top: 2px; }

    /* Gráfica */
    .panel { background: #fff; border: 1px solid var(--borde); border-radius: 6px; box-shadow: 0 6px 18px rgba(16,24,40,.08); margin-block: 32px; }
    .panel-head { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 12px; padding: 20px 24px; border-bottom: 1px solid var(--borde); }
    .panel-head h2 { font-family: var(--titulos); color: var(--azul); font-size: 1.5rem; }
    .panel-head h2::after { content: ''; display: block; width: 50px; height: 4px; margin-top: 8px; background: var(--dorado); border-radius: 2px; }
    .rango { display: flex; flex-wrap: wrap; gap: 6px; }
    .rango button { font: inherit; font-size: .8rem; font-weight: 600; padding: 6px 12px; border: 1px solid var(--azul); border-radius: 4px; background: #fff; color: var(--azul); cursor: pointer; }
    .rango button:hover { background: rgba(0,69,165,.08); }
    .rango button[aria-pressed="true"] { background: var(--azul); color: #fff; }
    .figura { padding: 8px 8px 12px; }
    .figura-alto { width: 100%; height: ${altoFigura}px; }
    :focus-visible { outline: 3px solid var(--dorado); outline-offset: 2px; }

    /* Pie */
    footer { background: var(--marino); color: #fff; border-top: 6px solid var(--dorado); margin-top: 48px; }
    footer .wrap { display: grid; gap: 24px; padding-block: 36px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
    footer h4 { color: var(--dorado); font-size: .8rem; letter-spacing: .1em; text-transform: uppercase; margin-bottom: 10px; }
    footer p, footer li { color: var(--pie); font-size: .9rem; }
    footer ul { list-style: none; }
    footer a { color: var(--pie); }
    footer a:hover { color: var(--dorado); }
    .copy { border-top: 1px solid rgba(255,255,255,.1); padding-block: 14px; font-size: .8rem; color: var(--pie); }

    @media (max-width: 640px) {
      .brandbar img { height: 52px; }
      .brandbar .logo-dag { display: none; }
      .brandbar .titulo strong { font-size: 1.1rem; }
      .brandbar .titulo span { font-size: .85rem; }
      .panel-head { padding: 16px; }
      .figura { padding: 0; }
    }
  </style>
</head>
<body>
  <header>
    <div class="topbar">
      <div class="wrap"><span>Universidad de Sonora</span><span>Hermosillo, Sonora</span></div>
    </div>
    <div class="brandbar">
      <div class="wrap">
        <img src="logo_unison.png" alt="Escudo de la Universidad de Sonora" width="100" height="125">
        <div class="titulo">
          <strong>Campo Experimental DAG</strong>
          <span>Departamento de Agricultura y Ganadería</span>
        </div>
        <img class="logo-dag" src="logo_dag.jpg" alt="Logotipo del Departamento de Agricultura y Ganadería" width="100" height="125">
      </div>
    </div>
    <nav class="navband" aria-label="Secciones">
      <ul class="wrap">
        <li><a href="#indicadores">Indicadores</a></li>
        <li><a href="#graficas">Gráficas</a></li>
        <li><a href="#acerca">Acerca de</a></li>
      </ul>
    </nav>
  </header>

  <main>
    <section class="hero">
      <div class="wrap">
        <p class="eyebrow">Monitoreo climático</p>
        <h1>${h1}</h1>
        <p>${descripcion}</p>
        ${periodo ? `<p class="periodo"><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>Periodo: ${periodo}</p>` : ''}
      </div>
    </section>

    <section id="indicadores" class="wrap" aria-label="Indicadores">
      <div class="kpis">${tarjetas}
      </div>
    </section>

    <section id="graficas" class="wrap">
      <div class="panel">
        <div class="panel-head">
          <h2>Series diarias</h2>
          <div class="rango" role="group" aria-label="Rango de fechas">
            <button type="button" data-meses="1" aria-pressed="false">1 mes</button>
            <button type="button" data-meses="3" aria-pressed="false">3 meses</button>
            <button type="button" data-meses="6" aria-pressed="false">6 meses</button>
            <button type="button" data-meses="0" aria-pressed="true">Todo</button>
          </div>
        </div>
        <div class="figura">
          <div class="figura-alto">${figura}</div>
        </div>
      </div>
    </section>
  </main>

  <footer id="acerca">
    <div class="wrap">
      <div>
        <h4>Campo Experimental DAG</h4>
        <p>${descripcion}</p>
      </div>
      <div>
        <h4>Variables</h4>
        <ul>
          <li>Temperatura (°C)</li>
          <li>Humedad relativa (%)</li>
          <li>Radiación solar (W/m²)</li>
          <li>Precipitación (mm)</li>
        </ul>
      </div>
      <div>
        <h4>Universidad de Sonora</h4>
        <p>Departamento de Agricultura y Ganadería<br>Hermosillo, Sonora, México</p>
        <p><a href="https://www.unison.mx">www.unison.mx</a></p>
      </div>
    </div>
    <div class="copy"><div class="wrap">Última actualización de datos: <span id="ultima">${periodo.split('—').pop().trim()}</span></div></div>
  </footer>

  <script>
  (function () {
    var gd = document.querySelector('.plotly-graph-div');
    if (!gd || !window.Plotly) return;

    var colores = {
      'Mínima': '#0045a5',
      'Media disponible': '#1b998b',
      'Máxima': '#e0671f',
      'Radiación': '#d99400',
      'Precipitación': '#3d7ad6'
    };

    function estilizar() {
      var angosto = window.innerWidth < 640;
      var layout = {
        'title.text': '',
        'font.family': 'Montserrat, Segoe UI, Arial, sans-serif',
        'font.color': '#202020',
        'paper_bgcolor': '#ffffff',
        'plot_bgcolor': '#ffffff',
        'margin.t': angosto ? 110 : 70,
        'margin.l': angosto ? 52 : 80,
        'margin.r': angosto ? 10 : 24,
        'legend.yanchor': 'bottom',
        'legend.y': 1.035,
        'legend.font.size': angosto ? 11 : 12,
        'hoverlabel.font.family': 'Montserrat, Segoe UI, Arial, sans-serif'
      };
      (gd.layout.annotations || []).forEach(function (_, i) {
        layout['annotations[' + i + '].font.color'] = '#001149';
        layout['annotations[' + i + '].font.size'] = 15;
      });
      ['', '2', '3', '4'].forEach(function (n) {
        layout['xaxis' + n + '.gridcolor'] = '#e3e6eb';
        layout['yaxis' + n + '.gridcolor'] = '#e3e6eb';
        layout['xaxis' + n + '.linecolor'] = '#c9ced6';
        layout['yaxis' + n + '.zeroline'] = false;
        layout['yaxis' + n + '.title.font.color'] = '#5c5f66';
      });
      Plotly.relayout(gd, layout);

      gd.data.forEach(function (t, i) {
        var c = colores[t.name];
        if (!c) return;
        if (t.type === 'bar') {
          Plotly.restyle(gd, { 'marker.color': c }, [i]);
        } else {
          Plotly.restyle(gd, { 'line.color': c }, [i]);
        }
      });
    }

    // Botones de rango de fechas (todas las gráficas comparten el eje X)
    var xs = (gd.data[0] && gd.data[0].x) || [];
    var fin = xs.length ? new Date(xs[xs.length - 1]) : null;
    var inicioTotal = xs.length ? new Date(xs[0]) : null;
    var botones = document.querySelectorAll('.rango button');
    botones.forEach(function (b) {
      b.addEventListener('click', function () {
        if (!fin) return;
        var meses = Number(b.getAttribute('data-meses'));
        var inicio = meses ? new Date(fin) : inicioTotal;
        if (meses) inicio.setMonth(inicio.getMonth() - meses);
        var hasta = new Date(fin);
        hasta.setDate(hasta.getDate() + 1);
        Plotly.relayout(gd, { 'xaxis4.range': [inicio.toISOString().slice(0, 10), hasta.toISOString().slice(0, 10)] });
        botones.forEach(function (o) { o.setAttribute('aria-pressed', String(o === b)); });
      });
    });

    estilizar();
    var t;
    window.addEventListener('resize', function () {
      clearTimeout(t);
      t = setTimeout(estilizar, 200);
    });
  })();
  </script>
</body>
</html>
`;

fs.writeFileSync(salida, salidaHtml);
console.log(`Diseño aplicado: ${salida}`);
console.log(`  Indicadores: ${kpis.length} · Figura: ${altoFigura}px · Periodo: ${periodo || '(no encontrado)'}`);
