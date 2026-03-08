import { useState, useEffect, useCallback, useRef } from "react";

const TYPES = [
  { key: "bar", label: "실버바", emoji: "🪙" },
  { key: "3n", label: "그래뉼3N", emoji: "⚪" },
  { key: "4n", label: "그래뉼4N", emoji: "✨" },
];
const QKG = [1, 2, 3, 5, 10];
const O = "#FF6F0F", OL = "#FFF5EF";
const G = "#22C55E", GL = "#F0FDF4", R = "#EF4444", RL = "#FEF2F2";
const B = "#3B82F6", BL = "#EFF6FF", BG_ = "#F8F8FA", W = "#FFF";
const T1 = "#0F172A", T2 = "#475569", T3 = "#94A3B8", BD = "#E2E8F0";

const fmt = n => n == null || isNaN(n) ? "0" : n === 0 ? "0" : Number.isInteger(n) ? n.toLocaleString() : n.toFixed(1);
const td = () => new Date().toISOString().slice(0, 10);
const mkSet = (id, name) => ({ id, name, unit: 10, partners: [{ name: "투자자1", share: 40, invested: 0 }, { name: "투자자2", share: 35, invested: 0 }, { name: "투자자3", share: 25, invested: 0 }], viewers: [], sales: [], settlements: [] });

const card = { background: W, borderRadius: 20, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", overflow: "hidden", marginBottom: 14 };
const inp = (c = T1) => ({ width: "100%", padding: "13px 14px", background: "#F8FAFC", border: `1.5px solid ${BD}`, borderRadius: 14, color: c, fontSize: 16, fontWeight: 600, outline: "none", boxSizing: "border-box", WebkitAppearance: "none" });
const btn = (bg = O, c = W) => ({ width: "100%", padding: "16px", borderRadius: 16, border: "none", background: bg, color: c, fontSize: 16, fontWeight: 800, cursor: "pointer", textAlign: "center" });
const lb = { fontSize: 12, color: T3, marginBottom: 4, fontWeight: 700, letterSpacing: 0.3 };

const SKEY = "seo-data-v6", PKEY = "seo-pw", HKEY = "seo-hist";
async function loadData() { try { const r = await window.storage.get(SKEY, true); return r?.value ? JSON.parse(r.value) : null; } catch { return null; } }
async function saveData(sets, prev) { try { if (prev) { let h = []; try { const x = await window.storage.get(HKEY, true); if (x?.value) h = JSON.parse(x.value); } catch {} h.push(JSON.stringify({ sets: prev, ts: Date.now() })); if (h.length > 20) h = h.slice(-20); await window.storage.set(HKEY, JSON.stringify(h), true); } await window.storage.set(SKEY, JSON.stringify({ sets }), true); } catch {} }

function autoSettle(s) {
  const totalKg = s.sales.reduce((a, x) => a + (x.kg || 0), 0);
  const needed = Math.floor(totalKg / s.unit);
  if (needed > s.settlements.length) {
    const ns = [...s.settlements]; let cumKg = 0, rs = {};
    for (const sale of s.sales) { cumKg += sale.kg || 0; const r = Math.min(Math.floor((cumKg - 0.001) / s.unit), needed - 1); if (!rs[r]) rs[r] = { sell: 0, cost: 0 }; rs[r].sell += sale.sell || 0; rs[r].cost += sale.cost || 0; }
    for (let i = s.settlements.length; i < needed; i++) { const r = rs[i] || { sell: 0, cost: 0 }; ns.push({ id: Date.now() + i, sellAmt: r.sell, costAmt: r.cost, auto: true }); }
    return { ...s, settlements: ns };
  }
  return s;
}

/*
  ✅ 정산 로직 (확정)
  
  매출 5000, 원가 4600 → 순이익 400
  A 투자금 4000 (지분 50%), B 투자금 600 (지분 50%)
  
  이익배분: 400 × 50% = 200 (각자)
  A 정산: 4000(투자금) + 200(이익) = 4200
  B 정산:  600(투자금) + 200(이익) =  800
  
  즉: 각자 정산 = 투자금 반환 + (순이익 × 지분%)
  순이익에서 투자금을 빼지 않음!
*/
function calcSettle(partners, sellAmt, costAmt) {
  const profit = sellAmt - costAmt; // 순이익
  return partners.map(p => {
    const profitShare = profit * ((p.share || 0) / 100); // 이익 중 내 몫
    return {
      ...p,
      investedReturn: p.invested || 0,        // 투자금 반환
      profitShare,                             // 이익 배분
      total: (p.invested || 0) + profitShare,  // 총 정산
    };
  });
}

// ========= LOGIN =========
function Login({ onLogin }) {
  const [mode, setMode] = useState(null);
  const [pw, setPw] = useState("");
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");
  useEffect(() => { (async () => { try { const r = await window.storage.get(PKEY, true); if (!r?.value) await window.storage.set(PKEY, "silver1234", true); } catch { try { await window.storage.set(PKEY, "silver1234", true); } catch {} } })(); }, []);
  const aLogin = async () => { try { const r = await window.storage.get(PKEY, true); r?.value === pw ? onLogin({ role: "admin" }) : setErr("비밀번호가 틀립니다"); } catch { setErr("오류"); } };
  const vLogin = async () => { if (!code.trim()) { setErr("코드를 입력하세요"); return; } try { const d = await loadData(); if (d && (d.sets || []).some(s => (s.viewers || []).some(v => v.code === code.trim().toUpperCase()))) { onLogin({ role: "viewer", code: code.trim().toUpperCase() }); return; } setErr("등록되지 않은 코드"); } catch { setErr("오류"); } };

  return (
    <div style={{ minHeight: "100vh", background: "#FAFAFA", fontFamily: "-apple-system,'Pretendard',sans-serif", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px 20px" }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: mode === null ? 56 : 40 }}>
          <div style={{ fontSize: 15, fontWeight: 600, color: T3, letterSpacing: 6, textTransform: "uppercase", marginBottom: 10 }}>Silver Distribution</div>
          <div style={{ fontSize: 38, fontWeight: 900, color: T1, letterSpacing: -2 }}>made Seo</div>
          <div style={{ width: 40, height: 3, background: O, borderRadius: 2, margin: "14px auto 0" }} />
        </div>
        {mode === null ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[["admin", "관리자", "판매 · 정산 · 계정 관리"], ["viewer", "투자자", "거래 기록 · 현황 확인"]].map(([m, t, d]) => (
              <button key={m} onClick={() => setMode(m)} style={{ width: "100%", padding: "22px 24px", borderRadius: 18, border: `1.5px solid ${BD}`, background: W, cursor: "pointer", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div><div style={{ fontSize: 18, fontWeight: 800, color: T1, marginBottom: 3 }}>{t}</div><div style={{ fontSize: 13, color: T3 }}>{d}</div></div>
                <span style={{ fontSize: 22, color: T3 }}>→</span>
              </button>
            ))}
            <div style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "#CBD5E1" }}>유통 관리 시스템 v1.0</div>
          </div>
        ) : (
          <div>
            <button onClick={() => { setMode(null); setErr(""); }} style={{ background: "none", border: "none", color: T3, cursor: "pointer", fontSize: 14, fontWeight: 600, padding: "0 0 16px" }}>← 뒤로</button>
            <div style={{ fontSize: 22, fontWeight: 900, color: T1, marginBottom: 6 }}>{mode === "admin" ? "관리자 로그인" : "투자자 접속"}</div>
            <div style={{ fontSize: 14, color: T3, marginBottom: 28 }}>{mode === "admin" ? "비밀번호를 입력하세요" : "접속 코드를 입력하세요"}</div>
            <input type={mode === "admin" ? "password" : "text"} value={mode === "admin" ? pw : code}
              onChange={e => mode === "admin" ? setPw(e.target.value) : setCode(e.target.value.toUpperCase())}
              placeholder={mode === "admin" ? "비밀번호" : "접속 코드"}
              onKeyDown={e => e.key === "Enter" && (mode === "admin" ? aLogin() : vLogin())}
              style={{ width: "100%", padding: "18px 20px", background: W, border: `1.5px solid ${BD}`, borderRadius: 16, color: T1, fontSize: mode === "admin" ? 20 : 22, fontWeight: mode === "admin" ? 600 : 700, outline: "none", boxSizing: "border-box", marginBottom: 16, ...(mode === "viewer" ? { letterSpacing: 4, fontFamily: "monospace", textAlign: "center" } : {}) }} />
            <button onClick={mode === "admin" ? aLogin : vLogin} style={{ width: "100%", padding: "18px", borderRadius: 16, border: "none", background: T1, color: W, fontSize: 17, fontWeight: 800, cursor: "pointer" }}>{mode === "admin" ? "로그인" : "접속"}</button>
            {err && <div style={{ color: R, fontSize: 15, textAlign: "center", marginTop: 16, fontWeight: 700 }}>{err}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ===== SALES TAB =====
function SalesTab({ s, canEdit, onUpdate, partnerNames }) {
  const [qKg, setQKg] = useState(1), [qType, setQType] = useState("bar");
  const totalKg = s.sales.reduce((a, x) => a + (x.kg || 0), 0);
  const totalSell = s.sales.reduce((a, x) => a + (x.sell || 0), 0);
  const totalCost = s.sales.reduce((a, x) => a + (x.cost || 0), 0);
  const profit = totalSell - totalCost;
  const rounds = Math.floor(totalKg / s.unit), progress = totalKg % s.unit;
  let cum = 0;
  const sd = s.sales.map(x => { cum += x.kg || 0; return { ...x, cum, rd: cum > 0 ? Math.ceil(cum / s.unit) : 0, pg: cum > 0 ? (cum % s.unit === 0 ? s.unit : cum % s.unit) : 0 }; });
  const addSale = (kg) => { const ns = [...s.sales, { id: Date.now(), type: qType, kg, cost: 0, sell: 0, date: td(), trader: "", location: "" }]; const u = autoSettle({ ...s, sales: ns }); onUpdate({ sales: u.sales, settlements: u.settlements }); };
  const uf = (id, f, v) => { const ns = s.sales.map(x => x.id === id ? { ...x, [f]: v } : x); const u = autoSettle({ ...s, sales: ns }); onUpdate({ sales: u.sales, settlements: u.settlements }); };
  const locs = [...new Set(s.sales.map(x => x.location).filter(Boolean))];

  return <>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
      <div style={{ ...card, marginBottom: 0, padding: "16px 18px", background: `linear-gradient(135deg, ${OL}, #FFF)` }}>
        <div style={{ fontSize: 12, color: T3, fontWeight: 700, marginBottom: 6 }}>총 판매량</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: O }}>{totalKg}<span style={{ fontSize: 15 }}>kg</span></div>
        <div style={{ fontSize: 13, color: T3, marginTop: 4 }}>매출 <b style={{ color: B }}>{fmt(totalSell)}만</b></div>
      </div>
      <div style={{ ...card, marginBottom: 0, padding: "16px 18px", background: profit >= 0 ? `linear-gradient(135deg, ${GL}, #FFF)` : `linear-gradient(135deg, ${RL}, #FFF)` }}>
        <div style={{ fontSize: 12, color: T3, fontWeight: 700, marginBottom: 6 }}>순이익</div>
        <div style={{ fontSize: 28, fontWeight: 900, color: profit >= 0 ? G : R }}>{fmt(profit)}<span style={{ fontSize: 15 }}>만</span></div>
        <div style={{ fontSize: 13, color: T3, marginTop: 4 }}>원가 <b style={{ color: R }}>{fmt(totalCost)}만</b></div>
      </div>
    </div>
    <div style={{ ...card, padding: "18px 20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
        <div><span style={{ fontSize: 18, fontWeight: 900, color: T1 }}>{rounds + 1}회차</span><span style={{ fontSize: 13, color: T3, marginLeft: 8 }}>정산완료 <b style={{ color: G }}>{rounds}회</b></span></div>
        <span style={{ fontSize: 20, fontWeight: 900, color: O }}>{progress}<span style={{ color: T3, fontWeight: 500 }}>/{s.unit}kg</span></span>
      </div>
      <div style={{ height: 12, background: "#F1F5F9", borderRadius: 6, overflow: "hidden" }}><div style={{ width: `${s.unit > 0 ? (progress / s.unit) * 100 : 0}%`, height: "100%", background: `linear-gradient(90deg, ${O}, #FBBF24)`, borderRadius: 6, transition: "width 0.3s" }} /></div>
    </div>
    {canEdit && <div style={{ ...card, padding: 20 }}>
      <div style={{ fontSize: 18, fontWeight: 900, color: T1, marginBottom: 16 }}>판매 추가</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>{TYPES.map(t => <button key={t.key} onClick={() => setQType(t.key)} style={{ flex: 1, padding: "12px 6px", borderRadius: 14, border: qType === t.key ? `2.5px solid ${O}` : `1.5px solid ${BD}`, background: qType === t.key ? OL : W, color: qType === t.key ? O : T3, fontSize: 14, fontWeight: 700, cursor: "pointer" }}>{t.emoji} {t.label}</button>)}</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>{QKG.map(k => <button key={k} onClick={() => setQKg(k)} style={{ flex: 1, padding: "14px 0", borderRadius: 14, border: "none", background: qKg === k ? O : "#F1F5F9", color: qKg === k ? W : T2, fontSize: 18, fontWeight: 900, cursor: "pointer" }}>{k}</button>)}</div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 16 }}><span style={{ fontSize: 14, color: T3, fontWeight: 600 }}>직접입력</span><input type="number" inputMode="decimal" value={qKg} onChange={e => setQKg(parseFloat(e.target.value) || 0)} style={{ ...inp(O), width: 90, textAlign: "center", padding: "12px 8px" }} /><span style={{ fontSize: 16, fontWeight: 700, color: T2 }}>kg</span></div>
      <button onClick={() => addSale(qKg)} style={{ ...btn(), fontSize: 17, padding: "17px" }}>{TYPES.find(t => t.key === qType)?.emoji} {qKg}kg 추가</button>
    </div>}
    {totalKg > 0 && <div style={{ display: "flex", gap: 8, marginBottom: 14, overflowX: "auto" }}>{TYPES.map(t => { const items = s.sales.filter(x => x.type === t.key); if (!items.length) return null; const kg = items.reduce((a, x) => a + (x.kg || 0), 0); const p = items.reduce((a, x) => a + (x.sell || 0) - (x.cost || 0), 0); return <div key={t.key} style={{ flexShrink: 0, ...card, marginBottom: 0, padding: "10px 14px", fontSize: 13, fontWeight: 600, display: "flex", gap: 8, alignItems: "center" }}>{t.emoji} {t.label} <span style={{ color: T3 }}>{kg}kg</span> <span style={{ color: p >= 0 ? G : R }}>{fmt(p)}만</span></div>; })}</div>}
    <div style={card}>
      <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BD}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 18, fontWeight: 900, color: T1 }}>거래 내역 <span style={{ color: T3, fontWeight: 500, fontSize: 15 }}>{s.sales.length}</span></span>
        {canEdit && s.sales.length > 0 && <button onClick={() => { if (window.confirm("전체 초기화?")) onUpdate({ sales: [], settlements: [] }); }} style={{ padding: "8px 16px", borderRadius: 12, border: `1.5px solid ${BD}`, background: W, color: R, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>초기화</button>}
      </div>
      {s.sales.length === 0 ? <div style={{ padding: 50, textAlign: "center", color: T3, fontSize: 16 }}>아직 거래 기록이 없습니다</div> : <div>
        {sd.map((x, i) => { const done = x.cum > 0 && x.cum % s.unit === 0; const tI = TYPES.find(t => t.key === x.type) || TYPES[0]; const pr = (x.sell || 0) - (x.cost || 0); return (
          <div key={x.id} style={{ padding: "16px 18px", borderBottom: done ? `3px solid ${G}` : `1px solid #F1F5F9`, background: done ? GL : W }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ width: 28, height: 28, borderRadius: 14, background: done ? G : "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900, color: done ? W : T3 }}>{i + 1}</span>
                {canEdit ? <div style={{ display: "flex", gap: 3 }}>{TYPES.map(t => <button key={t.key} onClick={() => uf(x.id, "type", t.key)} style={{ padding: "4px 10px", borderRadius: 10, border: x.type === t.key ? `2px solid ${O}` : `1px solid ${BD}`, background: x.type === t.key ? OL : "#FAFAFA", cursor: "pointer", color: x.type === t.key ? O : T3, fontSize: 12, fontWeight: 700 }}>{t.emoji}</button>)}</div> : <span style={{ fontSize: 15, fontWeight: 700 }}>{tI.emoji} {tI.label}</span>}
                <span style={{ fontWeight: 900, fontSize: 18, color: T1 }}>{x.kg}kg</span>
                {done && <span style={{ background: G, color: W, fontSize: 11, padding: "3px 10px", borderRadius: 8, fontWeight: 800 }}>정산✓</span>}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ background: pr >= 0 ? GL : RL, color: pr >= 0 ? G : R, fontWeight: 800, fontSize: 14, padding: "5px 12px", borderRadius: 10 }}>{pr >= 0 ? "+" : ""}{fmt(pr)}만</span>
                {canEdit && <button onClick={() => { const u = autoSettle({ ...s, sales: s.sales.filter(y => y.id !== x.id), settlements: [] }); onUpdate({ sales: u.sales, settlements: u.settlements }); }} style={{ background: "none", border: "none", color: "#CBD5E1", cursor: "pointer", fontSize: 20 }}>✕</button>}
              </div>
            </div>
            {canEdit ? <>
              <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
                <div style={{ flex: 1 }}><div style={lb}>판매량(kg)</div><input type="number" inputMode="decimal" value={x.kg || ""} placeholder="0" onChange={e => uf(x.id, "kg", parseFloat(e.target.value) || 0)} style={{ ...inp(O), padding: "10px" }} /></div>
                <div style={{ flex: 1 }}><div style={lb}>원가(만원)</div><input type="number" inputMode="decimal" step="0.1" value={x.cost || ""} placeholder="0" onChange={e => uf(x.id, "cost", parseFloat(e.target.value) || 0)} style={{ ...inp(R), padding: "10px" }} /></div>
                <div style={{ flex: 1 }}><div style={lb}>판매가(만원)</div><input type="number" inputMode="decimal" step="0.1" value={x.sell || ""} placeholder="0" onChange={e => uf(x.id, "sell", parseFloat(e.target.value) || 0)} style={{ ...inp(G), padding: "10px" }} /></div>
              </div>
              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                <div style={{ flex: 1 }}><div style={lb}>거래자</div><select value={x.trader || ""} onChange={e => uf(x.id, "trader", e.target.value)} style={{ ...inp(T1), padding: "10px", fontSize: 14, color: x.trader ? T1 : T3 }}><option value="">선택</option>{partnerNames.map((n, j) => <option key={j} value={n}>{n}</option>)}</select></div>
                <div style={{ flex: 1 }}><div style={lb}>장소</div><input value={x.location || ""} onChange={e => uf(x.id, "location", e.target.value)} placeholder="위치" list={`lo${x.id}`} style={{ ...inp(T1), padding: "10px", fontSize: 14 }} />{locs.length > 0 && <datalist id={`lo${x.id}`}>{locs.map((n, j) => <option key={j} value={n} />)}</datalist>}</div>
                <div style={{ flex: 0.7 }}><div style={lb}>날짜</div><input type="date" value={x.date || ""} onChange={e => uf(x.id, "date", e.target.value)} style={{ ...inp(T1), padding: "10px 6px", fontSize: 13 }} /></div>
              </div>
            </> : <div style={{ display: "flex", gap: 14, fontSize: 14, color: T2, paddingLeft: 38, marginBottom: 6 }}><span style={{ color: R }}>원가 {fmt(x.cost || 0)}</span><span style={{ color: G }}>판매 {fmt(x.sell || 0)}</span>{x.trader && <span>👤 {x.trader}</span>}{x.location && <span>📍 {x.location}</span>}</div>}
            <div style={{ display: "flex", gap: 10, fontSize: 13, color: T3, paddingLeft: 38 }}><span>누적 <b style={{ color: T2 }}>{x.cum}kg</b></span><span>{x.rd}회차</span><span style={{ color: O, fontWeight: 700 }}>{x.pg}/{s.unit}</span></div>
          </div>
        ); })}
        <div style={{ padding: "14px 20px", background: "#F8FAFC", display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 800 }}><span style={{ color: T2 }}>합계</span><div style={{ display: "flex", gap: 14 }}><span style={{ color: O }}>{totalKg}kg</span><span style={{ color: R }}>{fmt(totalCost)}</span><span style={{ color: B }}>{fmt(totalSell)}</span><span style={{ color: profit >= 0 ? G : R }}>{fmt(profit)}</span></div></div>
      </div>}
    </div>
  </>;
}

// ===== VIEWER =====
function Viewer({ code, onLogout }) {
  const [sets, setSets] = useState([]), [idx, setIdx] = useState(0);
  const load = useCallback(async () => { const d = await loadData(); if (d) setSets((d.sets || []).filter(s => (s.viewers || []).some(v => v.code === code))); }, [code]);
  useEffect(() => { load(); const iv = setInterval(load, 3000); return () => clearInterval(iv); }, [load]);
  const onUpdate = async (ch) => { const d = await loadData(); if (!d) return; const cs = sets[idx]; const ns = (d.sets || []).map(s => s.id === cs.id ? { ...s, ...ch } : s); await saveData(ns, d.sets); setSets(ns.filter(s => (s.viewers || []).some(v => v.code === code))); };
  const s = sets[idx];
  if (!s) return <div style={{ minHeight: "100vh", background: BG_, display: "flex", alignItems: "center", justifyContent: "center" }}><div style={{ textAlign: "center", color: T3 }}><div style={{ marginBottom: 20 }}>로딩 중...</div><button onClick={onLogout} style={{ ...btn("#F1F5F9", T2), width: "auto", padding: "12px 28px" }}>로그아웃</button></div></div>;
  return (
    <div style={{ minHeight: "100vh", maxWidth: 480, margin: "0 auto", background: BG_, fontFamily: "-apple-system,'Pretendard',sans-serif" }}>
      <div style={{ padding: "14px 18px", background: W, borderBottom: `1px solid ${BD}`, display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 50 }}>
        <div><span style={{ fontSize: 18, fontWeight: 900, color: T1 }}>{(s.viewers || []).find(v => v.code === code)?.name || code}</span><span style={{ fontSize: 12, color: T3, marginLeft: 8 }}>투자자</span></div>
        <button onClick={onLogout} style={{ background: "#F1F5F9", border: "none", borderRadius: 12, padding: "8px 18px", color: T2, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>로그아웃</button>
      </div>
      {sets.length > 1 && <div style={{ display: "flex", gap: 8, padding: "12px 18px", overflowX: "auto", background: W, borderBottom: `1px solid ${BD}` }}>{sets.map((x, i) => <button key={x.id} onClick={() => setIdx(i)} style={{ padding: "8px 18px", borderRadius: 14, border: i === idx ? `2px solid ${O}` : `1.5px solid ${BD}`, background: i === idx ? OL : W, color: i === idx ? O : T3, fontSize: 14, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>{x.name}</button>)}</div>}
      <div style={{ padding: "16px 14px" }}><div style={{ textAlign: "center", marginBottom: 14, fontSize: 13, color: T3 }}>🟢 실시간 · {s.name}</div><SalesTab s={s} canEdit={true} onUpdate={onUpdate} partnerNames={s.partners.map(p => p.name).filter(Boolean)} /></div>
    </div>
  );
}

// ===== ADMIN =====
function Admin({ onLogout }) {
  const [sets, setSets] = useState([mkSet(1, "세트 1")]);
  const [aid, setAid] = useState(1);
  const [tab, setTab] = useState("sales");
  const [drawer, setDrawer] = useState(false);
  const [editName, setEditName] = useState(null), [tmp, setTmp] = useState("");
  const [showPw, setShowPw] = useState(false), [newPw, setNewPw] = useState(""), [pwMsg, setPwMsg] = useState("");
  const [vName, setVName] = useState(""), [vCode, setVCode] = useState("");
  const [undoMsg, setUndoMsg] = useState("");
  const timer = useRef(null), prev = useRef(null);

  useEffect(() => { (async () => { const d = await loadData(); if (d?.sets?.length) { setSets(d.sets); setAid(p => d.sets.find(s => s.id === p) ? p : d.sets[0].id); } })(); }, []);
  const up = (ns, na) => { prev.current = sets; setSets(ns); if (na) setAid(na); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => saveData(ns, prev.current), 300); };
  const undo = async () => { try { const h = await window.storage.get(HKEY, true); if (h?.value) { const hist = JSON.parse(h.value); if (hist.length) { const last = JSON.parse(hist.pop()); await window.storage.set(HKEY, JSON.stringify(hist), true); setSets(last.sets); await window.storage.set(SKEY, JSON.stringify({ sets: last.sets }), true); setUndoMsg("✅ 완료"); setTimeout(() => setUndoMsg(""), 2000); return; } } setUndoMsg("내역 없음"); setTimeout(() => setUndoMsg(""), 2000); } catch {} };

  const s = sets.find(x => x.id === aid) || sets[0];
  const us = (ch) => up(sets.map(x => x.id === aid ? { ...x, ...ch } : x));
  const shareSum = s.partners.reduce((a, p) => a + (p.share || 0), 0);
  const totalInvested = s.partners.reduce((a, p) => a + (p.invested || 0), 0);

  return (
    <div style={{ minHeight: "100vh", maxWidth: 480, margin: "0 auto", background: BG_, fontFamily: "-apple-system,'Pretendard',sans-serif", position: "relative" }}>
      {drawer && <div onClick={() => setDrawer(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.2)", zIndex: 90 }} />}
      <div style={{ position: "fixed", top: 0, left: 0, bottom: 0, width: 300, background: W, borderRight: `1px solid ${BD}`, zIndex: 100, transform: drawer ? "translateX(0)" : "translateX(-320px)", transition: "transform 0.25s ease", padding: "28px 20px", overflowY: "auto", display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 22, fontWeight: 900, color: T1, marginBottom: 24 }}>세트 관리</div>
        {sets.map(x => (
          <div key={x.id} onClick={() => { setAid(x.id); setDrawer(false); }} style={{ padding: 16, marginBottom: 6, borderRadius: 16, cursor: "pointer", background: x.id === aid ? OL : "transparent", border: x.id === aid ? `2px solid ${O}` : "2px solid transparent", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {editName === x.id ? <input value={tmp} onChange={e => setTmp(e.target.value)} onBlur={() => { if (tmp.trim()) up(sets.map(y => y.id === x.id ? { ...y, name: tmp.trim() } : y)); setEditName(null); }} onKeyDown={e => e.key === "Enter" && e.target.blur()} autoFocus onClick={e => e.stopPropagation()} style={{ background: "transparent", border: "none", borderBottom: `2px solid ${O}`, color: T1, fontSize: 18, width: "80%", outline: "none", fontWeight: 800 }} /> : <>
              <div><div style={{ fontSize: 17, fontWeight: x.id === aid ? 900 : 500, color: x.id === aid ? T1 : T3 }}>{x.name}</div>{(x.viewers || []).length > 0 && <div style={{ fontSize: 12, color: T3, marginTop: 3 }}>{x.viewers.length}명</div>}</div>
              <div style={{ display: "flex", gap: 10 }}><span onClick={e => { e.stopPropagation(); setEditName(x.id); setTmp(x.name); }} style={{ cursor: "pointer", color: T3 }}>✏️</span>{sets.length > 1 && <span onClick={e => { e.stopPropagation(); if (window.confirm("삭제?")) { const ns = sets.filter(y => y.id !== x.id); up(ns, x.id === aid ? ns[0].id : aid); } }} style={{ cursor: "pointer", color: T3 }}>✕</span>}</div>
            </>}
          </div>
        ))}
        <button onClick={() => { const nid = Math.max(...sets.map(x => x.id), 0) + 1; up([...sets, mkSet(nid, `세트 ${nid}`)], nid); setDrawer(false); }} style={{ width: "100%", padding: 16, marginTop: 14, background: "transparent", border: `2px dashed ${BD}`, borderRadius: 16, color: T3, cursor: "pointer", fontSize: 15, fontWeight: 700 }}>+ 새 세트</button>
        <div style={{ flex: 1 }} /><button onClick={onLogout} style={{ ...btn("#F1F5F9", T2), fontWeight: 700, marginTop: 20 }}>로그아웃</button>
      </div>

      <div style={{ padding: "12px 16px", background: W, borderBottom: `1px solid ${BD}`, display: "flex", alignItems: "center", position: "sticky", top: 0, zIndex: 50 }}>
        <button onClick={() => setDrawer(true)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", padding: "4px 14px 4px 0", color: T1 }}>☰</button>
        <div style={{ flex: 1, fontSize: 18, fontWeight: 900, color: T1 }}>{s.name}</div>
        <button onClick={undo} style={{ background: "#F1F5F9", border: "none", borderRadius: 10, padding: "7px 14px", color: T2, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>↩ 되돌리기</button>
      </div>
      {undoMsg && <div style={{ padding: "10px 18px", background: undoMsg.includes("✅") ? GL : RL, textAlign: "center", fontSize: 14, fontWeight: 700, color: undoMsg.includes("✅") ? G : R }}>{undoMsg}</div>}

      <div style={{ display: "flex", background: W, borderBottom: `1px solid ${BD}`, position: "sticky", top: 53, zIndex: 49, padding: "0 6px" }}>
        {[["sales", "판매"], ["settle", "정산"], ["settings", "설정"], ["accounts", "계정"]].map(([v, l]) => (
          <button key={v} onClick={() => setTab(v)} style={{ flex: 1, padding: "14px 0", border: "none", cursor: "pointer", background: "transparent", fontSize: 14, fontWeight: tab === v ? 900 : 500, color: tab === v ? O : T3, borderBottom: tab === v ? `3px solid ${O}` : "3px solid transparent" }}>{l}</button>
        ))}
      </div>

      <div style={{ padding: "16px 14px" }}>
        {tab === "sales" && <SalesTab s={s} canEdit={true} onUpdate={us} partnerNames={s.partners.map(p => p.name).filter(Boolean)} />}

        {tab === "settle" && <>
          <div style={{ fontSize: 20, fontWeight: 900, color: T1, marginBottom: 16 }}>회차별 정산</div>
          <div style={{ ...card, padding: "16px 18px", marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: T1, marginBottom: 8 }}>정산 계산 방식</div>
            <div style={{ fontSize: 13, color: T2, lineHeight: 2 }}>
              ① 매출 − 원가 = <b style={{ color: G }}>순이익</b><br/>
              ② 각자 <b style={{ color: O }}>투자금(총비용) 반환</b><br/>
              ③ 순이익을 <b style={{ color: B }}>지분 비율대로 배분</b><br/>
              ④ <b>총 정산 = 투자금 + 이익배분</b>
            </div>
          </div>
          <div style={{ ...card, padding: "14px 18px", marginBottom: 16, background: BL }}><span style={{ fontSize: 14, color: B, fontWeight: 600 }}>💡 {s.unit}kg 판매 시 자동 정산 생성</span></div>

          {s.settlements.length === 0 ? <div style={{ ...card, padding: 50, textAlign: "center", color: T3 }}>아직 정산 내역이 없습니다</div>
          : s.settlements.map((st, si) => {
            const bd = calcSettle(s.partners, st.sellAmt || 0, st.costAmt || 0);
            const profit = (st.sellAmt || 0) - (st.costAmt || 0);
            const tot = bd.reduce((a, b) => a + b.total, 0);
            return (
              <div key={st.id} style={card}>
                <div style={{ padding: "18px 20px", background: OL, borderBottom: `1px solid ${BD}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <span style={{ fontWeight: 900, color: O, fontSize: 20 }}>{si + 1}회차</span>
                    <button onClick={() => us({ settlements: s.settlements.filter(y => y.id !== st.id) })} style={{ background: W, border: `1.5px solid ${BD}`, borderRadius: 10, color: R, cursor: "pointer", fontSize: 13, padding: "6px 14px", fontWeight: 700 }}>삭제</button>
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <div style={{ flex: 1 }}><div style={lb}>총 매출(만원)</div><input type="number" inputMode="decimal" step="0.1" value={st.sellAmt || ""} placeholder="0" onChange={e => us({ settlements: s.settlements.map(y => y.id === st.id ? { ...y, sellAmt: parseFloat(e.target.value) || 0 } : y) })} style={{ ...inp(O), fontSize: 22, padding: 14 }} /></div>
                    <div style={{ flex: 1 }}><div style={lb}>총 원가(만원)</div><input type="number" inputMode="decimal" step="0.1" value={st.costAmt || ""} placeholder="0" onChange={e => us({ settlements: s.settlements.map(y => y.id === st.id ? { ...y, costAmt: parseFloat(e.target.value) || 0 } : y) })} style={{ ...inp(R), fontSize: 22, padding: 14 }} /></div>
                  </div>
                  {(st.sellAmt > 0 || st.costAmt > 0) && (
                    <div style={{ marginTop: 14, padding: "12px 14px", background: W, borderRadius: 12 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, marginBottom: 6 }}>
                        <span style={{ color: T2 }}>순이익 (매출−원가)</span>
                        <span style={{ fontWeight: 900, color: profit >= 0 ? G : R }}>{fmt(profit)}만</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: T3 }}>
                        <span>투자금 합계 (설정에서 입력)</span>
                        <span style={{ fontWeight: 700, color: O }}>{fmt(totalInvested)}만</span>
                      </div>
                    </div>
                  )}
                </div>
                {st.sellAmt > 0 && <div>
                  {bd.map((b, bi) => (
                    <div key={bi} style={{ padding: "16px 20px", borderBottom: `1px solid #F1F5F9` }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: 18, color: T1 }}>{b.name}</span>
                        <span style={{ color: O, fontWeight: 900, fontSize: 26 }}>{fmt(b.total)}<span style={{ fontSize: 14, color: T3, fontWeight: 500 }}>만</span></span>
                      </div>
                      <div style={{ display: "flex", gap: 6, fontSize: 13, flexWrap: "wrap" }}>
                        <span style={{ background: "#F8FAFC", padding: "4px 10px", borderRadius: 8, color: T3 }}>지분 {b.share}%</span>
                        {b.investedReturn > 0 && <span style={{ background: OL, padding: "4px 10px", borderRadius: 8, color: O, fontWeight: 700 }}>투자금 {fmt(b.investedReturn)}만</span>}
                        <span style={{ background: profit >= 0 ? GL : RL, padding: "4px 10px", borderRadius: 8, color: profit >= 0 ? G : R, fontWeight: 700 }}>이익배분 {fmt(b.profitShare)}만</span>
                      </div>
                    </div>
                  ))}
                  <div style={{ padding: "14px 20px", background: "#F8FAFC", display: "flex", justifyContent: "space-between", fontSize: 17 }}>
                    <span style={{ color: T2, fontWeight: 800 }}>합계</span>
                    <span style={{ color: O, fontWeight: 900, fontSize: 22 }}>{fmt(tot)}만</span>
                  </div>
                </div>}
              </div>
            );
          })}
          <button onClick={() => us({ settlements: [...s.settlements, { id: Date.now(), sellAmt: 0, costAmt: 0 }] })} style={{ ...btn("#F1F5F9", T2), fontSize: 15, fontWeight: 700 }}>+ 수동 회차 추가</button>
        </>}

        {tab === "settings" && <>
          <div style={{ ...card, padding: 22 }}>
            <div style={{ fontSize: 18, fontWeight: 900, color: T1, marginBottom: 16 }}>기본 설정</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}><span style={{ color: T2, fontSize: 16, fontWeight: 700 }}>정산 단위</span><input type="number" inputMode="numeric" value={s.unit} onChange={e => us({ unit: parseInt(e.target.value) || 10 })} style={{ ...inp(O), width: 80, textAlign: "center" }} /><span style={{ color: T3, fontSize: 16 }}>kg마다</span></div>
          </div>

          <div style={card}>
            <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BD}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 900, fontSize: 18, color: T1 }}>투자자 · 지분 · 투자금</span>
              <span style={{ fontSize: 16, color: shareSum === 100 ? G : R, fontWeight: 900 }}>{shareSum}% {shareSum === 100 ? "✅" : "⚠️"}</span>
            </div>
            <div style={{ padding: "10px 20px", borderBottom: `1px solid #F1F5F9`, background: "#FFFBF5" }}><span style={{ fontSize: 13, color: O, fontWeight: 700 }}>🔒 투자금(총비용)은 관리자만 설정</span></div>
            {totalInvested > 0 && <div style={{ padding: "12px 20px", borderBottom: `1px solid #F1F5F9`, background: BL }}><span style={{ fontSize: 14, color: B, fontWeight: 700 }}>투자금 합계: {fmt(totalInvested)}만원</span></div>}

            {s.partners.map((p, idx) => (
              <div key={idx} style={{ padding: "18px 20px", borderBottom: `1px solid #F1F5F9` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <span style={{ width: 30, height: 30, borderRadius: 15, background: "#F1F5F9", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 900, color: T2 }}>{idx + 1}</span>
                  <input value={p.name} onChange={e => { const np = [...s.partners]; np[idx] = { ...np[idx], name: e.target.value }; us({ partners: np }); }} style={{ flex: 1, ...inp(T1), padding: "12px 14px", fontSize: 18, fontWeight: 800 }} />
                  {s.partners.length > 1 && <button onClick={() => us({ partners: s.partners.filter((_, i) => i !== idx) })} style={{ background: "none", border: "none", color: "#CBD5E1", cursor: "pointer", fontSize: 20 }}>✕</button>}
                </div>
                <div style={{ display: "flex", gap: 10, paddingLeft: 40 }}>
                  <div style={{ flex: 1 }}><div style={lb}>지분율 (%)</div><input type="number" inputMode="decimal" value={p.share || ""} onChange={e => { const np = [...s.partners]; np[idx] = { ...np[idx], share: parseFloat(e.target.value) || 0 }; us({ partners: np }); }} style={{ ...inp(B), padding: "12px 10px" }} /></div>
                  <div style={{ flex: 1 }}><div style={{ ...lb, color: O }}>투자금 (만원)</div><input type="number" inputMode="decimal" step="0.1" value={p.invested || ""} placeholder="0" onChange={e => { const np = [...s.partners]; np[idx] = { ...np[idx], invested: parseFloat(e.target.value) || 0 }; us({ partners: np }); }} style={{ ...inp(O), padding: "12px 10px" }} /></div>
                </div>
                {p.invested > 0 && <div style={{ paddingLeft: 40, marginTop: 8, fontSize: 14, color: O, fontWeight: 700 }}>정산 시 {fmt(p.invested)}만 반환 + 이익의 {p.share}% 배분</div>}
              </div>
            ))}
            {s.partners.length < 6 && <button onClick={() => us({ partners: [...s.partners, { name: `투자자${s.partners.length + 1}`, share: 0, invested: 0 }] })} style={{ width: "100%", padding: 16, background: W, border: "none", borderTop: `2px dashed ${BD}`, color: T3, cursor: "pointer", fontSize: 16, fontWeight: 700 }}>+ 투자자 추가</button>}
          </div>

          <div style={{ ...card, padding: 20 }}>
            <div style={{ fontSize: 15, fontWeight: 800, color: T2, marginBottom: 10 }}>정산 예시</div>
            <div style={{ fontSize: 14, color: T2, lineHeight: 2.2 }}>
              매출 5000만, 원가 4600만 → <b style={{ color: G }}>순이익 400만</b><br/>
              A 투자금 4000만 (지분 50%)<br/>
              B 투자금 600만 (지분 50%)<br/><br/>
              이익배분: 400 × 50% = <b style={{ color: B }}>200만</b> (각자)<br/><br/>
              <b style={{ color: O }}>A 정산: 4000 + 200 = 4200만</b><br/>
              <b style={{ color: O }}>B 정산: 600 + 200 = 800만</b>
            </div>
          </div>

          <div style={{ ...card, padding: 20 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontSize: 16, fontWeight: 800, color: T2 }}>관리자 비밀번호</span><button onClick={() => setShowPw(!showPw)} style={{ background: "#F1F5F9", border: "none", borderRadius: 12, padding: "8px 18px", color: T2, cursor: "pointer", fontSize: 14, fontWeight: 700 }}>{showPw ? "닫기" : "변경"}</button></div>
            {showPw && <div style={{ display: "flex", gap: 8, marginTop: 14 }}><input type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="새 비밀번호" style={{ ...inp(T1), flex: 1 }} /><button onClick={async () => { if (newPw.length < 2) { setPwMsg("2자 이상"); return; } await window.storage.set(PKEY, newPw, true); setPwMsg("✅"); setNewPw(""); setTimeout(() => { setPwMsg(""); setShowPw(false); }, 1200); }} style={{ ...btn(), width: "auto", padding: "14px 24px" }}>변경</button></div>}
            {pwMsg && <div style={{ color: pwMsg === "✅" ? G : R, fontSize: 14, marginTop: 8, fontWeight: 700 }}>{pwMsg}</div>}
          </div>
        </>}

        {tab === "accounts" && <>
          <div style={{ ...card, padding: 22 }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: T1, marginBottom: 6 }}>접속 코드 관리</div>
            <div style={{ fontSize: 14, color: T3, marginBottom: 20 }}>{s.name} 투자자 코드 발급</div>
            {(s.viewers || []).length > 0 && <div style={{ marginBottom: 20 }}>{(s.viewers || []).map((v, vi) => (
              <div key={vi} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", marginBottom: 6, background: "#F8FAFC", borderRadius: 14 }}>
                <div><div style={{ fontSize: 16, fontWeight: 700, color: T1 }}>{v.name}</div><div style={{ fontSize: 16, color: O, fontWeight: 800, letterSpacing: 3, marginTop: 3, fontFamily: "monospace" }}>{v.code}</div></div>
                <button onClick={() => { if (window.confirm(`${v.name} 삭제?`)) us({ viewers: (s.viewers || []).filter((_, i) => i !== vi) }); }} style={{ background: W, border: `1.5px solid ${BD}`, borderRadius: 10, color: R, cursor: "pointer", fontSize: 13, padding: "6px 14px", fontWeight: 700 }}>삭제</button>
              </div>
            ))}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input value={vName} onChange={e => setVName(e.target.value)} placeholder="이름 (예: 홍길동)" style={{ ...inp(T1), fontSize: 16 }} />
              <input value={vCode} onChange={e => setVCode(e.target.value.toUpperCase())} placeholder="접속 코드 (예: HONG1234)" style={{ ...inp(O), fontSize: 16, letterSpacing: 3, fontFamily: "monospace" }} />
              <button onClick={() => { if (!vCode.trim()) return; us({ viewers: [...(s.viewers || []), { code: vCode.trim().toUpperCase(), name: vName.trim() || vCode.trim() }] }); setVCode(""); setVName(""); }} style={btn()}>코드 발급</button>
            </div>
          </div>
        </>}
      </div>
    </div>
  );
}

export default function App() {
  const [auth, setAuth] = useState(null);
  if (!auth) return <Login onLogin={setAuth} />;
  if (auth.role === "viewer") return <Viewer code={auth.code} onLogout={() => setAuth(null)} />;
  return <Admin onLogout={() => setAuth(null)} />;
}
