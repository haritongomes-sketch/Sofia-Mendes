import { useState, useRef, useEffect, useCallback } from "react";
import { Plus, Bot, X, Target, Users, Calendar, Send, ChevronRight, Filter, Linkedin, RefreshCw, Bell } from "lucide-react";

// ─── Config ───────────────────────────────────────────────────────────────────

const API = import.meta.env?.VITE_API_URL || "http://localhost:3000";

const STAGES = [
  { id:"prospeccao", label:"Prospecção", color:"#5b8df5" },
  { id:"qualificacao", label:"Qualificação", color:"#a78bfa" },
  { id:"reuniao", label:"Reunião", color:"#f59e0b" },
  { id:"proposta", label:"Proposta", color:"#f472b6" },
  { id:"conversao", label:"Conversão", color:"#34d399" },
];

const NICHOS = [
  { id:"medico_cirurgiao", label:"Médico Cirurgião", icon:"🏥", color:"#5b8df5", dores:["Proteção contra processos","Patrimônio 100% em BRL","Sem planejamento sucessório"], abordagem:"Foco em proteção patrimonial via seguro de vida internacional + diversificação offshore. Blindagem contra processos é o gatilho emocional principal.", patrimonioMedio:"R$ 2–8M", qualificadores:["Cirurgião/especialista ativo","Clínica ou hospital próprio","5+ anos de carreira"], msgLinkedin:"Olá Dr(a). [NOME], tudo bem?\n\nVi que você é cirurgião(ã) em [CIDADE] e gostaria de apresentar algo que tem gerado muito interesse entre médicos especialistas: estratégias de proteção patrimonial e diversificação internacional.\n\nMuitos colegas já posicionam parte do patrimônio fora do Brasil — tanto pela segurança jurídica quanto pelo crescimento em dólar. Seria ótimo trocar uma ideia sobre como isso pode funcionar para você.\n\nTem 15 minutos esta semana?" },
  { id:"advogado_tributarista", label:"Adv. Tributarista", icon:"⚖️", color:"#a78bfa", dores:["Alta carga tributária","Necessidade de estrutura offshore","Planejamento sucessório"], abordagem:"Abordagem técnica — tributaristas entendem de estruturas. Focar em eficiência fiscal via offshore, trusts e proteção de patrimônio.", patrimonioMedio:"R$ 1.5–6M", qualificadores:["Sócio ou titular","Tributarista/societário","Escritório próprio"], msgLinkedin:"Olá Dr(a). [NOME], tudo bem?\n\nComo especialista em direito tributário, você sabe o valor de uma estrutura bem planejada. Trabalho com sócios de escritório que desejam diversificar internacionalmente com eficiência fiscal — offshore, seguros de vida no exterior e proteção sucessória.\n\nSeria interessante conversar sobre estratégias que complementam o que você já conhece do lado jurídico.\n\nTem disponibilidade para 15 minutos?" },
  { id:"ceo_empresario", label:"CEO / Empresário", icon:"💼", color:"#f59e0b", dores:["Concentração de risco no Brasil","Exposição cambial","Sucessão da empresa"], abordagem:"Focar em diversificação geográfica e proteção cambial. CEOs entendem de risco — mostrar que 20–30% fora do Brasil é gestão inteligente, não fuga.", patrimonioMedio:"R$ 3–20M", qualificadores:["C-level ou fundador","Empresa faturamento 5M+","Patrimônio pessoal acumulado"], msgLinkedin:"Olá [NOME], tudo bem?\n\nVi que você lidera [EMPRESA] em [CIDADE] — parabéns pelo trabalho!\n\nTrabalho com empresários e C-levels que desejam diversificar o patrimônio pessoal fora do Brasil: ativos em dólar, proteção cambial e estruturas para sucessão familiar eficiente.\n\nRecentemente apoiei outros CEOs a alocar parte do patrimônio em mercados internacionais, reduzindo a exposição ao risco-Brasil. Vale uma conversa rápida?" },
  { id:"dentista_especialista", label:"Dentista Especialista", icon:"🦷", color:"#34d399", dores:["Patrimônio sem diversificação","Dependência do consultório","Sem proteção sucessória"], abordagem:"Mesma dor do médico, tom mais próximo. Especialistas de alto padrão têm patrimônio expressivo e pouco planejamento internacional.", patrimonioMedio:"R$ 1–4M", qualificadores:["Especialista (implante, ortod.)","Clínica própria consolidada"], msgLinkedin:"Olá Dr(a). [NOME], tudo bem?\n\nVi que você é especialista em [ESPECIALIDADE] em [CIDADE]. Trabalho com cirurgiões-dentistas que constroem um belo patrimônio ao longo da carreira, mas ainda não deram o passo de diversificá-lo internacionalmente.\n\nTenho ajudado colegas seus a estruturar parte do patrimônio em dólar, com proteção e crescimento fora do Brasil.\n\nVale uma conversa rápida?" },
  { id:"engenheiro_executivo", label:"Engenheiro Executivo", icon:"⚙️", color:"#f472b6", dores:["Concentração em ações da empresa","FGTS como principal reserva","Pouca diversificação internacional"], abordagem:"Executivos seniores de grandes empresas têm ações e bônus acumulados. Foco em diversificação além da empresa empregadora.", patrimonioMedio:"R$ 1.5–5M", qualificadores:["Gerência sênior ou acima","Empresa de grande porte","Stock options/bônus"], msgLinkedin:"Olá [NOME], tudo bem?\n\nVi que você é executivo(a) na [EMPRESA]. Trabalho com profissionais de alta performance que desejam diversificar o patrimônio pessoal além das ações da empresa — algo que muitos deixam em segundo plano.\n\nTenho ajudado engenheiros e gestores a alocar parte do patrimônio em ativos internacionais, reduzindo a concentração e protegendo em dólar.\n\nPodemos conversar 15 minutos?" },
];

const REGIOES = [
  { id:"norte", label:"Norte", color:"#22d3ee" },
  { id:"nordeste", label:"Nordeste", color:"#fb923c" },
  { id:"centro_oeste", label:"Centro-Oeste", color:"#a3e635" },
  { id:"sul", label:"Sul", color:"#818cf8" },
  { id:"sudeste", label:"Sudeste", color:"#f472b6" },
];

const INSTITUICOES = [
  { id:"btg", label:"BTG Pactual", color:"#f59e0b", oportunidade:"Já sofisticado. Mostre acesso a produtos exclusivos internacionais que BTG não oferece diretamente." },
  { id:"xp", label:"XP Investimentos", color:"#22c55e", oportunidade:"Conflito de comissão é a fraqueza. Fee-based sem conflito de interesse é a diferenciação." },
  { id:"bradesco", label:"Bradesco", color:"#ef4444", oportunidade:"Produto bancário padrão. Mostre diversificação real vs. produto de prateleira." },
  { id:"itau", label:"Itaú", color:"#f97316", oportunidade:"Banco premium, mas limitado a produtos nacionais. Acesso ao mercado internacional é o gancho." },
  { id:"safra", label:"Safra", color:"#8b5cf6", oportunidade:"Perfil conservador, tradicional. Mostre proteção + crescimento no exterior com segurança." },
  { id:"nubank", label:"Nubank/Rico", color:"#a855f7", oportunidade:"Self-directed, valoriza tecnologia. Abordagem: sofisticação sem complicação, fee transparente." },
  { id:"outro", label:"Outra", color:"#6b7280", oportunidade:"Avaliar caso a caso na qualificação." },
  { id:"nenhum", label:"Não declarado", color:"#374151", oportunidade:"Primeira pergunta na qualificação: onde investe hoje?" },
];

const LI_STATUS = [
  { id:"nao_contactado", label:"Não contatado", color:"#6b7280" },
  { id:"mensagem_enviada", label:"Msg enviada", color:"#5b8df5" },
  { id:"visualizou", label:"Visualizou", color:"#f59e0b" },
  { id:"respondeu", label:"Respondeu", color:"#34d399" },
  { id:"qualificado", label:"Qualificado", color:"#a78bfa" },
];

const CONV_STAGES = [
  { id:"abertura", label:"Abertura", color:"#5b8df5" },
  { id:"qualificacao", label:"Qualificação", color:"#a78bfa" },
  { id:"objecao", label:"Objeção", color:"#f59e0b" },
  { id:"agendamento", label:"Agendando", color:"#f472b6" },
  { id:"confirmado", label:"Confirmado ✅", color:"#34d399" },
];

const PAT_RANGES = [
  { id:"ate3M", label:"Até R$ 3M", min:0, max:3000000 },
  { id:"3a5M", label:"R$ 3–5M", min:3000000, max:5000000 },
  { id:"acima5M", label:"Acima R$ 5M", min:5000000, max:Infinity },
];

const PERFIL_ICON = { Conservador:"🛡️", Moderado:"⚖️", Arrojado:"🚀" };

const AGENT_SYSTEM = `Você é um assistente especializado em prospecção de clientes private/high-net-worth para investimentos internacionais e seguros de vida internacionais. Consultor financeiro fee-based.

NICHOS: Médicos Cirurgiões (proteção contra processos, diversificação dólar) | Advogados Tributaristas (eficiência fiscal offshore, trusts) | CEOs/Empresários (risco Brasil, câmbio, sucessão) | Dentistas Especialistas (patrimônio sem diversificação) | Engenheiros Executivos (concentração em ações da empresa)

ANÁLISE CONCORRÊNCIA: BTG→produtos internacionais exclusivos | XP→conflito comissão, fee-based é diferencial | Bradesco/Itaú→produto prateleira, mostrar diversificação real | Safra→conservador, proteção+crescimento exterior | Nubank→fee transparente, sofisticação

Gere mensagens LinkedIn personalizadas, scripts de qualificação e estratégias por nicho e região. Português brasileiro, objetivo e prático.`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sStage = id => STAGES.find(s => s.id === id) || STAGES[0];
const sNicho = id => NICHOS.find(n => n.id === id);
const sRegiao = id => REGIOES.find(r => r.id === id);
const parseJSON = (s, fallback = []) => { try { return JSON.parse(s); } catch { return fallback; } };

// ─── Component ────────────────────────────────────────────────────────────────

export default function PrivateCRMv3() {
  const [leads, setLeads] = useState([]);
  const [selected, setSelected] = useState(null);
  const [view, setView] = useState("pipeline");
  const [agentOpen, setAgentOpen] = useState(true);
  const [msgs, setMsgs] = useState([{ role:"assistant", content:"Olá! Sou seu agente de prospecção. Os leads são gerenciados pelo backend — Sofia envia WhatsApp automaticamente quando você adiciona um novo lead. 🎯" }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [meetings, setMeetings] = useState({ count: 0, max: 2, reunioes: [] });
  const [form, setForm] = useState({ nome:"", whatsapp:"", patrimonio:"", perfil:"Moderado", cidade:"", profissao:"", nicho:"medico_cirurgiao", regiao:"sudeste", estado:"", instituicoes:[], tags:[], linkedinStatus:"nao_contactado" });
  const [filters, setFilters] = useState({ nichos:[], regioes:[], patRanges:[], open:false });
  const [activeNicho, setActiveNicho] = useState(null);
  const [editMsg, setEditMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);
  const endRef = useRef(null);

  // ─── Data fetching ────────────────────────────────────────────────────────

  const fetchLeads = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/leads`);
      if (!res.ok) return;
      const data = await res.json();
      setLeads(data.map(l => ({
        ...l,
        instituicoes: parseJSON(l.instituicoes, []),
        tags: parseJSON(l.tags, []),
        conversations: l.mensagens || []
      })));
      setLastRefresh(new Date());
    } catch {}
  }, []);

  const fetchMeetings = useCallback(async () => {
    try {
      const res = await fetch(`${API}/api/meetings/today`);
      if (res.ok) setMeetings(await res.json());
    } catch {}
  }, []);

  useEffect(() => {
    fetchLeads();
    fetchMeetings();
    const interval = setInterval(() => { fetchLeads(); fetchMeetings(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchLeads, fetchMeetings]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior:"smooth" }); }, [msgs]);
  useEffect(() => { if (activeNicho) { const n = NICHOS.find(x => x.id === activeNicho); setEditMsg(n?.msgLinkedin || ""); } }, [activeNicho]);

  // ─── Lead actions ─────────────────────────────────────────────────────────

  const addLead = async () => {
    if (!form.nome || !form.whatsapp) return;
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (res.status === 409) { alert('Este WhatsApp já está cadastrado.'); return; }
      if (!res.ok) { alert('Erro: ' + data.error); return; }
      setShowAdd(false);
      setForm({ nome:"", whatsapp:"", patrimonio:"", perfil:"Moderado", cidade:"", profissao:"", nicho:"medico_cirurgiao", regiao:"sudeste", estado:"", instituicoes:[], tags:[], linkedinStatus:"nao_contactado" });
      setTimeout(fetchLeads, 1500);
      alert(`✅ ${data.lead.nome} adicionado! Sofia está enviando a mensagem de abertura pelo WhatsApp.`);
    } catch (err) {
      alert('Erro de conexão com o backend.');
    } finally {
      setSaving(false);
    }
  };

  const moveStage = async (id, estagio) => {
    setLeads(p => p.map(l => l.id === id ? { ...l, estagio } : l));
    if (selected?.id === id) setSelected(p => ({ ...p, estagio }));
    await fetch(`${API}/api/leads/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ estagio }) });
  };

  const setLiStatus = async (id, linkedinStatus) => {
    setLeads(p => p.map(l => l.id === id ? { ...l, linkedinStatus } : l));
    if (selected?.id === id) setSelected(p => ({ ...p, linkedinStatus }));
    await fetch(`${API}/api/leads/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ linkedinStatus }) });
  };

  // ─── AI Agent (via backend proxy) ────────────────────────────────────────

  const sendMsg = async (text) => {
    if (!text.trim() || loading) return;
    const ctx = selected
      ? `[LEAD: nome=${selected.nome}, patrimônio=${selected.patrimonio}, perfil=${selected.perfil}, profissão=${selected.profissao}, nicho=${sNicho(selected.nicho)?.label}, região=${sRegiao(selected.regiao)?.label}, cidade=${selected.cidade}, etapa=${sStage(selected.estagio)?.label}]\n\n`
      : "";
    setMsgs(p => [...p, { role:"user", content:text }]);
    setInput(""); setLoading(true);
    try {
      const res = await fetch(`${API}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: AGENT_SYSTEM, messages: [...msgs.slice(-8), { role:"user", content: ctx + text }] })
      });
      const d = await res.json();
      setMsgs(p => [...p, { role:"assistant", content: d.content || "Erro." }]);
    } catch { setMsgs(p => [...p, { role:"assistant", content:"Erro de conexão." }]); }
    setLoading(false);
  };

  // ─── Filters ──────────────────────────────────────────────────────────────

  const activeCount = filters.nichos.length + filters.regioes.length + filters.patRanges.length;
  const applyFilters = list => list.filter(l => {
    if (filters.nichos.length && !filters.nichos.includes(l.nicho)) return false;
    if (filters.regioes.length && !filters.regioes.includes(l.regiao)) return false;
    if (filters.patRanges.length) {
      const num = l.patrimonioNum || 0;
      const ranges = PAT_RANGES.filter(r => filters.patRanges.includes(r.id));
      if (!ranges.some(r => num >= r.min && num <= r.max)) return false;
    }
    return true;
  });
  const filtered = applyFilters(leads);
  const toggleF = (k, v) => setFilters(p => ({ ...p, [k]: p[k].includes(v) ? p[k].filter(x => x !== v) : [...p[k], v] }));

  const copyMsg = () => { try { navigator.clipboard.writeText(editMsg); } catch(e){} setCopied(true); setTimeout(() => setCopied(false), 2000); };

  // ─── Styles ───────────────────────────────────────────────────────────────

  const S = {
    app: { display:"flex", height:"100vh", overflow:"hidden", fontFamily:"'Sora','Inter',sans-serif", background:"#0a0e1a", color:"#e8eeff" },
    sb: { width:"182px", background:"#0c1120", borderRight:"1px solid #1c2a40", display:"flex", flexDirection:"column", flexShrink:0 },
    tb: { height:"54px", background:"#0c1120", borderBottom:"1px solid #1c2a40", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"0 13px", flexShrink:0 },
    inp: { background:"#111827", border:"1px solid #1c2a40", color:"#e8eeff", padding:"7px 10px", borderRadius:"7px", fontSize:"12px", fontFamily:"'Sora','Inter',sans-serif", outline:"none", width:"100%" },
    lbl: { fontSize:"10px", color:"#7a8aaa", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:"4px", display:"block" },
    card: sel => ({ background:sel?"#152030":"#111827", border:`1px solid ${sel?"#c8a96e40":"#1c2a40"}`, borderRadius:"9px", padding:"10px", cursor:"pointer" }),
    pill: (c, sz) => ({ background:c+"18", color:c, padding:`${sz||2}px 7px`, borderRadius:"10px", fontSize:"10px", fontWeight:600, display:"inline-block" }),
    btn: (a, c="#c8a96e") => ({ background:a?c+"22":"transparent", border:`1px solid ${a?c:"#1c2a40"}`, color:a?c:"#7a8aaa", padding:"4px 10px", borderRadius:"6px", fontSize:"11px", cursor:"pointer", fontFamily:"'Sora','Inter',sans-serif" }),
  };

  // ─── Sub-components ───────────────────────────────────────────────────────

  const NavItem = ({ id, icon:Icon, label }) => (
    <div onClick={() => setView(id)} style={{ display:"flex", alignItems:"center", gap:"8px", padding:"9px 13px", cursor:"pointer", background:view===id?"#1a2840":"transparent", borderLeft:`3px solid ${view===id?"#c8a96e":"transparent"}`, color:view===id?"#c8a96e":"#7a8aaa", fontSize:"12px" }}>
      <Icon size={13}/>{label}
    </div>
  );

  const MeetingBar = () => (
    <div style={{ display:"flex", alignItems:"center", gap:"8px", padding:"6px 13px", background:meetings.count>=meetings.max?"#f5910010":"#34d39908", borderBottom:"1px solid #1c2a40", fontSize:"11px" }}>
      <Calendar size={11} color={meetings.count>=meetings.max?"#f59100":"#34d399"}/>
      <span style={{ color:meetings.count>=meetings.max?"#f59100":"#34d399", fontWeight:600 }}>{meetings.count}/{meetings.max} reuniões hoje</span>
      {meetings.count >= meetings.max && <span style={{ color:"#f87171", fontSize:"10px" }}>• Agenda cheia — Sofia está oferecendo próximos dias</span>}
      {lastRefresh && <span style={{ color:"#3a4a60", fontSize:"10px", marginLeft:"auto" }}>atualizado {lastRefresh.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</span>}
    </div>
  );

  const WaConvBadge = ({ lead }) => {
    const msgs = lead.mensagens || lead.conversations || [];
    const userMsgs = msgs.filter(m => m.role === 'user').length;
    const conv = CONV_STAGES.find(s => s.id === (lead.estagioConv || 'abertura'));
    if (!msgs.length) return null;
    return (
      <div style={{ display:"flex", alignItems:"center", gap:"4px", marginTop:"3px" }}>
        <span style={{ fontSize:"9px", color:"#25d366", fontWeight:600 }}>💬 WA</span>
        {conv && <span style={{ fontSize:"9px", color:conv.color }}>{conv.label}</span>}
        {userMsgs > 0 && <span style={{ background:"#25d36620", color:"#25d366", borderRadius:"8px", padding:"0 5px", fontSize:"9px" }}>{userMsgs} resp.</span>}
      </div>
    );
  };

  const LeadCard = ({ lead }) => {
    const s = sStage(lead.estagio), n = sNicho(lead.nicho), r = sRegiao(lead.regiao);
    const lis = LI_STATUS.find(x => x.id === lead.linkedinStatus);
    return (
      <div onClick={() => setSelected(lead)} style={S.card(selected?.id === lead.id)}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"4px" }}>
          <div><div style={{ fontWeight:600, fontSize:"12px" }}>{lead.nome}</div><div style={{ fontSize:"10px", color:"#7a8aaa" }}>{lead.profissao}</div></div>
          <span style={{ fontSize:"14px" }}>{PERFIL_ICON[lead.perfil]}</span>
        </div>
        <div style={{ fontSize:"13px", fontWeight:700, color:"#c8a96e", marginBottom:"4px" }}>{lead.patrimonio}</div>
        <div style={{ display:"flex", gap:"3px", flexWrap:"wrap", marginBottom:"2px" }}>
          {n && <span style={S.pill(n.color)}>{n.icon}</span>}
          {r && <span style={S.pill(r.color)}>{r.label}</span>}
          {lis && <span style={S.pill(lis.color)}>{lis.label}</span>}
        </div>
        <WaConvBadge lead={lead}/>
        {(lead.reunioes || []).some(r => r.status === 'agendada') && (
          <div style={{ marginTop:"3px", fontSize:"9px", color:"#34d399", fontWeight:600 }}>📅 Reunião agendada</div>
        )}
      </div>
    );
  };

  const FilterPanel = () => (
    <div style={{ background:"#0c1120", border:"1px solid #1c2a40", borderRadius:"10px", padding:"12px", marginBottom:"12px" }}>
      <div style={{ display:"flex", flexWrap:"wrap", gap:"14px" }}>
        {[{lbl:"Nicho",key:"nichos",items:NICHOS.map(n=>({id:n.id,label:`${n.icon} ${n.label.split(" ")[0]}`,color:n.color}))},{lbl:"Região",key:"regioes",items:REGIOES.map(r=>({id:r.id,label:r.label,color:r.color}))},{lbl:"Patrimônio",key:"patRanges",items:PAT_RANGES.map(r=>({id:r.id,label:r.label,color:"#c8a96e"}))}].map(({lbl,key,items}) => (
          <div key={key}>
            <div style={S.lbl}>{lbl}</div>
            <div style={{ display:"flex", flexWrap:"wrap", gap:"4px" }}>
              {items.map(item => <button key={item.id} onClick={() => toggleF(key, item.id)} style={{ ...S.btn(filters[key].includes(item.id), item.color), fontSize:"10px", padding:"3px 8px" }}>{item.label}</button>)}
            </div>
          </div>
        ))}
      </div>
      {activeCount > 0 && <div style={{ display:"flex", alignItems:"center", gap:"8px", marginTop:"8px", paddingTop:"8px", borderTop:"1px solid #1c2a40" }}>
        <span style={{ fontSize:"11px", color:"#7a8aaa" }}>{filtered.length} de {leads.length} leads</span>
        <button onClick={() => setFilters({ nichos:[], regioes:[], patRanges:[], open:true })} style={{ ...S.btn(false), fontSize:"10px", color:"#f87171", borderColor:"#f8717140" }}>✕ Limpar</button>
      </div>}
    </div>
  );

  const renderDetail = () => {
    if (!selected) return null;
    const s = sStage(selected.estagio), n = sNicho(selected.nicho), r = sRegiao(selected.regiao);
    const lis = LI_STATUS.find(x => x.id === selected.linkedinStatus);
    const instArr = parseJSON(selected.instituicoes || '[]', []);
    const conversations = selected.mensagens || selected.conversations || [];
    return (
      <div style={{ width:"290px", borderLeft:"1px solid #1c2a40", background:"#0c1120", overflowY:"auto", flexShrink:0, padding:"12px" }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"9px" }}>
          <span style={{ fontSize:"10px", color:"#7a8aaa", textTransform:"uppercase" }}>Perfil</span>
          <button onClick={() => setSelected(null)} style={{ background:"transparent", border:"none", color:"#7a8aaa", cursor:"pointer" }}><X size={14}/></button>
        </div>
        <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"18px", fontWeight:700, marginBottom:"2px" }}>{selected.nome}</div>
        <div style={{ fontSize:"11px", color:"#7a8aaa", marginBottom:"9px" }}>{selected.profissao} · {selected.cidade}</div>

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"5px", marginBottom:"8px" }}>
          {[["Patrimônio",selected.patrimonio,"#c8a96e"],["Perfil",`${PERFIL_ICON[selected.perfil]||""} ${selected.perfil}`,"#e8eeff"],["Nicho",n?`${n.icon} ${n.label.split(" ")[0]}`:"—",n?.color||"#e8eeff"],["Região",r?r.label:"—",r?.color||"#e8eeff"]].map(([k,v,c]) => (
            <div key={k} style={{ background:"#0a0e1a", borderRadius:"6px", padding:"7px 8px" }}>
              <div style={{ fontSize:"9px", color:"#7a8aaa", marginBottom:"2px", textTransform:"uppercase" }}>{k}</div>
              <div style={{ fontSize:"11px", color:c, fontWeight:500 }}>{v}</div>
            </div>
          ))}
        </div>

        {/* WhatsApp conversation stage */}
        {conversations.length > 0 && (
          <div style={{ background:"#25d36610", border:"1px solid #25d36630", borderRadius:"7px", padding:"8px", marginBottom:"8px" }}>
            <div style={{ fontSize:"10px", color:"#25d366", fontWeight:600, marginBottom:"4px" }}>💬 Sofia no WhatsApp</div>
            {(() => { const conv = CONV_STAGES.find(s => s.id === (selected.estagioConv || 'abertura')); return (
              <div style={{ display:"flex", alignItems:"center", gap:"6px" }}>
                <span style={{ ...S.pill(conv.color) }}>{conv.label}</span>
                <span style={{ fontSize:"10px", color:"#7a8aaa" }}>{conversations.length} msgs trocadas</span>
              </div>
            ); })()}
          </div>
        )}

        {/* Reuniões agendadas */}
        {(selected.reunioes || []).length > 0 && (
          <div style={{ background:"#34d39910", border:"1px solid #34d39930", borderRadius:"7px", padding:"8px", marginBottom:"8px" }}>
            <div style={{ fontSize:"10px", color:"#34d399", fontWeight:600, marginBottom:"4px" }}>📅 Reuniões</div>
            {selected.reunioes.map(r => (
              <div key={r.id} style={{ fontSize:"10px", color:"#a0e8c0" }}>{new Date(r.data).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"})} — {r.status}</div>
            ))}
          </div>
        )}

        <div style={{ marginBottom:"8px" }}>
          <div style={S.lbl}>Status LinkedIn</div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:"3px" }}>
            {LI_STATUS.map(ls => (
              <button key={ls.id} onClick={() => setLiStatus(selected.id, ls.id)} style={{ ...S.btn(selected.linkedinStatus === ls.id, ls.color), fontSize:"9px", padding:"2px 6px" }}>{ls.label}</button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:"8px" }}>
          <div style={S.lbl}>Mover etapa pipeline</div>
          <div style={{ display:"flex", flexDirection:"column", gap:"3px" }}>
            {STAGES.map(st => (
              <button key={st.id} onClick={() => moveStage(selected.id, st.id)} style={{ background:selected.estagio===st.id?st.color+"18":"transparent", border:`1px solid ${selected.estagio===st.id?st.color:"#1c2a40"}`, color:selected.estagio===st.id?st.color:"#7a8aaa", padding:"4px 8px", borderRadius:"5px", fontSize:"10px", cursor:"pointer", fontFamily:"'Sora','Inter',sans-serif", textAlign:"left", display:"flex", alignItems:"center", gap:"4px" }}>
                {selected.estagio===st.id&&<ChevronRight size={9}/>} {st.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom:"10px" }}>
          <div style={S.lbl}>Ações rápidas IA</div>
          {[["💬 WhatsApp",`Gere msg WhatsApp para ${selected.nome} (${n?.label}, ${selected.patrimonio}, perfil ${selected.perfil}). Etapa: ${s?.label}.`],["🔗 LinkedIn",`Gere mensagem LinkedIn personalizada para ${selected.nome}, ${n?.label} em ${selected.cidade}.`],["🎯 Estratégia",`Analise ${selected.nome}: nicho ${n?.label}, investe em ${instArr.map(i=>INSTITUICOES.find(x=>x.id===i)?.label).join(", ")||"não declarado"}. Melhor estratégia de conversão fee-based.`],["📅 Pauta reunião",`Pauta de reunião de 15 min para ${selected.nome} (${n?.label}, ${selected.patrimonio}, ${selected.perfil}).`]].map(([lb, pr]) => (
            <button key={lb} onClick={() => { setAgentOpen(true); sendMsg(pr); }} style={{ background:"#111827", border:"1px solid #1c2a40", color:"#a0b4d0", padding:"5px 8px", borderRadius:"5px", fontSize:"10px", cursor:"pointer", fontFamily:"'Sora','Inter',sans-serif", width:"100%", textAlign:"left", marginBottom:"3px" }}>{lb}</button>
          ))}
        </div>

        {/* Conversation history with Sofia */}
        <div>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"6px" }}>
            <div style={S.lbl}>Conversa Sofia ({conversations.length})</div>
            <button onClick={fetchLeads} style={{ ...S.btn(false), fontSize:"9px", padding:"2px 6px", display:"flex", alignItems:"center", gap:"3px" }}><RefreshCw size={9}/></button>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:"5px", maxHeight:"280px", overflowY:"auto" }}>
            {conversations.map((c, i) => (
              <div key={c.id || i} style={{ background:"#0a0e1a", borderRadius:"6px", padding:"7px 8px", borderLeft:`3px solid ${c.role==="assistant"?"#c8a96e":"#25d366"}` }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"2px" }}>
                  <span style={{ fontSize:"9px", color:c.role==="assistant"?"#c8a96e":"#25d366", fontWeight:600 }}>{c.role==="assistant"?"Sofia":"Cliente"}</span>
                  <span style={{ fontSize:"9px", color:"#7a8aaa" }}>{c.timestamp ? new Date(c.timestamp).toLocaleString("pt-BR",{hour:"2-digit",minute:"2-digit"}) : ""}</span>
                </div>
                <div style={{ fontSize:"10px", color:"#b0c4de", lineHeight:1.5 }}>{c.content}</div>
              </div>
            ))}
            {!conversations.length && <div style={{ textAlign:"center", color:"#3a4a60", fontSize:"10px", padding:"12px 0", border:"1px dashed #1c2a40", borderRadius:"6px" }}>Aguardando primeira mensagem da Sofia</div>}
          </div>
        </div>
      </div>
    );
  };

  const renderLinkedin = () => {
    const an = activeNicho ? NICHOS.find(n => n.id === activeNicho) : null;
    const nLeads = activeNicho ? applyFilters(leads.filter(l => l.nicho === activeNicho)) : [];
    return (
      <div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:"8px", marginBottom:"14px" }}>
          {NICHOS.map(n => {
            const nl = leads.filter(l => l.nicho === n.id), resp = nl.filter(l => ["respondeu","qualificado"].includes(l.linkedinStatus)).length;
            return (
              <div key={n.id} onClick={() => setActiveNicho(activeNicho === n.id ? null : n.id)} style={{ background:activeNicho===n.id?n.color+"20":"#111827", border:`1px solid ${activeNicho===n.id?n.color:"#1c2a40"}`, borderRadius:"10px", padding:"12px", cursor:"pointer", textAlign:"center", transition:"all 0.15s" }}>
                <div style={{ fontSize:"22px", marginBottom:"4px" }}>{n.icon}</div>
                <div style={{ fontSize:"11px", fontWeight:600, color:activeNicho===n.id?n.color:"#e8eeff", lineHeight:1.3, marginBottom:"6px" }}>{n.label}</div>
                <div style={{ display:"flex", justifyContent:"center", gap:"10px" }}>
                  <div><div style={{ fontSize:"15px", fontWeight:700, color:n.color }}>{nl.length}</div><div style={{ fontSize:"9px", color:"#7a8aaa" }}>leads</div></div>
                  <div><div style={{ fontSize:"15px", fontWeight:700, color:"#34d399" }}>{resp}</div><div style={{ fontSize:"9px", color:"#7a8aaa" }}>resp.</div></div>
                </div>
              </div>
            );
          })}
        </div>
        {!an && <div style={{ background:"#111827", border:"1px solid #1c2a40", borderRadius:"10px", padding:"24px", textAlign:"center", color:"#7a8aaa" }}>
          <div style={{ fontSize:"36px", marginBottom:"8px" }}>🔍</div>
          <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"16px", color:"#c8a96e" }}>Selecione um nicho acima</div>
          <div style={{ fontSize:"12px", marginTop:"4px" }}>Ver mensagens LinkedIn, estratégias e leads por nicho</div>
        </div>}
        {an && (
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:"12px" }}>
            <div style={{ display:"flex", flexDirection:"column", gap:"10px" }}>
              <div style={{ background:"#111827", border:"1px solid #1c2a40", borderRadius:"10px", padding:"14px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:"8px", marginBottom:"10px" }}>
                  <span style={{ fontSize:"20px" }}>{an.icon}</span>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"16px", color:an.color, fontWeight:700 }}>{an.label}</div>
                  <span style={{ fontSize:"12px", color:"#c8a96e", marginLeft:"auto", fontWeight:600 }}>{an.patrimonioMedio}</span>
                </div>
                <div style={{ marginBottom:"8px" }}>
                  <div style={S.lbl}>Principais dores</div>
                  {an.dores.map(d => <div key={d} style={{ fontSize:"11px", color:"#a0b4d0", marginBottom:"3px", display:"flex", gap:"5px" }}><span style={{ color:an.color }}>•</span>{d}</div>)}
                </div>
                <div><div style={S.lbl}>Abordagem recomendada</div><div style={{ fontSize:"11px", color:"#c0d0e8", lineHeight:1.6 }}>{an.abordagem}</div></div>
              </div>
              <div style={{ background:"#111827", border:"1px solid #1c2a40", borderRadius:"10px", padding:"14px" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
                  <div style={S.lbl}>Mensagem LinkedIn</div>
                  <div style={{ display:"flex", gap:"4px" }}>
                    <button onClick={() => sendMsg(`Gere 3 variações de mensagem LinkedIn para o nicho ${an.label}. Tom profissional e próximo, foco nas dores: ${an.dores.join(", ")}.`)} style={{ ...S.btn(false), fontSize:"9px", padding:"3px 7px" }}>🤖 IA</button>
                    <button onClick={copyMsg} style={{ ...S.btn(copied,"#34d399"), fontSize:"9px", padding:"3px 7px" }}>{copied?"✓ Copiado":"📋 Copiar"}</button>
                  </div>
                </div>
                <textarea value={editMsg} onChange={e => setEditMsg(e.target.value)} style={{ ...S.inp, minHeight:"160px", lineHeight:1.6, fontSize:"11px" }}/>
                <div style={{ marginTop:"5px", fontSize:"10px", color:"#7a8aaa" }}>💡 Substitua [NOME], [CIDADE] antes de enviar</div>
              </div>
            </div>
            <div style={{ background:"#111827", border:"1px solid #1c2a40", borderRadius:"10px", padding:"12px" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"8px" }}>
                <div style={S.lbl}>Leads — {an.label} ({nLeads.length})</div>
              </div>
              <div style={{ display:"flex", flexDirection:"column", gap:"6px", maxHeight:"500px", overflowY:"auto" }}>
                {nLeads.map(l => {
                  const lis = LI_STATUS.find(x => x.id === l.linkedinStatus), r = sRegiao(l.regiao);
                  return (
                    <div key={l.id} onClick={() => setSelected(l)} style={{ ...S.card(selected?.id === l.id), padding:"9px" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", marginBottom:"3px" }}>
                        <div style={{ fontWeight:600, fontSize:"12px" }}>{l.nome}</div>
                        <span style={{ fontSize:"12px", fontWeight:700, color:"#c8a96e" }}>{l.patrimonio}</span>
                      </div>
                      <div style={{ fontSize:"10px", color:"#7a8aaa", marginBottom:"4px" }}>{l.profissao} · {l.cidade} · {r?.label}</div>
                      <div style={{ display:"flex", gap:"3px", flexWrap:"wrap", marginBottom:"4px" }}>
                        {lis && <span style={S.pill(lis.color)}>{lis.label}</span>}
                      </div>
                      <div style={{ display:"flex", gap:"3px", flexWrap:"wrap" }}>
                        {LI_STATUS.map(ls => (
                          <button key={ls.id} onClick={e => { e.stopPropagation(); setLiStatus(l.id, ls.id); }} style={{ ...S.btn(l.linkedinStatus===ls.id, ls.color), fontSize:"9px", padding:"2px 6px" }}>{ls.label}</button>
                        ))}
                      </div>
                    </div>
                  );
                })}
                {nLeads.length === 0 && <div style={{ textAlign:"center", color:"#3a4a60", fontSize:"11px", padding:"20px 0", border:"1px dashed #1c2a40", borderRadius:"7px" }}>Nenhum lead neste nicho</div>}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const pipeVal = leads.reduce((s, l) => s + (l.patrimonioNum || 0), 0);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600&family=Cormorant+Garamond:wght@600;700&display=swap');*{box-sizing:border-box;margin:0;padding:0}::-webkit-scrollbar{width:3px;height:3px}::-webkit-scrollbar-thumb{background:#2a3a55;border-radius:2px}::-webkit-scrollbar-track{background:transparent}textarea{resize:vertical}button:active{opacity:.8}select option{background:#111827;color:#e8eeff}@keyframes dot{0%,100%{opacity:.3;transform:scale(.8)}50%{opacity:1;transform:scale(1.1)}}`}</style>
      <div style={S.app}>

        {/* Sidebar */}
        <div style={S.sb}>
          <div style={{ padding:"14px 13px 12px", borderBottom:"1px solid #1c2a40" }}>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"16px", fontWeight:700, color:"#c8a96e" }}>Private CRM</div>
            <div style={{ fontSize:"10px", color:"#7a8aaa", marginTop:"1px" }}>Altum Wealth</div>
            <div style={{ display:"flex", alignItems:"center", gap:"5px", marginTop:"6px" }}>
              <div style={{ width:"6px", height:"6px", borderRadius:"50%", background:"#34d399", boxShadow:"0 0 4px #34d399" }}/>
              <span style={{ fontSize:"9px", color:"#34d399" }}>Sofia online 24/7</span>
            </div>
          </div>
          <div style={{ flex:1, paddingTop:"8px" }}>
            <NavItem id="pipeline" icon={Target} label="Pipeline"/>
            <NavItem id="leads" icon={Users} label="Todos os Leads"/>
            <NavItem id="linkedin" icon={Linkedin} label="LinkedIn / Nichos"/>
            <NavItem id="agenda" icon={Calendar} label="Agenda"/>
          </div>
          <div style={{ padding:"12px 13px", borderTop:"1px solid #1c2a40" }}>
            <div style={{ fontSize:"10px", color:"#7a8aaa", marginBottom:"4px", textTransform:"uppercase", letterSpacing:"0.5px" }}>Pipeline total</div>
            <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"17px", color:"#c8a96e", fontWeight:700 }}>R$ {(pipeVal / 1000000).toFixed(1)}M</div>
            <div style={{ fontSize:"10px", color:"#7a8aaa", marginTop:"2px" }}>{leads.length} leads · {leads.filter(l => l.estagio === "conversao").length} convertidos</div>
          </div>
        </div>

        {/* Main */}
        <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
          <MeetingBar/>
          <div style={S.tb}>
            <div style={{ display:"flex", gap:"12px" }}>
              {STAGES.map(s => (
                <div key={s.id} style={{ textAlign:"center" }}>
                  <div style={{ fontSize:"14px", fontWeight:700, color:s.color }}>{leads.filter(l => l.estagio === s.id).length}</div>
                  <div style={{ fontSize:"9px", color:"#7a8aaa", textTransform:"uppercase" }}>{s.label.slice(0,5)}</div>
                </div>
              ))}
            </div>
            <div style={{ display:"flex", gap:"5px" }}>
              {view !== "linkedin" && <button onClick={() => setFilters(p => ({ ...p, open:!p.open }))} style={{ ...S.btn(activeCount>0||filters.open,"#5b8df5"), display:"flex", alignItems:"center", gap:"4px", fontSize:"11px" }}><Filter size={11}/> Filtros{activeCount>0?` (${activeCount})`:""}</button>}
              <button onClick={fetchLeads} style={{ ...S.btn(false,"#5b8df5"), display:"flex", alignItems:"center", gap:"4px", fontSize:"11px" }}><RefreshCw size={11}/></button>
              <button onClick={() => setShowAdd(true)} style={{ ...S.btn(true,"#c8a96e"), display:"flex", alignItems:"center", gap:"4px", fontSize:"11px" }}><Plus size={11}/> Novo Lead</button>
              <button onClick={() => setAgentOpen(p => !p)} style={{ ...S.btn(agentOpen,"#5b8df5"), display:"flex", alignItems:"center", gap:"4px", fontSize:"11px" }}><Bot size={11}/> Agente</button>
            </div>
          </div>

          <div style={{ flex:1, display:"flex", overflow:"hidden" }}>
            <div style={{ flex:1, overflowY:"auto", padding:"12px" }}>
              {(view === "pipeline" || view === "leads") && filters.open && <FilterPanel/>}

              {view === "pipeline" && (
                <div style={{ display:"flex", gap:"10px", overflowX:"auto", paddingBottom:"8px" }}>
                  {STAGES.map(s => {
                    const sl = filtered.filter(l => l.estagio === s.id);
                    return (
                      <div key={s.id} style={{ minWidth:"205px", flex:"0 0 205px" }}>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:"8px", padding:"6px 9px", background:s.color+"12", borderRadius:"7px", border:`1px solid ${s.color}22` }}>
                          <span style={{ fontSize:"10px", fontWeight:600, color:s.color, textTransform:"uppercase", letterSpacing:"0.8px" }}>{s.label}</span>
                          <span style={{ background:s.color+"22", color:s.color, borderRadius:"10px", padding:"1px 7px", fontSize:"11px", fontWeight:700 }}>{sl.length}</span>
                        </div>
                        <div style={{ display:"flex", flexDirection:"column", gap:"6px" }}>
                          {sl.map(l => <LeadCard key={l.id} lead={l}/>)}
                          {sl.length === 0 && <div style={{ textAlign:"center", color:"#3a4a60", fontSize:"10px", padding:"16px 0", border:"1px dashed #1c2a40", borderRadius:"7px" }}>Nenhum</div>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {view === "leads" && (
                <div>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"18px", color:"#c8a96e", marginBottom:"11px" }}>Todos os Leads ({filtered.length})</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:"5px" }}>
                    {filtered.map(l => {
                      const s = sStage(l.estagio), n = sNicho(l.nicho), r = sRegiao(l.regiao);
                      const convs = l.mensagens || l.conversations || [];
                      return (
                        <div key={l.id} onClick={() => setSelected(l)} style={{ ...S.card(selected?.id === l.id), display:"flex", alignItems:"center", gap:"10px" }}>
                          <div style={{ flex:1 }}><div style={{ fontWeight:600, fontSize:"12px" }}>{l.nome}</div><div style={{ fontSize:"10px", color:"#7a8aaa" }}>{l.profissao} · {l.cidade}</div></div>
                          <span style={{ fontSize:"12px", fontWeight:700, color:"#c8a96e", minWidth:"65px" }}>{l.patrimonio}</span>
                          {n && <span style={S.pill(n.color)}>{n.icon} {n.label.split(" ")[0]}</span>}
                          {r && <span style={S.pill(r.color)}>{r.label}</span>}
                          <span style={{ background:s.color+"18", color:s.color, padding:"2px 8px", borderRadius:"4px", fontSize:"9px", minWidth:"70px", textAlign:"center", fontWeight:600 }}>{s.label}</span>
                          {convs.length > 0 && <span style={{ fontSize:"9px", color:"#25d366", background:"#25d36620", padding:"2px 6px", borderRadius:"8px" }}>💬 {convs.length}</span>}
                        </div>
                      );
                    })}
                    {leads.length === 0 && <div style={{ textAlign:"center", color:"#3a4a60", padding:"40px 0" }}>Nenhum lead. Adicione o primeiro lead para Sofia começar a prospectar.</div>}
                  </div>
                </div>
              )}

              {view === "linkedin" && renderLinkedin()}

              {view === "agenda" && (
                <div>
                  <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"18px", color:"#c8a96e", marginBottom:"11px" }}>Reuniões Agendadas pela Sofia</div>
                  {meetings.reunioes.length > 0 && (
                    <div style={{ marginBottom:"14px" }}>
                      <div style={S.lbl}>Hoje ({meetings.count}/{meetings.max})</div>
                      {meetings.reunioes.map(r => (
                        <div key={r.id} style={{ background:"#34d39910", border:"1px solid #34d39930", borderRadius:"9px", padding:"10px 12px", marginBottom:"5px" }}>
                          <div style={{ fontWeight:600, fontSize:"12px" }}>{r.lead?.nome}</div>
                          <div style={{ fontSize:"11px", color:"#7a8aaa" }}>{new Date(r.data).toLocaleString("pt-BR",{dateStyle:"full",timeStyle:"short"})}</div>
                          <div style={{ fontSize:"10px", color:"#34d399", marginTop:"3px" }}>📅 {r.status} · via {r.canal}</div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div style={S.lbl}>Todos os leads com agenda</div>
                  {leads.filter(l => (l.reunioes || []).length > 0).map(l => (
                    <div key={l.id} onClick={() => setSelected(l)} style={{ ...S.card(selected?.id === l.id), display:"flex", gap:"9px", alignItems:"center", marginBottom:"5px" }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontWeight:600, fontSize:"12px" }}>{l.nome}</div>
                        <div style={{ fontSize:"10px", color:"#7a8aaa" }}>{l.profissao}</div>
                      </div>
                      <div>
                        {l.reunioes.map(r => (
                          <div key={r.id} style={{ fontSize:"10px", color:"#34d399" }}>{new Date(r.data).toLocaleDateString("pt-BR")} às {new Date(r.data).toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</div>
                        ))}
                      </div>
                    </div>
                  ))}
                  {leads.filter(l => (l.reunioes || []).length > 0).length === 0 && (
                    <div style={{ textAlign:"center", color:"#3a4a60", padding:"30px 0", border:"1px dashed #1c2a40", borderRadius:"9px" }}>Sofia ainda não agendou nenhuma reunião. Adicione leads para ela começar!</div>
                  )}
                </div>
              )}
            </div>
            {renderDetail()}
          </div>
        </div>

        {/* AI Agent panel */}
        {agentOpen && (
          <div style={{ width:"305px", borderLeft:"1px solid #1c2a40", display:"flex", flexDirection:"column", background:"#0c1120", flexShrink:0 }}>
            <div style={{ padding:"11px 12px", borderBottom:"1px solid #1c2a40", display:"flex", alignItems:"center", gap:"7px" }}>
              <div style={{ width:"7px", height:"7px", borderRadius:"50%", background:"#34d399", boxShadow:"0 0 6px #34d399" }}/>
              <span style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"13px", fontWeight:600 }}>Agente de Prospecção</span>
              {selected && <span style={{ background:"#1a2234", color:"#c8a96e", fontSize:"10px", padding:"2px 6px", borderRadius:"10px", marginLeft:"auto" }}>📌 {selected.nome?.split(" ").slice(-1)[0]}</span>}
            </div>
            <div style={{ padding:"7px 10px", borderBottom:"1px solid #1c2a40", display:"flex", flexWrap:"wrap", gap:"4px" }}>
              {[["📊 Pipeline",`Pipeline atual: ${STAGES.map(s=>`${s.label}: ${leads.filter(l=>l.estagio===s.id).length}`).join(", ")}. Insights estratégicos.`],["🔥 Prioridades","Quais leads priorizar hoje para fechar mais rápido?"],["💬 Script WA","Gere um script de follow-up para leads que não responderam o WhatsApp."],["🏦 Migrar XP",`Tenho ${leads.filter(l=>{try{return JSON.parse(l.instituicoes||"[]").includes("xp")}catch{return false}}).length} leads na XP. Estratégia para migrar para fee-based?`]].map(([lb, pr]) => (
                <button key={lb} onClick={() => sendMsg(pr)} style={{ ...S.btn(false), fontSize:"9px", padding:"3px 6px" }}>{lb}</button>
              ))}
            </div>
            <div style={{ flex:1, overflowY:"auto", padding:"9px", display:"flex", flexDirection:"column", gap:"7px" }}>
              {msgs.map((m, i) => (
                <div key={i} style={{ display:"flex", justifyContent:m.role==="user"?"flex-end":"flex-start" }}>
                  <div style={{ maxWidth:"88%", background:m.role==="user"?"#5b8df5":"#111827", color:m.role==="user"?"#fff":"#c0d0e8", border:m.role==="assistant"?"1px solid #1c2a40":"none", borderRadius:m.role==="user"?"10px 10px 0 10px":"10px 10px 10px 0", padding:"8px 10px", fontSize:"11px", lineHeight:1.6, whiteSpace:"pre-wrap" }}>{m.content}</div>
                </div>
              ))}
              {loading && <div style={{ display:"flex", gap:"4px", padding:"4px" }}>{[0,1,2].map(i => <div key={i} style={{ width:"5px", height:"5px", borderRadius:"50%", background:"#5b8df5", animation:`dot 1s ease-in-out ${i*.2}s infinite` }}/>)}</div>}
              <div ref={endRef}/>
            </div>
            <div style={{ padding:"8px 9px", borderTop:"1px solid #1c2a40", display:"flex", gap:"5px", alignItems:"flex-end" }}>
              <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMsg(input);} }} placeholder="Pergunte… (Enter)" style={{ ...S.inp, flex:1, minHeight:"34px", maxHeight:"80px" }} rows={1}/>
              <button onClick={() => sendMsg(input)} disabled={loading||!input.trim()} style={{ background:loading||!input.trim()?"#1c2a40":"#5b8df5", border:"none", color:"white", padding:"7px 10px", borderRadius:"6px", cursor:loading||!input.trim()?"default":"pointer", display:"flex", alignItems:"center" }}><Send size={13}/></button>
            </div>
          </div>
        )}
      </div>

      {/* Add Lead Modal */}
      {showAdd && (
        <div style={{ position:"fixed", inset:0, background:"#00000088", display:"flex", alignItems:"center", justifyContent:"center", zIndex:200 }}>
          <div style={{ background:"#111827", border:"1px solid #2a3a55", borderRadius:"13px", padding:"20px", width:"420px", maxHeight:"90vh", overflowY:"auto" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:"15px" }}>
              <div>
                <div style={{ fontFamily:"'Cormorant Garamond',serif", fontSize:"18px", color:"#c8a96e", fontWeight:700 }}>Novo Lead</div>
                <div style={{ fontSize:"10px", color:"#34d399", marginTop:"2px" }}>Sofia enviará mensagem de abertura automaticamente via WhatsApp</div>
              </div>
              <button onClick={() => setShowAdd(false)} style={{ background:"transparent", border:"none", color:"#7a8aaa", cursor:"pointer" }}><X size={15}/></button>
            </div>
            {[["nome","Nome completo *"],["whatsapp","WhatsApp (com DDI: 5511999999999) *"],["patrimonio","Patrimônio estimado"],["profissao","Profissão"],["cidade","Cidade"],["estado","Estado (sigla)"]].map(([k, l]) => (
              <div key={k} style={{ marginBottom:"8px" }}>
                <label style={S.lbl}>{l}</label>
                <input value={form[k]||""} onChange={e => setForm(p => ({...p,[k]:e.target.value}))} style={{ ...S.inp, borderColor:(!form[k]&&(k==="nome"||k==="whatsapp"))?"#f8717140":"" }}/>
              </div>
            ))}
            <div style={{ marginBottom:"8px" }}>
              <label style={S.lbl}>Nicho</label>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"4px" }}>
                {NICHOS.map(n => <button key={n.id} onClick={() => setForm(p => ({...p,nicho:n.id}))} style={{ ...S.btn(form.nicho===n.id,n.color), fontSize:"10px", padding:"3px 7px" }}>{n.icon} {n.label}</button>)}
              </div>
            </div>
            <div style={{ marginBottom:"8px" }}>
              <label style={S.lbl}>Região</label>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"4px" }}>
                {REGIOES.map(r => <button key={r.id} onClick={() => setForm(p => ({...p,regiao:r.id}))} style={{ ...S.btn(form.regiao===r.id,r.color), fontSize:"10px" }}>{r.label}</button>)}
              </div>
            </div>
            <div style={{ marginBottom:"8px" }}>
              <label style={S.lbl}>Perfil de Risco</label>
              <div style={{ display:"flex", gap:"5px" }}>
                {["Conservador","Moderado","Arrojado"].map(p => <button key={p} onClick={() => setForm(prev => ({...prev,perfil:p}))} style={{ flex:1,...S.btn(form.perfil===p,"#c8a96e"),fontSize:"10px" }}>{PERFIL_ICON[p]} {p}</button>)}
              </div>
            </div>
            <div style={{ marginBottom:"13px" }}>
              <label style={S.lbl}>Investe em</label>
              <div style={{ display:"flex", flexWrap:"wrap", gap:"4px" }}>
                {INSTITUICOES.map(i => <button key={i.id} onClick={() => setForm(p => ({...p,instituicoes:p.instituicoes.includes(i.id)?p.instituicoes.filter(x=>x!==i.id):[...p.instituicoes,i.id]}))} style={{ ...S.btn(form.instituicoes.includes(i.id),i.color),fontSize:"10px" }}>{i.label}</button>)}
              </div>
            </div>
            <div style={{ display:"flex", gap:"6px" }}>
              <button onClick={addLead} disabled={saving||!form.nome||!form.whatsapp} style={{ flex:1, background:saving||!form.nome||!form.whatsapp?"#1c2a40":"#c8a96e", border:"none", color:saving||!form.nome||!form.whatsapp?"#7a8aaa":"#0a0e1a", padding:"10px", borderRadius:"8px", fontWeight:600, fontSize:"12px", cursor:saving?"wait":"pointer", fontFamily:"'Sora','Inter',sans-serif" }}>
                {saving ? "Adicionando…" : "✅ Adicionar e Disparar WhatsApp"}
              </button>
              <button onClick={() => setShowAdd(false)} style={{ background:"transparent", border:"1px solid #2a3a55", color:"#7a8aaa", padding:"10px 12px", borderRadius:"8px", fontSize:"12px", cursor:"pointer", fontFamily:"'Sora','Inter',sans-serif" }}>Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
