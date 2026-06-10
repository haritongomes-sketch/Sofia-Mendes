/**
 * Skill: Ferramenta web de importação de leads (Excel/CSV → Fila)
 *
 * HTML autocontido servido em GET /importar (mesma origem da API → sem CORS).
 * O Excel é lido no navegador (SheetJS via CDN); o backend recebe JSON e enfileira.
 * Requer o CRON_SECRET (campo "chave") para autorizar o POST /api/leads/import.
 */

function htmlImportTool() {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Importar Leads — Altum / Sofia</title>
<script src="https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js"></script>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  :root { --navy:#0f1c2e; --navy-soft:#1b2c44; --gold:#b08d57; --gold-soft:#c9a878;
    --ink:#20262e; --muted:#5a6470; --line:#e3e1da; --ok:#2e7d52; --warn:#b5862b; --err:#b3402f; --bg:#ece9e2; }
  body { font-family:"Helvetica Neue",Arial,"Segoe UI",sans-serif; color:var(--ink); background:var(--bg); padding:24px 14px 60px; }
  .wrap { max-width:920px; margin:0 auto; }
  header { background:var(--navy); color:#fff; border-radius:10px 10px 0 0; padding:22px 26px; position:relative; }
  header::after { content:""; position:absolute; left:0; bottom:0; width:100%; height:3px;
    background:linear-gradient(90deg,var(--gold) 0%,var(--gold-soft) 60%,transparent 100%); }
  header .mark { font-family:Georgia,serif; font-size:22px; font-weight:700; letter-spacing:.03em; }
  header .mark span { color:var(--gold-soft); }
  header .sub { font-size:11px; letter-spacing:.2em; text-transform:uppercase; color:#aeb8c6; margin-top:4px; }
  .card { background:#fff; border:1px solid var(--line); border-top:none; padding:22px 26px; }
  .card.first { border-radius:0; }
  .card.last { border-radius:0 0 10px 10px; }
  h2 { font-family:Georgia,serif; font-size:15px; color:var(--navy); margin-bottom:12px; }
  label { font-size:11px; letter-spacing:.05em; text-transform:uppercase; color:var(--muted); display:block; margin-bottom:5px; }
  input[type=password], input[type=text] { width:100%; font:inherit; font-size:14px; padding:9px 11px;
    border:1px solid var(--line); border-radius:6px; background:#fbfaf7; }
  .drop { border:2px dashed var(--gold-soft); border-radius:10px; padding:30px; text-align:center; cursor:pointer;
    background:#faf8f3; transition:all .15s; }
  .drop.hover { background:#f3eee2; border-color:var(--gold); }
  .drop p { color:var(--muted); font-size:13px; }
  .drop b { color:var(--navy); }
  .row { display:flex; gap:14px; align-items:center; flex-wrap:wrap; }
  .pill { display:inline-block; font-size:12px; font-weight:600; padding:4px 10px; border-radius:20px; }
  .pill.ok { background:#e7f1ec; color:var(--ok); }
  .pill.warn { background:#f6efdc; color:var(--warn); }
  .pill.err { background:#f6e3df; color:var(--err); }
  table { width:100%; border-collapse:collapse; margin-top:12px; font-size:12px; }
  th,td { text-align:left; padding:6px 8px; border-bottom:1px solid var(--line); }
  th { color:var(--muted); font-weight:600; text-transform:uppercase; font-size:10px; letter-spacing:.05em; }
  td.bad { color:var(--err); }
  .chk { display:flex; align-items:center; gap:8px; font-size:13px; color:var(--ink); margin:14px 0; }
  button { font:inherit; font-size:13px; font-weight:600; cursor:pointer; border:none; border-radius:7px; padding:11px 20px; }
  button.primary { background:var(--gold); color:var(--navy); }
  button.primary:disabled { background:#d8d2c5; color:#9a948a; cursor:not-allowed; }
  button.ghost { background:transparent; border:1px solid var(--line); color:var(--navy); }
  .muted { color:var(--muted); font-size:12px; }
  .status-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(120px,1fr)); gap:10px; margin-top:6px; }
  .stat { background:#faf8f3; border:1px solid var(--line); border-radius:8px; padding:12px; text-align:center; }
  .stat .n { font-family:Georgia,serif; font-size:24px; color:var(--navy); }
  .stat .l { font-size:10px; text-transform:uppercase; letter-spacing:.06em; color:var(--muted); margin-top:2px; }
  #result { margin-top:14px; font-size:13px; line-height:1.6; }
  .hide { display:none; }
</style>
</head>
<body>
<div class="wrap">
  <header>
    <div class="mark">Altum<span>·</span>Wealth</div>
    <div class="sub">Importação de Leads — Fila da Sofia</div>
  </header>

  <div class="card first">
    <h2>1 · Chave de acesso</h2>
    <label>CRON_SECRET (autoriza a importação)</label>
    <input id="secret" type="password" placeholder="cole a chave secreta" autocomplete="off">
    <p class="muted" style="margin-top:6px">A chave é a mesma do CRON_SECRET da Vercel. Fica salva só neste navegador.</p>
  </div>

  <div class="card">
    <h2>2 · Selecione a planilha</h2>
    <div class="drop" id="drop">
      <p><b>Arraste o Excel/CSV aqui</b> ou clique para escolher</p>
      <p class="muted" style="margin-top:6px">Colunas reconhecidas: nome, whatsapp, email, nicho, profissão, cidade, estado, patrimônio</p>
      <input id="file" type="file" accept=".xlsx,.xls,.csv" class="hide">
    </div>
    <div id="parsed" class="hide" style="margin-top:14px">
      <div class="row">
        <span class="pill ok" id="pillValid">0 válidos</span>
        <span class="pill warn" id="pillInvalid">0 sem nome/WhatsApp</span>
        <span class="muted" id="fileName"></span>
      </div>
      <div style="overflow:auto"><table id="preview"></table></div>
      <p class="muted" id="moreRows"></p>
    </div>
  </div>

  <div class="card">
    <h2>3 · Importar</h2>
    <label class="chk"><input type="checkbox" id="liberarAgora"> Liberar a cota de hoje imediatamente após importar (até o máximo diário)</label>
    <div class="row">
      <button class="primary" id="btnImport" disabled>Importar para a fila</button>
      <button class="ghost" id="btnStatus">Atualizar status da fila</button>
    </div>
    <div id="result"></div>
  </div>

  <div class="card last">
    <h2>Status da fila</h2>
    <div class="status-grid">
      <div class="stat"><div class="n" id="sFila">–</div><div class="l">Na fila</div></div>
      <div class="stat"><div class="n" id="sHoje">–</div><div class="l">Liberados hoje</div></div>
      <div class="stat"><div class="n" id="sRest">–</div><div class="l">Restam hoje</div></div>
      <div class="stat"><div class="n" id="sDias">–</div><div class="l">Dias p/ esvaziar</div></div>
    </div>
  </div>
</div>

<script>
  const $ = (id) => document.getElementById(id);
  let LEADS = [];

  // Persistência local da chave
  $('secret').value = localStorage.getItem('altum_cron_secret') || '';
  $('secret').addEventListener('input', e => localStorage.setItem('altum_cron_secret', e.target.value));

  // Normalização de cabeçalho → chave canônica
  const norm = s => String(s||'').toLowerCase().normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').trim();
  const MAP = {
    nome:'nome', name:'nome', 'nome completo':'nome',
    whatsapp:'whatsapp', telefone:'whatsapp', celular:'whatsapp', fone:'whatsapp', phone:'whatsapp', 'whats':'whatsapp',
    email:'email', 'e-mail':'email',
    nicho:'nicho', segmento:'nicho',
    profissao:'profissao', cargo:'profissao',
    cidade:'cidade', estado:'estado', uf:'estado',
    patrimonio:'patrimonio', perfil:'perfil', regiao:'regiao'
  };

  function mapRow(row) {
    const out = {};
    for (const k in row) { const canon = MAP[norm(k)]; if (canon) out[canon] = row[k]; }
    return out;
  }
  function digits(v){ let d=String(v==null?'':v).replace(/\\D/g,''); if(d && d.length<=11 && !d.startsWith('55')) d='55'+d; return d; }
  function valido(r){ return String(r.nome||'').trim() && digits(r.whatsapp).length>=10; }

  function handleFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const wb = XLSX.read(e.target.result, { type:'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { defval:'' });
      LEADS = rows.map(mapRow);
      renderPreview(file.name);
    };
    reader.readAsArrayBuffer(file);
  }

  function renderPreview(name) {
    const validos = LEADS.filter(valido);
    const invalidos = LEADS.length - validos.length;
    $('parsed').classList.remove('hide');
    $('fileName').textContent = name + ' · ' + LEADS.length + ' linhas';
    $('pillValid').textContent = validos.length + ' válidos';
    $('pillInvalid').textContent = invalidos + ' sem nome/WhatsApp';
    $('btnImport').disabled = validos.length === 0;

    const cols = ['nome','whatsapp','nicho','profissao','cidade','estado','email'];
    let html = '<tr>' + cols.map(c=>'<th>'+c+'</th>').join('') + '</tr>';
    LEADS.slice(0,10).forEach(r => {
      const ok = valido(r);
      html += '<tr>' + cols.map(c => {
        let v = r[c]==null?'':String(r[c]);
        if (c==='whatsapp') v = digits(v);
        const bad = (c==='nome'||c==='whatsapp') && !ok ? ' class="bad"' : '';
        return '<td'+bad+'>'+(v||'—')+'</td>';
      }).join('') + '</tr>';
    });
    $('preview').innerHTML = html;
    $('moreRows').textContent = LEADS.length>10 ? ('... e mais '+(LEADS.length-10)+' linhas') : '';
  }

  // Drag & drop
  const drop = $('drop');
  drop.onclick = () => $('file').click();
  $('file').onchange = e => { if (e.target.files[0]) handleFile(e.target.files[0]); };
  ['dragover','dragenter'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('hover'); }));
  ['dragleave','drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('hover'); }));
  drop.addEventListener('drop', e => { const f = e.dataTransfer.files[0]; if (f) handleFile(f); });

  // Importar
  $('btnImport').onclick = async () => {
    const secret = $('secret').value.trim();
    if (!secret) { $('result').innerHTML = '<span class="pill err">Informe a chave de acesso</span>'; return; }
    const validos = LEADS.filter(valido);
    $('btnImport').disabled = true; $('result').textContent = 'Importando ' + validos.length + ' leads...';
    try {
      const r = await fetch('/api/leads/import', {
        method:'POST',
        headers:{ 'Content-Type':'application/json', 'x-cron-secret': secret },
        body: JSON.stringify({ leads: validos, liberarAgora: $('liberarAgora').checked })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || ('HTTP '+r.status));
      let msg = '<span class="pill ok">'+j.importados+' importados</span> ';
      if (j.duplicados) msg += '<span class="pill warn">'+j.duplicados+' duplicados</span> ';
      if (j.invalidos) msg += '<span class="pill err">'+j.invalidos+' inválidos</span> ';
      if (j.liberacao && (j.liberacao.agendado || j.liberacao.liberados!=null))
        msg += '<br><span class="muted">Liberação da cota de hoje iniciada.</span>';
      $('result').innerHTML = msg;
      if (j.fila) pintaStatus(j.fila);
    } catch (err) {
      $('result').innerHTML = '<span class="pill err">Erro: '+err.message+'</span>';
    } finally {
      $('btnImport').disabled = false;
    }
  };

  // Status
  function pintaStatus(f) {
    $('sFila').textContent = f.naFila; $('sHoje').textContent = f.liberadosHoje;
    $('sRest').textContent = f.restanteHoje; $('sDias').textContent = f.diasUteisParaEsvaziar;
  }
  $('btnStatus').onclick = async () => {
    try { const r = await fetch('/api/leads/fila'); pintaStatus(await r.json()); }
    catch (e) { /* silencioso */ }
  };
  $('btnStatus').click();
</script>
</body>
</html>`;
}

module.exports = { htmlImportTool };
