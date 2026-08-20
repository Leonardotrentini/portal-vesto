import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Plus, X, Check, Clock, AlertCircle, User, Building2, ChevronRight, ChevronLeft, LogOut, Edit3, Trash2, Calendar, Tag, Users, Link, Instagram, FileText, ClipboardList, BarChart3, Settings, Eye, EyeOff, Phone, Copy, CheckCircle2, Circle, Loader2, Search, Mail, Lock, Filter, Bell, LayoutDashboard, ArrowLeft, ListChecks, StickyNote, Pin, ChevronDown } from "lucide-react";

// ─── Brand System V2 ───
const T = {
  bg: "#061a10", bgCard: "#0c2418", bgElevated: "#122e20", bgInput: "#0f2a1c", bgHover: "#152f21",
  gold: "#c4a962", goldLight: "#d4bc82", goldMuted: "#8a7d4a", goldDim: "#c4a96218", goldBorder: "#c4a96230",
  text: "#ede8dc", textSec: "#9a9588", textMuted: "#5c5749",
  border: "#1a3d2e", borderStrong: "#244a38",
  success: "#6b9e78", warning: "#c4a962", danger: "#c47070",
};
const FONT = { serif: "'Cormorant Garamond', Georgia, serif", sans: "Inter, system-ui, sans-serif" };
const LOGO_URL = "/logo-vesto.png";
const LOGO_SM = LOGO_URL;

const STORAGE_KEY = "vesto:portal-v2";
const READ_NOTIFS_KEY = "vesto:notifications-read";
const SIDEBAR_KEY = "vesto:sidebar-collapsed";

const DEFAULT_ADMINS = [
  { id: "admin-leo", email: "leo@vesto.com", password: "Vesto@123", name: "Leo" },
  { id: "admin-raul", email: "raul@vesto.com", password: "Vesto@123", name: "Raul" },
];

function normalizeAdmins(admins) {
  const list = Array.isArray(admins) ? [...admins] : [];
  for (const def of DEFAULT_ADMINS) {
    const email = def.email.toLowerCase();
    const idx = list.findIndex(a => a.email?.toLowerCase().trim() === email);
    if (idx === -1) list.push({ ...def });
    else list[idx] = { ...def, ...list[idx], id: list[idx].id || def.id, email: def.email, password: def.password, name: list[idx].name || def.name };
  }
  return list;
}

function normalizeData(d) {
  if (!d.events) d.events = [];
  if (d.adminName === undefined) d.adminName = "";
  if (!d.adminNotes) d.adminNotes = [];
  if (!d.adminChecklist) d.adminChecklist = [];
  d.admins = normalizeAdmins(d.admins);
  return d;
}

function findAdmin(data, email, password) {
  const emailNorm = email.toLowerCase().trim();
  return (data.admins || DEFAULT_ADMINS).find(a => a.email?.toLowerCase().trim() === emailNorm && a.password === password);
}

function getClientsForAdmin(clients, adminId) {
  const list = Object.values(clients || {});
  if (!adminId) return list;
  return list.filter(c => !c.adminId || c.adminId === adminId);
}

function isClientResponsible(responsible, clientId) {
  if (!responsible) return false;
  if (responsible === "cliente") return true;
  if (responsible === `client:${clientId}`) return true;
  return false;
}

function isVestoResponsible(responsible) {
  return responsible === "vesto";
}

function getResponsibleLabel(responsible, clients, currentClient) {
  if (responsible === "vesto") return "Vesto";
  if (responsible?.startsWith("client:")) {
    const id = responsible.slice(7);
    const c = clients?.[id] || (currentClient?.id === id ? currentClient : null);
    return c?.company || "Cliente";
  }
  if (responsible === "cliente") return currentClient?.company || "Cliente";
  return "Cliente";
}

function buildResponsibleOptions(adminClients, currentClient) {
  const opts = [{ value: "vesto", label: "Vesto" }];
  const seen = new Set();
  for (const c of adminClients) {
    if (!c?.id || seen.has(c.id)) continue;
    seen.add(c.id);
    opts.push({ value: `client:${c.id}`, label: c.company || c.name || "Cliente" });
  }
  if (currentClient?.id && !seen.has(currentClient.id)) {
    opts.push({ value: `client:${currentClient.id}`, label: currentClient.company || "Cliente" });
  }
  return opts;
}

function normalizeTaskResponsible(task, clientId) {
  if (!task.responsible || task.responsible === "cliente") {
    return { ...task, responsible: clientId ? `client:${clientId}` : "cliente" };
  }
  return task;
}

function taskAssignedToClient(task, clientId) {
  return isClientResponsible(task.responsible, clientId);
}

const DEFAULT_LABELS = [
  { id: "conteudo", name: "Conteúdo", color: "#7c9a5e" },
  { id: "criativos", name: "Criativos", color: "#c4a35a" },
  { id: "estrutura", name: "Estrutura", color: "#5a8a8a" },
  { id: "vendas", name: "Vendas", color: "#8ab05a" },
  { id: "estrategia", name: "Estratégia", color: "#a08050" },
  { id: "urgente", name: "Urgente", color: "#c45a5a" },
];
const DEFAULT_STATUSES = [
  { id: "todo", label: "A Fazer", color: "#9c9787" },
  { id: "doing", label: "Em Andamento", color: "#c4a35a" },
  { id: "done", label: "Concluído", color: "#4ade80" },
];
const NICHOS = ["Moda Feminina","Moda Masculina","Moda Fitness","Moda Íntima","Moda Praia","Moda Infantil","Jeans","Acessórios","Calçados","Outro"];

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function getGreeting() {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

function dateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDayLabel(d) {
  return `${WEEKDAYS[d.getDay()]}, ${d.getDate()} ${MONTHS_SHORT[d.getMonth()]}`;
}

const uid = () => Math.random().toString(36).slice(2, 10);
const emptyData = () => ({ clients: {}, tasks: {}, reports: {}, labels: [...DEFAULT_LABELS], statuses: [...DEFAULT_STATUSES], events: [], adminName: "", adminNotes: [], adminChecklist: [], admins: [...DEFAULT_ADMINS] });
const emptyClient = () => ({ id: uid(), name: "", company: "", logo: "", nicho: "", email: "", password: "", bm: "", pixel: "", orcamentoMensal: "", driveLink: "", instagram: "", catalogo: { type: "link", value: "", fileName: "" }, vendedores: [{ name: "", phone: "" }], notes: "", adminId: "", createdAt: new Date().toISOString() });
const emptyTask = () => ({ id: uid(), title: "", description: "", instructions: "", referenceLink: "", attachments: [], responsible: "vesto", label: "estrutura", deadline: "", status: "todo", createdAt: new Date().toISOString(), assignedAt: new Date().toISOString(), updatedAt: new Date().toISOString(), completedAt: "" });
const TASK_FILE_ACCEPT = ".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.html,.htm,.web,.mp4,.mov,.zip";
const emptyReport = () => ({ id: uid(), month: new Date().getMonth() + 1, year: new Date().getFullYear(), title: "", link: "", file: "", fileName: "", notes: "", createdAt: new Date().toISOString() });

const REPORT_FILE_ACCEPT = ".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.html,.htm,.web";
const VIEWABLE_REPORT_EXTS = ["html", "htm", "web"];

function openStoredFile(dataUrl, fileName) {
  const ext = fileName.split(".").pop()?.toLowerCase();
  if (VIEWABLE_REPORT_EXTS.includes(ext)) {
    const base64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const opened = window.open(url, "_blank");
    if (!opened) alert("Permita pop-ups para abrir o relatório.");
    setTimeout(() => URL.revokeObjectURL(url), 60000);
    return;
  }
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = fileName;
  a.target = "_blank";
  a.rel = "noopener";
  a.click();
}

async function loadData() { try { const r = await window.storage.get(STORAGE_KEY); const d = normalizeData(r ? JSON.parse(r.value) : emptyData()); return d; } catch { return emptyData(); } }
async function saveData(data) { try { await window.storage.set(STORAGE_KEY, JSON.stringify(data)); } catch (e) { console.error("Save failed:", e); } }

function loadReadNotifs() { try { return JSON.parse(localStorage.getItem(READ_NOTIFS_KEY) || "[]"); } catch { return []; } }
function saveReadNotifs(ids) { localStorage.setItem(READ_NOTIFS_KEY, JSON.stringify(ids)); }

function daysUntilDeadline(deadline) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const due = new Date(deadline + "T00:00:00");
  return Math.ceil((due - today) / 86400000);
}

function isOverdue(task) {
  return task.deadline && task.status !== "done" && daysUntilDeadline(task.deadline) < 0;
}

function deadlineText(deadline) {
  const days = daysUntilDeadline(deadline);
  if (days < 0) return `Atrasada há ${Math.abs(days)} dia${Math.abs(days) === 1 ? "" : "s"}`;
  if (days === 0) return "Vence hoje";
  if (days === 1) return "Vence amanhã";
  if (days <= 7) return `Faltam ${days} dias`;
  return `Faltam ${days} dias`;
}

function deadlineStyle(deadline) {
  const days = daysUntilDeadline(deadline);
  if (days < 0) return { color: T.danger, bg: T.danger + "18" };
  if (days <= 1) return { color: T.warning, bg: T.warning + "18" };
  if (days <= 3) return { color: "#eab308", bg: "#eab30818" };
  return { color: T.textMuted, bg: T.bgInput };
}

function timeAgo(iso) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function makeEvent({ type, audience, clientId, taskId, title, message }) {
  return { id: uid(), type, audience, clientId, taskId, title, message, tab: "tarefas", createdAt: new Date().toISOString() };
}

function buildTaskEvents(oldTasks, newTasks, clientId, company, actorRole) {
  const events = [];
  const oldMap = Object.fromEntries((oldTasks || []).map(t => [t.id, t]));
  const now = new Date().toISOString();

  newTasks.forEach(task => {
    const old = oldMap[task.id];
    if (!old) {
      events.push(makeEvent({
        type: "assigned",
        audience: taskAssignedToClient(task, clientId) ? "client" : "admin",
        clientId,
        taskId: task.id,
        title: "Nova tarefa atribuída",
        message: taskAssignedToClient(task, clientId) ? `Você recebeu: "${task.title}"` : `${company}: "${task.title}"`,
      }));
      return;
    }
    if (old.responsible !== task.responsible) {
      events.push(makeEvent({
        type: "assigned",
        audience: taskAssignedToClient(task, clientId) ? "client" : "admin",
        clientId,
        taskId: task.id,
        title: "Tarefa reatribuída",
        message: taskAssignedToClient(task, clientId) ? `Atribuída a você: "${task.title}"` : `${company}: "${task.title}"`,
      }));
    }
    if (old.status !== "done" && task.status === "done") {
      const who = actorRole === "client" ? "Cliente" : "Vesto";
      events.push(makeEvent({
        type: "completed",
        audience: actorRole === "client" ? "admin" : "client",
        clientId,
        taskId: task.id,
        title: "Tarefa concluída",
        message: `${who} concluiu: "${task.title}"`,
      }));
    }
  });

  return { events, normalizedTasks: newTasks.map(t => {
    const old = oldMap[t.id];
    const patch = { ...t, updatedAt: now };
    if (!old) { patch.assignedAt = now; return patch; }
    if (old.responsible !== t.responsible) patch.assignedAt = now;
    if (old.status !== "done" && t.status === "done") patch.completedAt = now;
    if (old.status === "done" && t.status !== "done") patch.completedAt = "";
    return patch;
  }) };
}

function getReminderNotifs(tasks, audience, clientId, company) {
  const notifs = [];
  tasks.forEach(task => {
    if (task.status === "done" || !task.deadline) return;
    const mine = audience === "client" ? taskAssignedToClient(task, clientId) : isVestoResponsible(task.responsible);
    if (!mine) return;
    const prefix = company ? `${company}: ` : "";
    if (isOverdue(task)) {
      notifs.push({ id: `overdue-${task.id}`, icon: AlertCircle, title: "Tarefa atrasada", message: `${prefix}${task.title} — ${deadlineText(task.deadline)}`, tab: "tarefas", clientId, time: task.deadline, priority: 1 });
    } else {
      const days = daysUntilDeadline(task.deadline);
      if (days <= 7) {
        notifs.push({ id: `reminder-${task.id}-${days}`, icon: Clock, title: days <= 1 ? "Prazo chegando!" : "Lembrete de prazo", message: `${prefix}${task.title} — ${deadlineText(task.deadline)}`, tab: "tarefas", clientId, time: task.deadline, priority: days <= 1 ? 2 : 3 });
      }
    }
  });
  return notifs;
}

function getClientNotifications(data, clientId) {
  const tasks = data.tasks[clientId] || [];
  const reports = data.reports[clientId] || [];
  const notifs = [];

  (data.events || []).filter(e => e.audience === "client" && e.clientId === clientId).forEach(e => {
    notifs.push({ id: `event-${e.id}`, icon: e.type === "completed" ? CheckCircle2 : ClipboardList, title: e.title, message: e.message, tab: e.tab || "tarefas", time: e.createdAt, priority: 0 });
  });

  notifs.push(...getReminderNotifs(tasks, "client", clientId));

  const recent = new Date(); recent.setDate(recent.getDate() - 30);
  reports.forEach(r => {
    if (new Date(r.createdAt) >= recent) {
      notifs.push({ id: `report-${r.id}`, icon: BarChart3, title: "Novo relatório", message: r.title || `Relatório ${r.month}/${r.year}`, tab: "relatorios", time: r.createdAt, priority: 4 });
    }
  });

  return notifs.sort((a, b) => (a.priority || 5) - (b.priority || 5) || new Date(b.time || 0) - new Date(a.time || 0));
}

function getAdminNotifications(data) {
  const notifs = [];

  (data.events || []).filter(e => e.audience === "admin").forEach(e => {
    const client = data.clients[e.clientId];
    notifs.push({ id: `event-${e.id}`, icon: e.type === "completed" ? CheckCircle2 : e.type === "assigned" ? ClipboardList : AlertCircle, title: e.title, message: e.message, tab: e.tab || "tarefas", clientId: e.clientId, time: e.createdAt, priority: 0 });
  });

  Object.entries(data.clients || {}).forEach(([cid, client]) => {
    notifs.push(...getReminderNotifs((data.tasks[cid] || []).map(t => ({ ...t })), "admin", cid, client.company));
  });

  const recent = new Date(); recent.setDate(recent.getDate() - 7);
  Object.entries(data.clients || {}).forEach(([cid, client]) => {
    (data.reports[cid] || []).forEach(r => {
      if (new Date(r.createdAt) >= recent) {
        notifs.push({ id: `admin-report-${r.id}`, icon: BarChart3, title: "Relatório recente", message: `${client.company}: ${r.title || `${r.month}/${r.year}`}`, tab: "relatorios", clientId: cid, time: r.createdAt, priority: 4 });
      }
    });
  });

  return notifs.sort((a, b) => (a.priority || 5) - (b.priority || 5) || new Date(b.time || 0) - new Date(a.time || 0));
}

// ─── Shared UI ───
const s = (base, extra) => ({ ...base, ...extra });
const GoldLine = ({ w = 60 }) => <div style={{ width: w, height: 1, background: `linear-gradient(to right, transparent, ${T.gold}55, transparent)`, margin: "0 auto" }} />;

function Badge({ label, color, small }) {
  return <span style={{ background: (color || T.gold) + "14", color: color || T.gold, border: `1px solid ${(color || T.gold)}28`, borderRadius: 99, fontSize: small ? 10 : 11, padding: small ? "2px 9px" : "3px 11px", fontWeight: 500, letterSpacing: ".04em" }}>{label}</span>;
}

function Btn({ children, onClick, variant = "primary", size = "md", disabled, type = "button", style: sx }) {
  const base = { display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center", borderRadius: 8, fontWeight: 500, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? .45 : 1, border: "none", transition: "all .2s ease", fontFamily: FONT.sans, letterSpacing: ".01em" };
  const sizes = { sm: { fontSize: 12, padding: "7px 14px" }, md: { fontSize: 13, padding: "9px 20px" } };
  const variants = {
    primary: { background: `linear-gradient(135deg, ${T.goldLight}, ${T.gold})`, color: T.bg, fontWeight: 600, boxShadow: `0 2px 12px ${T.gold}22` },
    secondary: { background: "transparent", color: T.textSec, border: `1px solid ${T.border}` },
    outline: { background: "transparent", color: T.gold, border: `1px solid ${T.goldBorder}` },
    ghost: { background: "transparent", color: T.textSec, border: "none" },
    danger: { background: T.danger + "14", color: T.danger, border: `1px solid ${T.danger}33` },
  };
  return <button type={type} onClick={onClick} disabled={disabled} style={s(s(base, sizes[size]), s(variants[variant], sx))}>{children}</button>;
}

function Input({ label, value, onChange, placeholder, type = "text", textarea, icon: Icon }) {
  const inputStyle = { width: "100%", background: T.bgInput, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", paddingLeft: Icon ? 36 : 14, fontSize: 13, color: T.text, outline: "none", fontFamily: FONT.sans, resize: "vertical", transition: "border-color .2s" };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label style={{ fontSize: 10, color: T.goldMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em" }}>{label}</label>}
      <div style={{ position: "relative" }}>
        {Icon && <Icon size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.textMuted }} />}
        {textarea ? <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={4} style={inputStyle} /> : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />}
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      {label && <label style={{ fontSize: 10, color: T.goldMuted, fontWeight: 600, textTransform: "uppercase", letterSpacing: ".1em" }}>{label}</label>}
      <select value={value} onChange={e => onChange(e.target.value)} style={{ width: "100%", background: T.bgInput, border: `1px solid ${T.border}`, borderRadius: 8, padding: "10px 14px", fontSize: 13, color: T.text, fontFamily: FONT.sans }}>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function Modal({ open, onClose, title, children, wide, footer }) {
  if (!open) return null;
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, animation: "fadeIn .2s ease" }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.75)", backdropFilter: "blur(6px)" }} />
      <div onClick={e => e.stopPropagation()} style={{ position: "relative", background: T.bgElevated, border: `1px solid ${T.goldBorder}`, borderRadius: 14, maxWidth: wide ? 640 : 480, width: "100%", maxHeight: "85vh", display: "flex", flexDirection: "column", boxShadow: "0 24px 64px rgba(0,0,0,.5)", overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <h3 style={{ fontSize: 20, fontWeight: 600, color: T.text, margin: 0, fontFamily: FONT.serif }}>{title}</h3>
          <button onClick={onClose} style={{ background: T.bgInput, border: `1px solid ${T.border}`, borderRadius: 6, padding: 6, color: T.textMuted, cursor: "pointer", display: "flex" }}><X size={16} /></button>
        </div>
        <div style={{ padding: footer ? "24px 24px 16px" : 24, overflowY: "auto", flex: 1, minHeight: 0 }}>{children}</div>
        {footer && (
          <div style={{ padding: "14px 24px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0, background: T.bgElevated }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function Drawer({ open, onClose, title, children, width = 480, footer }) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60 }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,.6)", backdropFilter: "blur(4px)", animation: "fadeIn .2s ease" }} />
      <div style={{ position: "absolute", top: 0, right: 0, bottom: 0, width: "min(100vw, " + width + "px)", background: T.bgElevated, borderLeft: `1px solid ${T.goldBorder}`, display: "flex", flexDirection: "column", boxShadow: "-12px 0 48px rgba(0,0,0,.4)", animation: "slideIn .25s ease", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexShrink: 0 }}>
          <h3 style={{ fontSize: 22, fontWeight: 600, color: T.text, margin: 0, fontFamily: FONT.serif, lineHeight: 1.3 }}>{title}</h3>
          <button onClick={onClose} style={{ background: T.bgInput, border: `1px solid ${T.border}`, borderRadius: 6, padding: 6, color: T.textMuted, cursor: "pointer", display: "flex", flexShrink: 0 }}><X size={16} /></button>
        </div>
        <div style={{ padding: footer ? "24px 24px 16px" : 24, overflowY: "auto", flex: 1, minHeight: 0 }}>{children}</div>
        {footer && (
          <div style={{ padding: "14px 24px", borderTop: `1px solid ${T.border}`, display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0, background: T.bgElevated }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ icon: Icon, title, desc, action }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "72px 24px", textAlign: "center" }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: T.goldDim, border: `1px solid ${T.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 20 }}><Icon size={22} style={{ color: T.gold }} strokeWidth={1.5} /></div>
      <p style={{ color: T.text, fontWeight: 500, margin: "0 0 6px", fontFamily: FONT.serif, fontSize: 18 }}>{title}</p>
      <p style={{ color: T.textMuted, fontSize: 13, margin: "0 0 24px", maxWidth: 300, lineHeight: 1.6 }}>{desc}</p>
      {action}
    </div>
  );
}

const panelStyle = { background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 12, padding: 20 };
const sectionLabel = { fontSize: 10, fontWeight: 600, color: T.goldMuted, textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 14px" };

const CHECKLIST_PRIORITIES = [
  { id: "high", label: "Alta", color: T.danger },
  { id: "medium", label: "Média", color: T.warning },
  { id: "low", label: "Baixa", color: T.textMuted },
];

const priorityRank = { high: 0, medium: 1, low: 2 };

function priorityMeta(id) {
  return CHECKLIST_PRIORITIES.find(p => p.id === id) || CHECKLIST_PRIORITIES[1];
}

function sortChecklistItems(items) {
  return [...items].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    const pr = (priorityRank[a.priority] ?? 1) - (priorityRank[b.priority] ?? 1);
    if (pr !== 0) return pr;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

function ClientTasksDrawer({ open, onClose, tasks, onSelectClient }) {
  const [filter, setFilter] = useState("all");
  const filtered = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return tasks.filter(t => {
      if (filter === "overdue") return isOverdue(t);
      if (filter === "week") {
        if (!t.deadline) return false;
        const d = new Date(t.deadline + "T00:00:00");
        return d >= today && d <= weekEnd;
      }
      return true;
    });
  }, [tasks, filter]);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(t => {
      if (!map[t.clientId]) map[t.clientId] = { company: t.company, items: [] };
      map[t.clientId].items.push(t);
    });
    return Object.entries(map).sort((a, b) => a[1].company.localeCompare(b[1].company));
  }, [filtered]);

  return (
    <Drawer open={open} onClose={onClose} title="Tarefas dos Clientes" width={520}>
      <p style={{ fontSize: 13, color: T.textSec, margin: "0 0 16px", lineHeight: 1.5 }}>
        Tarefas atribuídas à Vesto, vinculadas aos clientes. Separado do seu checklist pessoal.
      </p>
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {[{ id: "all", label: "Todas" }, { id: "overdue", label: "Atrasadas" }, { id: "week", label: "Esta semana" }].map(f => (
          <button key={f.id} onClick={() => setFilter(f.id)} style={{ padding: "5px 12px", borderRadius: 99, fontSize: 11, fontWeight: 500, cursor: "pointer", background: filter === f.id ? T.goldDim : "transparent", color: filter === f.id ? T.gold : T.textMuted, border: `1px solid ${filter === f.id ? T.goldBorder : T.border}` }}>{f.label}</button>
        ))}
      </div>
      {grouped.length === 0 ? (
        <p style={{ fontSize: 13, color: T.textMuted, fontStyle: "italic", margin: 0 }}>Nenhuma tarefa neste filtro.</p>
      ) : grouped.map(([clientId, { company, items }]) => (
        <div key={clientId} style={{ marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => { onSelectClient(clientId, "tarefas"); onClose(); }}
            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}
          >
            <Building2 size={14} style={{ color: T.gold }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: T.gold, textTransform: "uppercase", letterSpacing: ".06em" }}>{company}</span>
            <ChevronRight size={12} style={{ color: T.goldMuted }} />
          </button>
          {items.map(t => {
            const overdue = isOverdue(t);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => { onSelectClient(clientId, "tarefas"); onClose(); }}
                style={{ display: "flex", alignItems: "flex-start", gap: 10, width: "100%", textAlign: "left", background: T.bgInput, border: `1px solid ${overdue ? T.danger + "44" : T.border}`, borderRadius: 8, padding: "10px 12px", marginBottom: 6, cursor: "pointer", transition: "border-color .2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.borderStrong; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = overdue ? T.danger + "44" : T.border; }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 13, color: T.text, fontWeight: 500 }}>{t.title}</p>
                  {t.deadline && (
                    <p style={{ margin: "4px 0 0", fontSize: 11, color: overdue ? T.danger : T.textMuted }}>
                      {overdue ? deadlineText(t.deadline) : (() => { const p = t.deadline.split("-"); return p.length === 3 ? `Prazo ${p[2]}/${p[1]}/${p[0]}` : t.deadline; })()}
                    </p>
                  )}
                </div>
                {overdue && <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 7px", borderRadius: 99, background: T.danger + "18", color: T.danger, flexShrink: 0 }}>ATRASADA</span>}
              </button>
            );
          })}
        </div>
      ))}
    </Drawer>
  );
}

function AdminDashboard({ data, onSelectClient, onNewClient, onUpdateData, statuses, adminId, displayName, onSaveDisplayName }) {
  const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.innerWidth < 960);
  const [wide, setWide] = useState(() => typeof window !== "undefined" && window.innerWidth < 1200);
  const [adminNameInput, setAdminNameInput] = useState(displayName || data.adminName || "");
  const [noteText, setNoteText] = useState("");
  const [checklistText, setChecklistText] = useState("");
  const [checklistPriority, setChecklistPriority] = useState("medium");
  const [clientTasksOpen, setClientTasksOpen] = useState(false);
  const [clientsExpanded, setClientsExpanded] = useState(true);

  useEffect(() => {
    const onResize = () => { setNarrow(window.innerWidth < 960); setWide(window.innerWidth < 1200); };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => { setAdminNameInput(displayName || data.adminName || ""); }, [displayName, data.adminName]);

  const doneId = useMemo(() => statuses.find(s => s.id === "done")?.id || statuses[statuses.length - 1]?.id || "done", [statuses]);
  const isDone = useCallback(t => t.status === doneId, [doneId]);

  const metrics = useMemo(() => {
    const clients = getClientsForAdmin(data.clients || {}, adminId);
    const clientIds = new Set(clients.map(c => c.id));
    const allTasks = Object.entries(data.tasks || {}).flatMap(([clientId, tasks]) =>
      clientIds.has(clientId) ? (tasks || []).map(t => ({ ...t, clientId, company: data.clients[clientId]?.company || "Cliente" })) : []
    );
    const openTasks = allTasks.filter(t => !isDone(t));
    const vestoTasks = openTasks.filter(t => t.responsible === "vesto");
    const overdueTasks = openTasks.filter(t => isOverdue(t));
    const now = new Date();
    const curMonth = now.getMonth() + 1;
    const curYear = now.getFullYear();
    const totalClients = clients.length;
    const withReport = clients.filter(c => (data.reports[c.id] || []).some(r => r.month === curMonth && r.year === curYear)).length;
    const checklist = data.adminChecklist || [];
    const checklistOpen = checklist.filter(i => !i.done).length;

    return {
      activeClients: totalClients,
      pendingTasks: openTasks.length,
      vestoTasks: vestoTasks.length,
      overdueTasks: overdueTasks.length,
      reportsRatio: `${withReport}/${totalClients}`,
      allTasks,
      openTasks,
      vestoTasksList: vestoTasks.sort((a, b) => {
        if (isOverdue(a) && !isOverdue(b)) return -1;
        if (!isOverdue(a) && isOverdue(b)) return 1;
        if (a.deadline && b.deadline) return a.deadline.localeCompare(b.deadline);
        if (a.deadline) return -1;
        if (b.deadline) return 1;
        return 0;
      }),
      clients: clients.sort((a, b) => a.company.localeCompare(b.company)),
      checklistOpen,
    };
  }, [data, isDone, adminId]);

  const checklistItems = useMemo(() => sortChecklistItems(data.adminChecklist || []), [data.adminChecklist]);

  const sortedNotes = useMemo(() => {
    const notes = [...(data.adminNotes || [])];
    return notes.sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });
  }, [data.adminNotes]);

  const next7Days = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const key = dateKey(d);
      const tasks = metrics.vestoTasksList.filter(t => t.deadline === key);
      days.push({ date: d, key, isToday: i === 0, tasks });
    }
    return days;
  }, [metrics.vestoTasksList]);

  const saveAdminName = () => {
    const name = adminNameInput.trim();
    if (!name) return;
    if (onSaveDisplayName) onSaveDisplayName(name);
    else if (name !== data.adminName) onUpdateData({ ...data, adminName: name });
  };

  const greetingName = displayName || data.adminName;

  const addNote = () => {
    const text = noteText.trim();
    if (!text) return;
    onUpdateData({ ...data, adminNotes: [{ id: uid(), text, pinned: false, createdAt: new Date().toISOString() }, ...(data.adminNotes || [])] });
    setNoteText("");
  };

  const deleteNote = (id) => onUpdateData({ ...data, adminNotes: (data.adminNotes || []).filter(n => n.id !== id) });

  const togglePinNote = (id) => onUpdateData({
    ...data,
    adminNotes: (data.adminNotes || []).map(n => n.id === id ? { ...n, pinned: !n.pinned } : n),
  });

  const addChecklistItem = () => {
    const text = checklistText.trim();
    if (!text) return;
    onUpdateData({
      ...data,
      adminChecklist: [{ id: uid(), text, done: false, priority: checklistPriority, createdAt: new Date().toISOString() }, ...(data.adminChecklist || [])],
    });
    setChecklistText("");
  };

  const toggleChecklistItem = (id) => onUpdateData({
    ...data,
    adminChecklist: (data.adminChecklist || []).map(i => i.id === id ? { ...i, done: !i.done } : i),
  });

  const deleteChecklistItem = (id) => onUpdateData({
    ...data,
    adminChecklist: (data.adminChecklist || []).filter(i => i.id !== id),
  });

  const setItemPriority = (id, priority) => onUpdateData({
    ...data,
    adminChecklist: (data.adminChecklist || []).map(i => i.id === id ? { ...i, priority } : i),
  });

  const getClientHealth = (clientId) => {
    const tasks = (data.tasks[clientId] || []).filter(t => !isDone(t));
    const overdue = tasks.filter(t => isOverdue(t)).length;
    const pending = tasks.length;
    if (overdue > 0) return { color: T.danger, text: `${overdue} atrasada${overdue > 1 ? "s" : ""}` };
    if (pending > 0) return { color: T.warning, text: `${pending} pendente${pending > 1 ? "s" : ""}` };
    return { color: T.success, text: "Tudo em dia" };
  };

  const kpiCard = (value, label, color, onClick) => (
    <button
      type="button"
      onClick={onClick}
      style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 10, padding: "16px 20px", textAlign: "center", cursor: onClick ? "pointer" : "default", transition: "border-color .2s" }}
      onMouseEnter={e => { if (onClick) e.currentTarget.style.borderColor = T.borderStrong; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; }}
    >
      <p style={{ fontSize: 28, fontWeight: 700, color, margin: "0 0 4px", fontFamily: FONT.serif }}>{value}</p>
      <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: ".06em", color: T.textMuted, margin: 0, fontWeight: 500 }}>{label}</p>
    </button>
  );

  const panelHeader = (icon, title, action) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {icon}
        <p style={{ ...sectionLabel, margin: 0 }}>{title}</p>
      </div>
      {action}
    </div>
  );

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: narrow ? "20px 16px 32px" : "28px 32px 40px", maxWidth: 1280, margin: "0 auto", width: "100%" }}>
      {/* Saudação */}
      <div style={{ marginBottom: 24 }}>
        <p style={{ fontSize: 22, fontWeight: 600, color: T.text, margin: "0 0 8px", fontFamily: FONT.serif }}>
          {getGreeting()}{greetingName ? `, ${greetingName}.` : ","}
          {!greetingName && (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, marginLeft: 8, verticalAlign: "middle" }}>
              <input
                value={adminNameInput}
                onChange={e => setAdminNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") saveAdminName(); }}
                onBlur={saveAdminName}
                placeholder="Seu nome"
                style={{ background: T.bgInput, border: `1px solid ${T.border}`, borderRadius: 6, padding: "4px 10px", fontSize: 14, color: T.text, outline: "none", fontFamily: FONT.sans, width: 140 }}
              />
            </span>
          )}
        </p>
      </div>

      {/* KPIs */}
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "repeat(2, 1fr)" : "repeat(4, 1fr)", gap: 12, marginBottom: 24 }}>
        {kpiCard(metrics.activeClients, "Clientes Ativos", T.gold)}
        {kpiCard(metrics.checklistOpen, "Checklist Pessoal", T.goldLight)}
        {kpiCard(metrics.vestoTasks, "Tarefas Vesto", T.warning, () => setClientTasksOpen(true))}
        {kpiCard(metrics.reportsRatio, "Relatórios do Mês", T.success)}
      </div>

      {/* Área principal: checklist + notas | tarefas clientes + agenda */}
      <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : wide ? "1fr" : "1.2fr 1fr", gap: 16, marginBottom: 24 }}>
        {/* Coluna esquerda */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Checklist pessoal */}
          <div style={panelStyle}>
            {panelHeader(<ListChecks size={14} style={{ color: T.gold }} />, "Meu Checklist", metrics.checklistOpen > 0 && <span style={{ fontSize: 11, color: T.textMuted }}>{metrics.checklistOpen} aberta{metrics.checklistOpen > 1 ? "s" : ""}</span>)}
            <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
              <input
                value={checklistText}
                onChange={e => setChecklistText(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") addChecklistItem(); }}
                placeholder="Nova tarefa pessoal..."
                style={{ flex: 1, minWidth: 160, background: T.bgInput, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 12px", fontSize: 13, color: T.text, outline: "none", fontFamily: FONT.sans }}
              />
              <select
                value={checklistPriority}
                onChange={e => setChecklistPriority(e.target.value)}
                style={{ background: T.bgInput, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 10px", fontSize: 12, color: T.textSec, outline: "none", fontFamily: FONT.sans, cursor: "pointer" }}
              >
                {CHECKLIST_PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
              </select>
              <Btn size="sm" onClick={addChecklistItem}><Plus size={12} /></Btn>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 280, overflowY: "auto" }}>
              {checklistItems.length === 0 ? (
                <p style={{ fontSize: 12, color: T.textMuted, fontStyle: "italic", margin: 0, padding: "8px 0" }}>Seu foco do dia começa aqui.</p>
              ) : checklistItems.map(item => {
                const pm = priorityMeta(item.priority);
                return (
                  <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: item.done ? "transparent" : T.bgInput, border: `1px solid ${item.done ? "transparent" : T.border}`, opacity: item.done ? .55 : 1 }}>
                    <button type="button" onClick={() => toggleChecklistItem(item.id)} style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 5, border: `2px solid ${item.done ? T.success : T.goldMuted}`, background: item.done ? T.success : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
                      {item.done && <Check size={11} style={{ color: T.bg }} strokeWidth={3} />}
                    </button>
                    <span style={{ flex: 1, fontSize: 13, color: item.done ? T.textMuted : T.text, textDecoration: item.done ? "line-through" : "none", lineHeight: 1.4 }}>{item.text}</span>
                    {!item.done && (
                      <select
                        value={item.priority || "medium"}
                        onChange={e => setItemPriority(item.id, e.target.value)}
                        style={{ background: "transparent", border: `1px solid ${pm.color}33`, borderRadius: 99, padding: "2px 8px", fontSize: 10, color: pm.color, outline: "none", cursor: "pointer", fontWeight: 600 }}
                      >
                        {CHECKLIST_PRIORITIES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                      </select>
                    )}
                    <button type="button" onClick={() => deleteChecklistItem(item.id)} style={{ background: "none", border: "none", color: T.textMuted, cursor: "pointer", padding: 2, display: "flex", opacity: .6 }}><X size={13} /></button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notas */}
          <div style={panelStyle}>
            {panelHeader(<StickyNote size={14} style={{ color: T.gold }} />, "Notas Rápidas")}
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) addNote(); }}
              placeholder="Escreva uma nota... (Ctrl+Enter para salvar)"
              rows={3}
              style={{ width: "100%", background: T.bgInput, border: `1px solid ${T.border}`, borderRadius: 8, padding: "12px 14px", fontSize: 13, color: T.text, outline: "none", fontFamily: FONT.sans, resize: "vertical", lineHeight: 1.5, marginBottom: 12, boxSizing: "border-box" }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: sortedNotes.length > 0 ? 16 : 0 }}>
              <Btn size="sm" onClick={addNote} disabled={!noteText.trim()}>Salvar nota</Btn>
            </div>
            {sortedNotes.length > 0 && (
              <div style={{ display: "grid", gridTemplateColumns: narrow ? "1fr" : "1fr 1fr", gap: 10 }}>
                {sortedNotes.map(note => (
                  <div key={note.id} style={{ background: T.bgInput, border: `1px solid ${note.pinned ? T.goldBorder : T.border}`, borderRadius: 10, padding: "12px 14px", position: "relative" }}>
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 6 }}>
                      {note.pinned && <Pin size={11} style={{ color: T.gold, flexShrink: 0, marginTop: 2 }} />}
                      <p style={{ flex: 1, margin: 0, fontSize: 13, color: T.text, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{note.text}</p>
                      <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                        <button type="button" onClick={() => togglePinNote(note.id)} title={note.pinned ? "Desafixar" : "Fixar"} style={{ background: "none", border: "none", color: note.pinned ? T.gold : T.textMuted, cursor: "pointer", padding: 2, display: "flex" }}><Pin size={12} /></button>
                        <button type="button" onClick={() => deleteNote(note.id)} style={{ background: "none", border: "none", color: T.textMuted, cursor: "pointer", padding: 2, display: "flex" }}><X size={12} /></button>
                      </div>
                    </div>
                    <p style={{ margin: 0, fontSize: 10, color: T.textMuted }}>{timeAgo(note.createdAt)}</p>
                  </div>
                ))}
              </div>
            )}
            {sortedNotes.length === 0 && (
              <p style={{ fontSize: 12, color: T.textMuted, fontStyle: "italic", margin: 0 }}>Nenhuma nota salva.</p>
            )}
          </div>
        </div>

        {/* Coluna direita */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Tarefas dos clientes - preview + abrir drawer */}
          <div style={panelStyle}>
            {panelHeader(<ClipboardList size={14} style={{ color: T.gold }} />, "Tarefas dos Clientes", null)}
            <button
              type="button"
              onClick={() => setClientTasksOpen(true)}
              style={{ width: "100%", background: T.bgInput, border: `1px solid ${T.border}`, borderRadius: 10, padding: "14px 16px", cursor: "pointer", textAlign: "left", marginBottom: 14, transition: "all .2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = T.goldBorder; e.currentTarget.style.background = T.bgHover; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.background = T.bgInput; }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: T.text }}>Ver todas as tarefas Vesto</p>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: T.textMuted }}>{metrics.vestoTasks} aberta{metrics.vestoTasks !== 1 ? "s" : ""} · {metrics.overdueTasks} atrasada{metrics.overdueTasks !== 1 ? "s" : ""} no total</p>
                </div>
                <ChevronRight size={18} style={{ color: T.gold }} />
              </div>
            </button>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflowY: "auto" }}>
              {metrics.vestoTasksList.slice(0, 5).map(t => {
                const overdue = isOverdue(t);
                return (
                  <button
                    key={t.id + t.clientId}
                    type="button"
                    onClick={() => onSelectClient(t.clientId, "tarefas")}
                    style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", textAlign: "left", background: "none", border: "none", padding: "6px 4px", cursor: "pointer", borderRadius: 6 }}
                    onMouseEnter={e => { e.currentTarget.style.background = T.bgHover; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "none"; }}
                  >
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: overdue ? T.danger : T.warning, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 12, color: overdue ? T.danger : T.textSec, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <span style={{ color: T.gold, fontWeight: 500 }}>{t.company}</span> — {t.title}
                    </span>
                  </button>
                );
              })}
              {metrics.vestoTasksList.length === 0 && (
                <p style={{ fontSize: 12, color: T.textMuted, fontStyle: "italic", margin: 0 }}>Nenhuma tarefa da Vesto aberta.</p>
              )}
              {metrics.vestoTasksList.length > 5 && (
                <button type="button" onClick={() => setClientTasksOpen(true)} style={{ background: "none", border: "none", color: T.gold, fontSize: 12, cursor: "pointer", padding: "4px 0", textAlign: "left" }}>
                  + {metrics.vestoTasksList.length - 5} mais...
                </button>
              )}
            </div>
          </div>

          {/* Próximos 7 dias */}
          <div style={{ ...panelStyle, maxHeight: 360, overflowY: "auto" }}>
            {panelHeader(<Calendar size={14} style={{ color: T.gold }} />, "Próximos 7 Dias")}
            {next7Days.map(day => (
              <div key={day.key} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: T.text }}>{formatDayLabel(day.date)}</span>
                  {day.isToday && <span style={{ fontSize: 9, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: T.goldDim, color: T.gold, border: `1px solid ${T.goldBorder}` }}>HOJE</span>}
                </div>
                {day.tasks.length === 0 ? (
                  <p style={{ fontSize: 11, color: T.textMuted, fontStyle: "italic", margin: 0, paddingLeft: 2 }}>—</p>
                ) : day.tasks.map(t => (
                  <button key={t.id} type="button" onClick={() => onSelectClient(t.clientId, "tarefas")} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: "none", padding: "2px 0 2px 2px", cursor: "pointer", fontSize: 11, color: isOverdue(t) ? T.danger : T.textSec }}>
                    {t.company} — {t.title}
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Clientes - colapsável */}
      <div>
        <button
          type="button"
          onClick={() => setClientsExpanded(v => !v)}
          style={{ display: "flex", alignItems: "center", gap: 8, background: "none", border: "none", cursor: "pointer", padding: "0 0 12px", width: "100%" }}
        >
          <p style={{ ...sectionLabel, margin: 0 }}>Seus Clientes</p>
          <span style={{ fontSize: 11, color: T.textMuted }}>({metrics.clients.length})</span>
          <ChevronDown size={14} style={{ color: T.textMuted, transform: clientsExpanded ? "rotate(180deg)" : "none", transition: "transform .2s", marginLeft: "auto" }} />
        </button>
        {clientsExpanded && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
            {metrics.clients.map(c => {
              const health = getClientHealth(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectClient(c.id)}
                  style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 12, padding: "16px 14px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer", transition: "border-color .2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.borderStrong; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; }}
                >
                  {c.logo ? (
                    <img src={c.logo} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", border: `1px solid ${T.border}` }} />
                  ) : (
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: T.goldDim, border: `1px solid ${T.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: T.gold }}>
                      {(c.company || "?")[0].toUpperCase()}
                    </div>
                  )}
                  <p style={{ fontSize: 13, fontWeight: 600, color: T.text, margin: 0, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", width: "100%" }}>{c.company}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: health.color }} />
                    <span style={{ fontSize: 10, color: health.color }}>{health.text}</span>
                  </div>
                </button>
              );
            })}
            <button
              type="button"
              onClick={onNewClient}
              style={{ background: T.bgCard, border: `2px dashed ${T.border}`, borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", minHeight: 110, transition: "border-color .2s" }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = T.borderStrong; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; }}
            >
              <Plus size={18} style={{ color: T.goldMuted }} />
              <span style={{ fontSize: 12, color: T.textSec }}>Novo Cliente</span>
            </button>
          </div>
        )}
      </div>

      <ClientTasksDrawer
        open={clientTasksOpen}
        onClose={() => setClientTasksOpen(false)}
        tasks={metrics.vestoTasksList}
        onSelectClient={onSelectClient}
      />
    </div>
  );
}

function NotificationBell({ notifications, onSelect, onMarkAllRead }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const unread = notifications.length;

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button onClick={() => setOpen(v => !v)} title="Notificações" style={{ position: "relative", background: open ? T.goldDim : "transparent", border: `1px solid ${open ? T.goldBorder : T.border}`, borderRadius: 8, padding: "7px 9px", cursor: "pointer", display: "flex", alignItems: "center", color: open ? T.gold : T.textSec, transition: "all .2s" }}>
        <Bell size={16} strokeWidth={1.5} />
        {unread > 0 && <span style={{ position: "absolute", top: -3, right: -3, minWidth: 16, height: 16, borderRadius: 99, background: T.danger, color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{unread > 9 ? "9+" : unread}</span>}
      </button>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 340, maxHeight: 400, overflowY: "auto", background: T.bgElevated, border: `1px solid ${T.goldBorder}`, borderRadius: 12, boxShadow: "0 16px 48px rgba(0,0,0,.5)", zIndex: 100 }}>
          <div style={{ padding: "14px 16px", borderBottom: `1px solid ${T.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: T.text, fontFamily: FONT.serif }}>Notificações</p>
            {unread > 0 && <button onClick={() => { onMarkAllRead?.(); setOpen(false); }} style={{ background: "none", border: "none", color: T.gold, fontSize: 11, cursor: "pointer" }}>Marcar lidas</button>}
          </div>
          {unread === 0 ? (
            <div style={{ padding: "32px 16px", textAlign: "center" }}><p style={{ margin: 0, fontSize: 13, color: T.textMuted }}>Nenhuma notificação</p></div>
          ) : notifications.map(n => (
            <button key={n.id} onClick={() => { onSelect?.(n); setOpen(false); }} style={{ width: "100%", textAlign: "left", padding: "13px 16px", background: "transparent", border: "none", borderBottom: `1px solid ${T.border}`, cursor: "pointer", display: "flex", gap: 10, alignItems: "flex-start" }}
              onMouseEnter={e => { e.currentTarget.style.background = T.bgHover; }}
              onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}
            >
              <div style={{ width: 30, height: 30, borderRadius: 8, background: T.goldDim, border: `1px solid ${T.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><n.icon size={14} style={{ color: T.gold }} strokeWidth={1.5} /></div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 600, color: T.text }}>{n.title}</p>
                  {n.time && <span style={{ fontSize: 10, color: T.textMuted, flexShrink: 0 }}>{timeAgo(n.time)}</span>}
                </div>
                <p style={{ margin: "3px 0 0", fontSize: 12, color: T.textSec, lineHeight: 1.45 }}>{n.message}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Topbar({ sidebarCollapsed, onToggleSidebar, notifications, onNotifSelect, onMarkAllRead, onLogout, showSidebarToggle = true, onLogoClick, largeLogo }) {
  const logoH = largeLogo ? 56 : 40;
  const logoW = largeLogo ? 200 : 148;
  const logoImg = largeLogo ? 148 : 108;
  return (
    <header style={{ borderBottom: `1px solid ${T.border}`, padding: largeLogo ? "0 22px" : "0 20px", height: largeLogo ? 72 : 56, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, background: T.bgCard }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {showSidebarToggle && (
          <button onClick={onToggleSidebar} title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"} style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 7, padding: "5px 7px", cursor: "pointer", color: T.textMuted, display: "flex", alignItems: "center" }}>
            {sidebarCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
          </button>
        )}
        <button
          type="button"
          onClick={onLogoClick}
          title={onLogoClick ? "Voltar ao painel" : undefined}
          style={{ background: "none", border: "none", padding: 0, cursor: onLogoClick ? "pointer" : "default", display: "flex", alignItems: "center", borderRadius: 6, overflow: "hidden", height: logoH, width: logoW }}
        >
          <img src={LOGO_URL} alt="Vesto" draggable={false} style={{ height: logoImg, width: logoImg, objectFit: "cover", opacity: .98, pointerEvents: "none", marginLeft: -8 }} />
        </button>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <NotificationBell notifications={notifications} onSelect={onNotifSelect} onMarkAllRead={onMarkAllRead} />
        <div style={{ width: 1, height: 20, background: T.border, margin: "0 4px" }} />
        <Btn variant="ghost" size="sm" onClick={onLogout}><LogOut size={13} strokeWidth={1.5} /> Sair</Btn>
      </div>
    </header>
  );
}

// ─── Login ───
function LoginScreen({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");

  return (
    <div style={{ minHeight: "100vh", background: `radial-gradient(ellipse at 50% 30%, #143d2a 0%, ${T.bg} 60%, #061a10 100%)`, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, position: "relative", overflow: "hidden" }}>
      {/* Subtle decorative line */}
      <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 1, height: "25vh", background: `linear-gradient(to bottom, transparent, ${T.gold}22, transparent)` }} />
      <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 1, height: "20vh", background: `linear-gradient(to top, transparent, ${T.gold}15, transparent)` }} />
      <div style={{ width: "100%", maxWidth: 380, position: "relative" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <img src={LOGO_URL} alt="Vesto Co." style={{ width: 220, height: "auto", margin: "0 auto 24px", display: "block", filter: "drop-shadow(0 4px 16px rgba(196,169,98,.12))" }} />
          <GoldLine w={80} />
          <p style={{ color: T.goldMuted, fontSize: 10, letterSpacing: ".18em", fontWeight: 500, margin: "14px 0 0" }}>PORTAL DE ACOMPANHAMENTO</p>
        </div>
        <div style={{ background: `${T.bgElevated}cc`, backdropFilter: "blur(16px)", border: `1px solid ${T.goldBorder}`, borderRadius: 14, padding: "32px 28px", boxShadow: "0 16px 48px rgba(0,0,0,.35)" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); if (!email || !password) { setError("Preencha todos os campos"); return; } const res = onLogin(email.toLowerCase().trim(), password); if (res === false) setError("E-mail ou senha incorretos"); } }}>
            <Input label="E-mail" value={email} onChange={v => { setEmail(v); setError(""); }} placeholder="seu@email.com" type="email" icon={Mail} />
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={{ fontSize: 11, color: T.textMuted, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".06em" }}>Senha</label>
              <div style={{ position: "relative" }}>
                <Lock size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.textMuted }} />
                <input type={showPass ? "text" : "password"} value={password} onChange={e => { setPassword(e.target.value); setError(""); }} placeholder="Sua senha"
                  style={{ width: "100%", background: T.bgInput, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 12px", paddingLeft: 34, paddingRight: 36, fontSize: 13, color: T.text, outline: "none", fontFamily: "inherit" }} />
                <button onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: T.textMuted, cursor: "pointer" }}>
                  {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
            {error && <p style={{ color: T.danger, fontSize: 12, margin: 0 }}>{error}</p>}
            <button
              onClick={() => { if (!email || !password) { setError("Preencha todos os campos"); return; } const res = onLogin(email.toLowerCase().trim(), password); if (res === false) setError("E-mail ou senha incorretos"); }}
              onMouseEnter={e => { e.target.style.background = "linear-gradient(135deg, #d4c47a, #b4a65e)"; e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 6px 24px rgba(164,150,78,.4)"; }}
              onMouseLeave={e => { e.target.style.background = `linear-gradient(135deg, ${T.goldLight}, ${T.gold})`; e.target.style.transform = "translateY(0)"; e.target.style.boxShadow = "0 2px 16px rgba(164,150,78,.2)"; }}
              onMouseDown={e => { e.target.style.transform = "scale(.97)"; e.target.style.boxShadow = "0 1px 8px rgba(164,150,78,.15)"; }}
              onMouseUp={e => { e.target.style.transform = "translateY(-2px)"; e.target.style.boxShadow = "0 6px 24px rgba(164,150,78,.4)"; }}
              style={{ width: "100%", marginTop: 12, padding: "13px 18px", background: `linear-gradient(135deg, ${T.goldLight}, ${T.gold})`, color: T.bg, fontSize: 13, fontWeight: 700, border: "none", borderRadius: 8, cursor: "pointer", letterSpacing: ".06em", textTransform: "uppercase", transition: "all .3s cubic-bezier(.4,0,.2,1)", boxShadow: "0 2px 16px rgba(164,150,78,.2)" }}
            >Entrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Client Form ───
function ClientForm({ initial, onSave, onCancel, hideActions, formId, onValidityChange }) {
  const [c, setC] = useState(initial || emptyClient());
  const set = (k, v) => setC(p => ({ ...p, [k]: v }));
  const updateV = (i, f, v) => { const vs = [...c.vendedores]; vs[i] = { ...vs[i], [f]: v }; set("vendedores", vs); };
  const valid = c.name && c.company && c.email && c.password;
  const grid2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 };
  const section = (title) => <div style={{ borderTop: `1px solid ${T.border}`, paddingTop: 16, marginTop: 8 }}><p style={{ fontSize: 10, fontWeight: 600, color: T.goldMuted, textTransform: "uppercase", letterSpacing: ".08em", margin: "0 0 12px" }}>{title}</p></div>;
  const actions = (
    <>
      <Btn variant="secondary" onClick={onCancel}>Cancelar</Btn>
      <Btn onClick={() => valid && onSave(c)} disabled={!valid}>{initial ? "Salvar" : "Criar Cliente"}</Btn>
    </>
  );

  useEffect(() => { onValidityChange?.(!!valid); }, [valid, onValidityChange]);

  const fields = (
    <>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <label style={{ cursor: "pointer", flexShrink: 0 }}>
          {c.logo ? <div style={{ width: 72, height: 72, borderRadius: 12, overflow: "hidden", border: `1px solid ${T.border}` }}><img src={c.logo} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /></div>
          : <div style={{ width: 72, height: 72, borderRadius: 12, border: `2px dashed ${T.border}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2 }}><Plus size={14} style={{ color: T.textMuted }} /><span style={{ fontSize: 9, color: T.textMuted }}>Logo</span></div>}
          <input type="file" accept="image/*" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 2e6) { alert("Máx 2MB"); return; } const r = new FileReader(); r.onload = () => set("logo", r.result); r.readAsDataURL(f); }} />
        </label>
        <div style={{ flex: 1, ...grid2 }}>
          <Input label="Contato *" value={c.name} onChange={v => set("name", v)} placeholder="Nome" icon={User} />
          <Input label="Empresa *" value={c.company} onChange={v => set("company", v)} placeholder="Marca" icon={Building2} />
          <Input label="E-mail de acesso *" value={c.email} onChange={v => set("email", v)} placeholder="email@marca.com" icon={Mail} />
          <Input label="Senha *" value={c.password} onChange={v => set("password", v)} placeholder="Senha do portal" icon={Lock} />
          <Select label="Nicho" value={c.nicho} onChange={v => set("nicho", v)} options={[{ value: "", label: "Selecione" }, ...NICHOS.map(n => ({ value: n, label: n }))]} />
          <Input label="Instagram" value={c.instagram} onChange={v => set("instagram", v)} placeholder="@perfil" icon={Instagram} />
        </div>
      </div>
      {section("Estrutura de Tráfego")}
      <div style={grid2}>
        <Input label="Business Manager" value={c.bm} onChange={v => set("bm", v)} placeholder="ID do BM" />
        <Input label="Pixel ID" value={c.pixel} onChange={v => set("pixel", v)} placeholder="ID do Pixel" />
        <Input label="Orçamento Mensal" value={c.orcamentoMensal} onChange={v => set("orcamentoMensal", v)} placeholder="Ex: R$ 5.000,00" icon={BarChart3} />
      </div>
      {section("Links & Canais")}
      <Input label="Drive dos Criativos" value={c.driveLink} onChange={v => set("driveLink", v)} placeholder="Link do Google Drive" icon={Link} />
      <div>
        <label style={{ fontSize: 11, color: T.textMuted, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".06em" }}>Catálogo / Loja</label>
        <div style={{ display: "flex", gap: 4, margin: "6px 0" }}>
          {["link", "drive", "pdf"].map(t => <button key={t} onClick={() => set("catalogo", { ...c.catalogo, type: t, value: t === "pdf" && c.catalogo.type !== "pdf" ? "" : c.catalogo.type === "pdf" && t !== "pdf" ? "" : c.catalogo.value, fileName: t === "pdf" ? c.catalogo.fileName : "" })} style={{ padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: "pointer", background: c.catalogo?.type === t ? T.goldDim : "transparent", color: c.catalogo?.type === t ? T.gold : T.textMuted, border: `1px solid ${c.catalogo?.type === t ? T.gold + "44" : T.border}` }}>{t.toUpperCase()}</button>)}
        </div>
        {c.catalogo?.type !== "pdf" && <Input value={c.catalogo?.value || ""} onChange={v => set("catalogo", { ...c.catalogo, value: v })} placeholder={c.catalogo?.type === "drive" ? "Link do Drive" : "URL do catálogo"} icon={Link} />}
        {c.catalogo?.type === "pdf" && (c.catalogo?.fileName ? <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.bgInput, borderRadius: 8, padding: "8px 12px", border: `1px solid ${T.border}` }}><FileText size={14} style={{ color: T.gold }} /><span style={{ fontSize: 13, color: T.text, flex: 1 }}>{c.catalogo.fileName}</span><button onClick={() => set("catalogo", { type: "pdf", value: "", fileName: "" })} style={{ background: "none", border: "none", color: T.textMuted, cursor: "pointer" }}><X size={14} /></button></div>
        : <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: T.bgInput, border: `2px dashed ${T.border}`, borderRadius: 8, padding: "20px 16px", cursor: "pointer" }}><Plus size={14} style={{ color: T.textMuted }} /><span style={{ fontSize: 13, color: T.textMuted }}>Upload PDF</span><input type="file" accept=".pdf" style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 4e6) { alert("Máx 4MB"); return; } const r = new FileReader(); r.onload = () => set("catalogo", { type: "pdf", value: r.result, fileName: f.name }); r.readAsDataURL(f); }} /></label>)}
      </div>
      {section("Vendedores")}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginTop: -8 }}><Btn variant="ghost" size="sm" onClick={() => set("vendedores", [...c.vendedores, { name: "", phone: "" }])}><Plus size={12} /> Adicionar</Btn></div>
      {c.vendedores.map((v, i) => <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}><div style={{ flex: 1 }}><Input value={v.name} onChange={val => updateV(i, "name", val)} placeholder="Nome" icon={User} /></div><div style={{ flex: 1 }}><Input value={v.phone} onChange={val => updateV(i, "phone", val)} placeholder="(00) 00000-0000" icon={Phone} /></div>{c.vendedores.length > 1 && <button onClick={() => set("vendedores", c.vendedores.filter((_, idx) => idx !== i))} style={{ background: "none", border: "none", color: T.textMuted, cursor: "pointer", marginTop: 20 }}><X size={14} /></button>}</div>)}
      {section("Observações")}
      <Input value={c.notes} onChange={v => set("notes", v)} placeholder="Notas sobre o cliente..." textarea />
    </>
  );

  const footer = !hideActions && (
    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 16, marginTop: 8, borderTop: `1px solid ${T.border}` }}>
      {actions}
    </div>
  );

  const wrapStyle = { display: "flex", flexDirection: "column", gap: 16 };
  if (formId) {
    return (
      <form id={formId} onSubmit={e => { e.preventDefault(); if (valid) onSave(c); }} style={wrapStyle}>
        {fields}
      </form>
    );
  }

  return (
    <div style={wrapStyle}>
      {fields}
      {footer}
    </div>
  );
}

// ─── Task Card ───
function TaskCard({ task, isAdmin, labels, statuses, onEdit, onToggle, onDelete, onOpen, allClients, currentClient }) {
  const [hover, setHover] = useState(false);
  const lb = labels.find(l => l.id === task.label) || labels[0] || { name: task.label, color: T.textMuted };
  const st = statuses.find(s => s.id === task.status) || { label: task.status, color: T.textMuted };
  const isDone = task.status === "done";
  const deadlineStr = task.deadline ? (() => { const p = task.deadline.split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : ""; })() : "";
  const overdue = isOverdue(task);
  const dl = task.deadline && !isDone ? deadlineStyle(task.deadline) : null;
  const responsibleLabel = getResponsibleLabel(task.responsible, allClients, currentClient);
  const isVesto = isVestoResponsible(task.responsible);
  const hasExtra = task.instructions || task.referenceLink || (task.attachments || []).length > 0;

  return (
    <div
      onClick={() => onOpen?.(task)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? T.bgHover : T.bgCard,
        borderRadius: 10,
        padding: "12px 16px",
        border: `1px solid ${overdue ? T.danger + "40" : hover ? T.borderStrong : T.border}`,
        transition: "border-color .2s, background .2s",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <button onClick={e => { e.stopPropagation(); onToggle(task); }} style={{ flexShrink: 0, width: 18, height: 18, borderRadius: 5, border: `1.5px solid ${isDone ? T.success : T.goldMuted}`, background: isDone ? T.success : "transparent", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", marginTop: 2, transition: "all .2s" }}>
          {isDone && <Check size={10} style={{ color: T.bg }} strokeWidth={3} />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: isDone ? T.textMuted : T.text, textDecoration: isDone ? "line-through" : "none", margin: 0, lineHeight: 1.4 }}>{task.title}</p>
          {task.description && <p style={{ fontSize: 12, color: T.textMuted, margin: "3px 0 0", lineHeight: 1.45, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>{task.description}</p>}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap", fontSize: 11, color: T.textMuted }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: st.color, flexShrink: 0 }} />
              {st.label}
            </span>
            <span style={{ opacity: .35 }}>·</span>
            <span style={{ color: isVesto ? T.goldMuted : T.textMuted }}>{responsibleLabel}</span>
            {deadlineStr && dl && <>
              <span style={{ opacity: .35 }}>·</span>
              <span style={{ color: dl.color, display: "inline-flex", alignItems: "center", gap: 4 }}>
                {deadlineStr}{overdue && <AlertCircle size={10} />}
              </span>
            </>}
            {lb?.name && <>
              <span style={{ opacity: .35 }}>·</span>
              <span style={{ color: lb.color }}>{lb.name}</span>
            </>}
            {hasExtra && <>
              <span style={{ opacity: .35 }}>·</span>
              <span style={{ color: T.goldMuted }}>Anexos</span>
            </>}
          </div>
        </div>
        {isAdmin && hover && (
          <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
            <button onClick={e => { e.stopPropagation(); onEdit(task); }} style={{ background: "transparent", border: "none", borderRadius: 6, color: T.textMuted, cursor: "pointer", padding: 4 }} title="Editar"><Edit3 size={13} /></button>
            <button onClick={e => { e.stopPropagation(); onDelete(task.id); }} style={{ background: "transparent", border: "none", borderRadius: 6, color: T.danger, cursor: "pointer", padding: 4, opacity: .7 }} title="Excluir"><Trash2 size={13} /></button>
          </div>
        )}
      </div>
    </div>
  );
}

function TaskDetailDrawer({ task, open, onClose, labels, statuses, isAdmin, onToggle, onComplete, onEdit, allClients, currentClient }) {
  if (!task) return null;
  const lb = labels.find(l => l.id === task.label) || { name: task.label, color: T.textMuted };
  const st = statuses.find(s => s.id === task.status) || { label: task.status, color: T.textMuted };
  const isDone = task.status === "done";
  const deadlineStr = task.deadline ? (() => { const p = task.deadline.split("-"); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : ""; })() : "";
  const attachments = task.attachments || [];
  const responsibleLabel = getResponsibleLabel(task.responsible, allClients, currentClient);
  const isVesto = isVestoResponsible(task.responsible);

  const DetailSection = ({ title, icon: Icon, children }) => (
    <div style={{ background: T.bgInput, border: `1px solid ${T.border}`, borderRadius: 10, padding: 18 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: T.goldDim, border: `1px solid ${T.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center" }}><Icon size={14} style={{ color: T.gold }} strokeWidth={1.5} /></div>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 600, color: T.goldMuted, textTransform: "uppercase", letterSpacing: ".1em" }}>{title}</p>
      </div>
      {children}
    </div>
  );

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={task.title}
      footer={
        <>
          <Btn variant="secondary" onClick={onClose}>Fechar</Btn>
          {!isAdmin && !isDone && <Btn onClick={() => { (onComplete || onToggle)(task); onClose(); }}><CheckCircle2 size={14} /> Concluir</Btn>}
          {isAdmin && <Btn onClick={() => { onEdit(task); onClose(); }}><Edit3 size={14} /> Editar</Btn>}
        </>
      }
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 12px", borderRadius: 99, background: st.color + "14", color: st.color }}>{st.label}</span>
          <Badge label={lb.name} color={lb.color} />
          <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 99, background: isVesto ? T.goldDim : "#5a8a8a14", color: isVesto ? T.gold : "#7a9e9e", fontWeight: 500 }}>{responsibleLabel}</span>
          {deadlineStr && (
            <span style={{ fontSize: 11, padding: "4px 12px", borderRadius: 99, background: deadlineStyle(task.deadline).bg, color: deadlineStyle(task.deadline).color, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 4 }}>
              <Calendar size={12} />{deadlineStr} · {deadlineText(task.deadline)}
            </span>
          )}
        </div>

        {task.description && <DetailSection title="Resumo" icon={ClipboardList}>
          <p style={{ margin: 0, fontSize: 14, color: T.textSec, lineHeight: 1.75, whiteSpace: "pre-wrap" }}>{task.description}</p>
        </DetailSection>}

        {task.instructions ? <DetailSection title="Instruções" icon={FileText}>
          <p style={{ margin: 0, fontSize: 15, color: T.text, lineHeight: 1.85, whiteSpace: "pre-wrap" }}>{task.instructions}</p>
        </DetailSection> : !task.description && <DetailSection title="Instruções" icon={FileText}>
          <p style={{ margin: 0, fontSize: 13, color: T.textMuted, fontStyle: "italic" }}>Nenhuma instrução detalhada foi adicionada.</p>
        </DetailSection>}

        {task.referenceLink && <DetailSection title="Link de referência" icon={Link}>
          <a href={task.referenceLink.startsWith("http") ? task.referenceLink : `https://${task.referenceLink}`} target="_blank" rel="noopener" style={{ fontSize: 14, color: T.gold, textDecoration: "none", wordBreak: "break-all" }}>{task.referenceLink} →</a>
        </DetailSection>}

        {attachments.length > 0 && <DetailSection title="Documentos e anexos" icon={FileText}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {attachments.map(a => (
              <button key={a.id} onClick={() => openStoredFile(a.file, a.fileName)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 8, cursor: "pointer", textAlign: "left", width: "100%", transition: "border-color .2s" }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.goldBorder; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; }}
              >
                <FileText size={16} style={{ color: T.gold, flexShrink: 0 }} strokeWidth={1.5} />
                <span style={{ fontSize: 13, color: T.text, flex: 1 }}>{a.fileName}</span>
                <span style={{ fontSize: 11, color: T.gold }}>Abrir →</span>
              </button>
            ))}
          </div>
        </DetailSection>}

      </div>
    </Drawer>
  );
}

function matchesResponsibleFilter(task, filter, clientId) {
  if (!filter) return true;
  if (filter === "vesto") return isVestoResponsible(task.responsible);
  if (filter.startsWith("client:")) {
    return task.responsible === filter || (task.responsible === "cliente" && filter === `client:${clientId}`);
  }
  return true;
}

function TaskFilterBar({ tasks, statuses, labels, filter, setFilter, search, setSearch, labelFilter, setLabelFilter, isAdmin, clientId, adminClients, dateFrom, setDateFrom, dateTo, setDateTo, responsibleFilter, setResponsibleFilter, onNewTask, isAdminCanCreate }) {
  const [advanced, setAdvanced] = useState(false);
  const counts = useMemo(() => ({
    all: tasks.length,
    overdue: tasks.filter(t => isOverdue(t)).length,
    assigned: tasks.filter(t => isAdmin ? isVestoResponsible(t.responsible) : taskAssignedToClient(t, clientId)).length,
    client: tasks.filter(t => taskAssignedToClient(t, clientId)).length,
    ...Object.fromEntries(statuses.map(s => [s.id, tasks.filter(t => t.status === s.id).length])),
  }), [tasks, statuses, isAdmin, clientId]);

  const tabs = [
    { id: "all", label: "Todas", count: counts.all },
    ...statuses.map(s => ({ id: s.id, label: s.label, count: counts[s.id] || 0, color: s.color })),
    { id: "assigned", label: isAdmin ? "Minhas" : "Minhas", count: counts.assigned },
    ...(isAdmin ? [{ id: "client", label: "Cliente", count: counts.client }] : []),
    ...(counts.overdue > 0 ? [{ id: "overdue", label: "Atrasadas", count: counts.overdue, color: T.danger }] : []),
  ];

  const responsibleOptions = [{ value: "", label: "Responsável" }, { value: "vesto", label: "Vesto" }, ...adminClients.map(c => ({ value: `client:${c.id}`, label: c.company || c.name || "Cliente" }))];
  const hasAdvanced = dateFrom || dateTo || responsibleFilter || labelFilter;

  const field = {
    background: T.bgElevated,
    border: `1px solid ${T.border}`,
    borderRadius: 8,
    padding: "9px 12px",
    fontSize: 12,
    color: T.text,
    outline: "none",
    fontFamily: FONT.sans,
    colorScheme: "dark",
  };

  const clearAdvanced = () => {
    setDateFrom("");
    setDateTo("");
    setResponsibleFilter("");
    setLabelFilter("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: "1 1 220px", minWidth: 180 }}>
          <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.textMuted, pointerEvents: "none" }} strokeWidth={1.5} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar..."
            style={{ ...field, width: "100%", paddingLeft: 36, background: T.bgCard }}
          />
        </div>
        <button
          type="button"
          onClick={() => setAdvanced(v => !v)}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "9px 14px", borderRadius: 8, fontSize: 12, fontWeight: 500, cursor: "pointer",
            background: advanced || hasAdvanced ? T.goldDim : T.bgCard,
            color: advanced || hasAdvanced ? T.gold : T.textMuted,
            border: `1px solid ${advanced || hasAdvanced ? T.goldBorder : T.border}`,
            fontFamily: FONT.sans,
          }}
        >
          <Filter size={13} strokeWidth={1.5} />
          Filtros{hasAdvanced ? " ·" : ""}
        </button>
        {isAdminCanCreate && onNewTask && (
          <Btn size="sm" onClick={onNewTask} style={{ flexShrink: 0 }}><Plus size={13} /> Nova</Btn>
        )}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap", borderBottom: `1px solid ${T.border}`, paddingBottom: 2 }}>
        {tabs.map(tab => {
          const active = filter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilter(active && tab.id !== "all" ? "all" : tab.id)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "8px 12px", marginBottom: -1,
                fontSize: 12, fontWeight: active ? 500 : 400,
                color: active ? T.text : T.textMuted,
                borderBottom: active ? `2px solid ${tab.color || T.gold}` : "2px solid transparent",
                fontFamily: FONT.sans, transition: "color .2s",
                display: "inline-flex", alignItems: "center", gap: 6,
              }}
            >
              {tab.label}
              <span style={{ fontSize: 10, color: active ? (tab.color || T.gold) : T.textMuted, fontVariantNumeric: "tabular-nums" }}>{tab.count}</span>
            </button>
          );
        })}
      </div>

      {advanced && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: "14px 16px", background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 10 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} title="Prazo de" style={field} />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} title="Prazo até" style={field} />
            <select value={responsibleFilter} onChange={e => setResponsibleFilter(e.target.value)} style={field}>
              {responsibleOptions.map(o => <option key={o.value || "all"} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <button type="button" onClick={() => setLabelFilter("")} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer", background: !labelFilter ? T.goldDim : "transparent", color: !labelFilter ? T.gold : T.textMuted, border: `1px solid ${!labelFilter ? T.goldBorder : T.border}` }}>Todas</button>
            {labels.map(l => (
              <button key={l.id} type="button" onClick={() => setLabelFilter(labelFilter === l.id ? "" : l.id)} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, cursor: "pointer", background: labelFilter === l.id ? l.color + "18" : "transparent", color: labelFilter === l.id ? l.color : T.textMuted, border: `1px solid ${labelFilter === l.id ? l.color + "44" : T.border}` }}>{l.name}</button>
            ))}
          </div>
          {hasAdvanced && (
            <button type="button" onClick={clearAdvanced} style={{ alignSelf: "flex-start", background: "none", border: "none", color: T.textMuted, fontSize: 11, cursor: "pointer", padding: 0, fontFamily: FONT.sans }}>
              Limpar filtros
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function ReportFilterBar({ search, setSearch, monthFilter, setMonthFilter, yearFilter, setYearFilter, clientFilter, setClientFilter, adminClients, showClientFilter }) {
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const curYear = new Date().getFullYear();
  const years = Array.from({ length: 6 }, (_, i) => curYear - i);
  const field = { background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 8, padding: "9px 12px", fontSize: 12, color: T.text, outline: "none", fontFamily: FONT.sans, colorScheme: "dark", minWidth: 0 };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
      <div style={{ position: "relative", flex: "1 1 200px", minWidth: 160 }}>
        <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: T.textMuted, pointerEvents: "none" }} strokeWidth={1.5} />
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar relatório..." style={{ ...field, width: "100%", paddingLeft: 36 }} />
      </div>
      <select value={monthFilter} onChange={e => setMonthFilter(e.target.value)} style={{ ...field, flex: "0 1 120px" }}>
        <option value="">Mês</option>
        {months.map((m, i) => <option key={m} value={String(i + 1)}>{m}</option>)}
      </select>
      <select value={yearFilter} onChange={e => setYearFilter(e.target.value)} style={{ ...field, flex: "0 1 100px" }}>
        <option value="">Ano</option>
        {years.map(y => <option key={y} value={String(y)}>{y}</option>)}
      </select>
      {showClientFilter && (
        <select value={clientFilter} onChange={e => setClientFilter(e.target.value)} style={{ ...field, flex: "0 1 160px" }}>
          <option value="">Cliente</option>
          {adminClients.map(c => <option key={c.id} value={c.id}>{c.company || c.name}</option>)}
        </select>
      )}
    </div>
  );
}

// ─── Task Form ───
function TaskForm({ initial, labels, statuses, onSave, onCancel, onAddLabel, onAddStatus, adminClients, currentClient }) {
  const [t, setT] = useState(() => {
    const base = { ...emptyTask(), ...(initial || {}) };
    if (base.responsible === "cliente" && currentClient?.id) base.responsible = `client:${currentClient.id}`;
    return base;
  });
  const [newLabel, setNewLabel] = useState(""); const [showAddLabel, setShowAddLabel] = useState(false); const [labelColor, setLabelColor] = useState("#7c9a5e");
  const [newStatus, setNewStatus] = useState(""); const [showAddStatus, setShowAddStatus] = useState(false); const [statusColor, setStatusColor] = useState("#5a8a8a");
  const set = (k, v) => setT(p => ({ ...p, [k]: v }));
  const COLORS = ["#7c9a5e","#c4a35a","#5a8a8a","#8ab05a","#a08050","#c45a5a","#6a8ab0","#b07a5a","#9a7ab0","#5aaa7a"];
  const handleAddLabel = () => { if (!newLabel.trim()) return; const id = newLabel.trim().toLowerCase().replace(/\s+/g, "-"); onAddLabel({ id, name: newLabel.trim(), color: labelColor }); set("label", id); setNewLabel(""); setShowAddLabel(false); };
  const handleAddStatus = () => { if (!newStatus.trim()) return; const id = newStatus.trim().toLowerCase().replace(/\s+/g, "-"); onAddStatus({ id, label: newStatus.trim(), color: statusColor }); set("status", id); setNewStatus(""); setShowAddStatus(false); };
  const responsibleOptions = buildResponsibleOptions(adminClients || [], currentClient);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Input label="Título *" value={t.title} onChange={v => set("title", v)} placeholder="Ex: Gravar vídeo de bastidores" />
      <Input label="Descrição" value={t.description} onChange={v => set("description", v)} placeholder="Resumo curto da tarefa..." textarea />
      <Input label="Instruções detalhadas" value={t.instructions || ""} onChange={v => set("instructions", v)} placeholder="Passo a passo, orientações, requisitos..." textarea />
      <Input label="Link de referência" value={t.referenceLink || ""} onChange={v => set("referenceLink", v)} placeholder="Drive, Notion, vídeo..." icon={Link} />
      <div>
        <label style={{ fontSize: 11, color: T.textMuted, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".06em" }}>Documentos e anexos</label>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
          {(t.attachments || []).map(a => (
            <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, background: T.bgInput, borderRadius: 8, padding: "8px 12px", border: `1px solid ${T.border}` }}>
              <FileText size={14} style={{ color: T.gold }} />
              <span style={{ fontSize: 13, color: T.text, flex: 1 }}>{a.fileName}</span>
              <button onClick={() => set("attachments", (t.attachments || []).filter(x => x.id !== a.id))} style={{ background: "none", border: "none", color: T.textMuted, cursor: "pointer" }}><X size={14} /></button>
            </div>
          ))}
          <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: T.bgInput, border: `2px dashed ${T.border}`, borderRadius: 8, padding: "16px", cursor: "pointer" }}>
            <Plus size={14} style={{ color: T.textMuted }} />
            <span style={{ fontSize: 13, color: T.textMuted }}>Adicionar arquivo (PDF, HTML, imagens...)</span>
            <input type="file" accept={TASK_FILE_ACCEPT} multiple style={{ display: "none" }} onChange={e => {
              Array.from(e.target.files || []).forEach(f => {
                if (f.size > 4e6) { alert(`"${f.name}" excede 4MB`); return; }
                const rd = new FileReader();
                rd.onload = () => set("attachments", [...(t.attachments || []), { id: uid(), fileName: f.name, file: rd.result }]);
                rd.readAsDataURL(f);
              });
              e.target.value = "";
            }} />
          </label>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Select label="Responsável" value={t.responsible} onChange={v => set("responsible", v)} options={responsibleOptions} />
        <Input label="Prazo" value={t.deadline} onChange={v => set("deadline", v)} type="date" />
      </div>
      {/* Labels */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <label style={{ fontSize: 11, color: T.textMuted, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".06em" }}>Etiqueta</label>
          <button onClick={() => setShowAddLabel(!showAddLabel)} style={{ fontSize: 10, color: T.gold, background: "none", border: "none", cursor: "pointer" }}>{showAddLabel ? "Cancelar" : "+ Nova"}</button>
        </div>
        {showAddLabel ? <div style={{ background: T.bgInput, borderRadius: 8, padding: 12, border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
          <Input value={newLabel} onChange={setNewLabel} placeholder="Nome" />
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{COLORS.map(c => <button key={c} onClick={() => setLabelColor(c)} style={{ width: 22, height: 22, borderRadius: 99, background: c, border: labelColor === c ? `2px solid ${T.text}` : "2px solid transparent", cursor: "pointer" }} />)}</div>
          <Btn size="sm" onClick={handleAddLabel} disabled={!newLabel.trim()}>Salvar</Btn>
        </div> : <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{labels.map(l => <button key={l.id} onClick={() => set("label", l.id)} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500, background: l.color + "18", color: l.color, border: t.label === l.id ? `1px solid ${l.color}` : "1px solid transparent", cursor: "pointer", opacity: t.label === l.id ? 1 : .6 }}>{l.name}</button>)}</div>}
      </div>
      {/* Status */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <label style={{ fontSize: 11, color: T.textMuted, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".06em" }}>Status</label>
          <button onClick={() => setShowAddStatus(!showAddStatus)} style={{ fontSize: 10, color: T.gold, background: "none", border: "none", cursor: "pointer" }}>{showAddStatus ? "Cancelar" : "+ Novo"}</button>
        </div>
        {showAddStatus ? <div style={{ background: T.bgInput, borderRadius: 8, padding: 12, border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 8 }}>
          <Input value={newStatus} onChange={setNewStatus} placeholder="Nome" />
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{COLORS.map(c => <button key={c} onClick={() => setStatusColor(c)} style={{ width: 22, height: 22, borderRadius: 99, background: c, border: statusColor === c ? `2px solid ${T.text}` : "2px solid transparent", cursor: "pointer" }} />)}</div>
          <Btn size="sm" onClick={handleAddStatus} disabled={!newStatus.trim()}>Salvar</Btn>
        </div> : <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>{statuses.map(st => <button key={st.id} onClick={() => set("status", st.id)} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 500, background: st.color + "18", color: st.color, border: t.status === st.id ? `1px solid ${st.color}` : "1px solid transparent", cursor: "pointer", opacity: t.status === st.id ? 1 : .6 }}>{st.label}</button>)}</div>}
      </div>
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 8 }}>
        <Btn variant="secondary" onClick={onCancel}>Cancelar</Btn>
        <Btn onClick={() => t.title && onSave(t)} disabled={!t.title}>{initial ? "Salvar" : "Criar Tarefa"}</Btn>
      </div>
    </div>
  );
}

// ─── Report Form ───
function ReportForm({ initial, onSave, onCancel }) {
  const [r, setR] = useState(initial || emptyReport());
  const [mode, setMode] = useState(initial?.file ? "file" : "link");
  const set = (k, v) => setR(p => ({ ...p, [k]: v }));
  const months = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <Input label="Título" value={r.title} onChange={v => set("title", v)} placeholder="Ex: Relatório de Performance" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Select label="Mês" value={r.month} onChange={v => set("month", parseInt(v))} options={months.map((m, i) => ({ value: i + 1, label: m }))} />
        <Input label="Ano" value={r.year} onChange={v => set("year", parseInt(v) || r.year)} type="number" />
      </div>
      <div>
        <label style={{ fontSize: 11, color: T.textMuted, fontWeight: 500, textTransform: "uppercase", letterSpacing: ".06em" }}>Anexo</label>
        <div style={{ display: "flex", gap: 4, margin: "6px 0" }}>
          {[{ id: "link", l: "Link" }, { id: "file", l: "Arquivo" }].map(t => <button key={t.id} onClick={() => { setMode(t.id); if (t.id === "link") { set("file", ""); set("fileName", ""); } else set("link", ""); }} style={{ padding: "4px 12px", borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: "pointer", background: mode === t.id ? T.goldDim : "transparent", color: mode === t.id ? T.gold : T.textMuted, border: `1px solid ${mode === t.id ? T.gold + "44" : T.border}` }}>{t.l}</button>)}
        </div>
        {mode === "link" ? <Input value={r.link} onChange={v => set("link", v)} placeholder="URL (Drive, Notion...)" icon={Link} />
        : r.fileName ? <div style={{ display: "flex", alignItems: "center", gap: 8, background: T.bgInput, borderRadius: 8, padding: "8px 12px", border: `1px solid ${T.border}` }}><FileText size={14} style={{ color: T.gold }} /><span style={{ fontSize: 13, color: T.text, flex: 1 }}>{r.fileName}</span><button onClick={() => { set("file", ""); set("fileName", ""); }} style={{ background: "none", border: "none", color: T.textMuted, cursor: "pointer" }}><X size={14} /></button></div>
        : <label style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, background: T.bgInput, border: `2px dashed ${T.border}`, borderRadius: 8, padding: "20px 16px", cursor: "pointer" }}><Plus size={14} style={{ color: T.textMuted }} /><span style={{ fontSize: 13, color: T.textMuted }}>Upload (PDF, HTML, WEB...)</span><input type="file" accept={REPORT_FILE_ACCEPT} style={{ display: "none" }} onChange={e => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 4e6) { alert("Máx 4MB"); return; } const rd = new FileReader(); rd.onload = () => { set("file", rd.result); set("fileName", f.name); }; rd.readAsDataURL(f); }} /></label>}
      </div>
      <Input label="Observações" value={r.notes} onChange={v => set("notes", v)} placeholder="Destaques do mês..." textarea />
      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", paddingTop: 8 }}><Btn variant="secondary" onClick={onCancel}>Cancelar</Btn><Btn onClick={() => onSave(r)}>Salvar</Btn></div>
    </div>
  );
}

// ─── Workspace ───
function ClientWorkspace({ client, tasks, reports, isAdmin, labels, statuses, onUpdateClient, onUpdateTasks, onUpdateReports, onAddLabel, onAddStatus, onDeleteClient, activeTab, onTabChange, onGoHome, adminClients, allClients, allReports }) {
  const [tab, setTab] = useState(activeTab || "tarefas");
  const [taskModal, setTaskModal] = useState(null);
  const [taskDetail, setTaskDetail] = useState(null);
  const [reportModal, setReportModal] = useState(null);
  const [editingClient, setEditingClient] = useState(false);
  const [filter, setFilter] = useState("all");
  const [taskSearch, setTaskSearch] = useState("");
  const [labelFilter, setLabelFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [responsibleFilter, setResponsibleFilter] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [reportMonthFilter, setReportMonthFilter] = useState("");
  const [reportYearFilter, setReportYearFilter] = useState("");
  const [reportClientFilter, setReportClientFilter] = useState("");
  const [copied, setCopied] = useState(false);
  const clientsMap = allClients || { [client.id]: client };
  const myAdminClients = adminClients || [client];
  const months = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
  const tabs = [{ id: "dados", label: "Dados", icon: Building2 }, { id: "tarefas", label: "Tarefas", icon: ClipboardList }, { id: "relatorios", label: "Relatórios", icon: BarChart3 }];
  useEffect(() => { if (activeTab) setTab(activeTab); }, [activeTab]);
  const goTab = (next) => { setTab(next); onTabChange?.(next); };
  const filteredTasks = (tasks || []).filter(t => {
    const q = taskSearch.trim().toLowerCase();
    if (q && !t.title.toLowerCase().includes(q) && !(t.description || "").toLowerCase().includes(q)) return false;
    if (labelFilter && t.label !== labelFilter) return false;
    if (dateFrom && (!t.deadline || t.deadline < dateFrom)) return false;
    if (dateTo && (!t.deadline || t.deadline > dateTo)) return false;
    if (responsibleFilter && !matchesResponsibleFilter(t, responsibleFilter, client.id)) return false;
    if (filter === "all") return true;
    if (filter === "client") return taskAssignedToClient(t, client.id);
    if (filter === "assigned") return isAdmin ? isVestoResponsible(t.responsible) : taskAssignedToClient(t, client.id);
    if (filter === "overdue") return isOverdue(t);
    return t.status === filter;
  });
  const hasTaskFilters = taskSearch || labelFilter || dateFrom || dateTo || responsibleFilter || filter !== "all";
  const adminClientIds = new Set(myAdminClients.map(c => c.id));
  const reportEntries = isAdmin && allReports
    ? Object.entries(allReports).flatMap(([cid, reps]) =>
        adminClientIds.has(cid) ? (reps || []).map(r => ({ ...r, clientId: cid, clientName: clientsMap[cid]?.company || "Cliente" })) : []
      )
    : (reports || []).map(r => ({ ...r, clientId: client.id, clientName: client.company }));
  const filteredReports = reportEntries.filter(r => {
    if (reportClientFilter && r.clientId !== reportClientFilter) return false;
    const q = reportSearch.trim().toLowerCase();
    if (q && !(r.title || "").toLowerCase().includes(q) && !(`${months[r.month - 1] || ""} ${r.year}`).toLowerCase().includes(q)) return false;
    if (reportMonthFilter && r.month !== parseInt(reportMonthFilter, 10)) return false;
    if (reportYearFilter && r.year !== parseInt(reportYearFilter, 10)) return false;
    return true;
  });
  const hasReportFilters = reportSearch || reportMonthFilter || reportYearFilter || reportClientFilter;
  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (isOverdue(a) && !isOverdue(b)) return -1;
    if (!isOverdue(a) && isOverdue(b)) return 1;
    const ids = statuses.map(s => s.id);
    return ids.indexOf(a.status) - ids.indexOf(b.status);
  });
  const handleSaveTask = (task) => { const ex = (tasks || []).find(t => t.id === task.id); onUpdateTasks(ex ? tasks.map(t => t.id === task.id ? task : t) : [...(tasks || []), task]); setTaskModal(null); };
  const handleToggleTask = (task) => { const ids = statuses.map(s => s.id); const next = (ids.indexOf(task.status) + 1) % ids.length; handleSaveTask({ ...task, status: ids[next] }); };
  const handleCompleteTask = (task) => { if (task.status !== "done") handleSaveTask({ ...task, status: "done" }); };
  const handleDeleteTask = (id) => onUpdateTasks((tasks || []).filter(t => t.id !== id));
  const handleSaveReport = (rpt) => { const ex = (reports || []).find(r => r.id === rpt.id); onUpdateReports(ex ? reports.map(r => r.id === rpt.id ? rpt : r) : [...(reports || []), rpt]); setReportModal(null); };
  const handleDeleteReport = (id) => onUpdateReports((reports || []).filter(r => r.id !== id));
  const copyCredentials = () => { navigator.clipboard.writeText(`Email: ${client.email}\nSenha: ${client.password}`); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div style={{ flex: 1, overflowY: "auto" }}>
      {/* Header */}
      <div style={{ borderBottom: `1px solid ${T.border}`, padding: "18px 28px 0" }}>
        {isAdmin && onGoHome && (
          <button
            type="button"
            onClick={onGoHome}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "none", border: "none", color: T.textMuted, fontSize: 11, cursor: "pointer", padding: "0 0 14px", fontFamily: FONT.sans, transition: "color .2s", letterSpacing: ".02em" }}
            onMouseEnter={e => { e.currentTarget.style.color = T.gold; }}
            onMouseLeave={e => { e.currentTarget.style.color = T.textMuted; }}
          >
            <ArrowLeft size={13} strokeWidth={1.5} /> Voltar
          </button>
        )}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>
            {client.logo ? <img src={client.logo} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", border: `1px solid ${T.goldBorder}`, flexShrink: 0 }} />
            : <div style={{ width: 44, height: 44, borderRadius: 10, background: T.goldDim, border: `1px solid ${T.goldBorder}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><span style={{ color: T.gold, fontWeight: 600, fontSize: 18, fontFamily: FONT.serif }}>{(client.company || "?")[0]}</span></div>}
            <div style={{ minWidth: 0 }}>
              <h2 style={{ fontSize: 20, fontWeight: 600, color: T.text, margin: 0, fontFamily: FONT.serif, letterSpacing: ".01em", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{client.company}</h2>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                <span style={{ fontSize: 12, color: T.textMuted }}>{client.name}</span>
                {client.nicho && <span style={{ fontSize: 10, color: T.goldMuted, letterSpacing: ".04em" }}>{client.nicho}</span>}
              </div>
            </div>
          </div>
          {isAdmin && <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            <span style={{ fontSize: 11, color: T.textMuted, fontFamily: "ui-monospace, monospace", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{client.email}</span>
            <button onClick={copyCredentials} title="Copiar credenciais" style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 6, padding: 5, color: T.textMuted, cursor: "pointer", display: "flex" }}>{copied ? <Check size={13} style={{ color: T.success }} /> : <Copy size={13} />}</button>
            {!editingClient && onDeleteClient && (
              <button type="button" title="Remover cliente" onClick={() => { if (confirm(`Remover ${client.company}?`)) onDeleteClient(client.id); }} style={{ background: "transparent", border: `1px solid ${T.border}`, borderRadius: 6, padding: 5, color: T.textMuted, cursor: "pointer", display: "flex" }}>
                <Trash2 size={13} />
              </button>
            )}
          </div>}
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {tabs.map(t => {
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => goTab(t.id)} style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", fontSize: 12, fontWeight: active ? 500 : 400, background: "transparent", color: active ? T.gold : T.textMuted, border: "none", borderBottom: active ? `2px solid ${T.gold}` : "2px solid transparent", cursor: "pointer", transition: "all .2s", marginBottom: -1, fontFamily: FONT.sans }}>
                <t.icon size={14} strokeWidth={1.5} />{t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: "24px 28px 32px" }}>
        {/* Dados */}
        {tab === "dados" && (editingClient ? <ClientForm initial={client} onSave={c => { onUpdateClient(c); setEditingClient(false); }} onCancel={() => setEditingClient(false)} />
        : <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {isAdmin && <div style={{ display: "flex", justifyContent: "flex-end" }}><Btn variant="secondary" size="sm" onClick={() => setEditingClient(true)}><Edit3 size={13} /> Editar</Btn></div>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[{ l: "Business Manager", v: client.bm, i: Settings }, { l: "Pixel ID", v: client.pixel, i: Tag }, { l: "Orçamento Mensal", v: client.orcamentoMensal, i: BarChart3 }, { l: "Instagram", v: client.instagram, i: Instagram }, { l: "Drive Criativos", v: client.driveLink, i: Link }].map(item => (
              <div key={item.l} style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 10, padding: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}><item.i size={13} style={{ color: T.textMuted }} /><span style={{ fontSize: 10, color: T.textMuted, textTransform: "uppercase", letterSpacing: ".06em" }}>{item.l}</span></div>
                {item.v ? (item.v.startsWith("http") || item.v.startsWith("@") ? <a href={item.v.startsWith("@") ? `https://instagram.com/${item.v.replace("@", "")}` : item.v} target="_blank" rel="noopener" style={{ fontSize: 13, color: T.gold, textDecoration: "none" }}>{item.v}</a> : <p style={{ fontSize: 13, color: T.text, margin: 0, fontFamily: "monospace" }}>{item.v}</p>) : <p style={{ fontSize: 13, color: T.textMuted, margin: 0, fontStyle: "italic" }}>—</p>}
              </div>
            ))}
            <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 10, padding: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}><FileText size={13} style={{ color: T.textMuted }} /><span style={{ fontSize: 10, color: T.textMuted, textTransform: "uppercase", letterSpacing: ".06em" }}>Catálogo</span></div>
              {client.catalogo?.type === "pdf" && client.catalogo?.value ? <button onClick={() => { const a = document.createElement("a"); a.href = client.catalogo.value; a.download = client.catalogo.fileName || "catalogo.pdf"; a.click(); }} style={{ fontSize: 13, color: T.gold, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><FileText size={13} />{client.catalogo.fileName}</button>
              : client.catalogo?.value ? <a href={client.catalogo.value} target="_blank" rel="noopener" style={{ fontSize: 13, color: T.gold, textDecoration: "none" }}>{client.catalogo.value}</a> : <p style={{ fontSize: 13, color: T.textMuted, margin: 0, fontStyle: "italic" }}>—</p>}
            </div>
          </div>
          <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 10, padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}><Users size={13} style={{ color: T.textMuted }} /><span style={{ fontSize: 10, color: T.textMuted, textTransform: "uppercase", letterSpacing: ".06em" }}>Vendedores ({client.vendedores?.filter(v => v.name).length || 0})</span></div>
            {client.vendedores?.filter(v => v.name).length > 0 ? client.vendedores.filter(v => v.name).map((v, i) => <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "6px 12px", background: T.bgInput, borderRadius: 6, marginBottom: 4 }}><span style={{ fontSize: 13, color: T.text }}>{v.name}</span><span style={{ fontSize: 13, color: T.textSec, fontFamily: "monospace" }}>{v.phone || "—"}</span></div>) : <p style={{ fontSize: 13, color: T.textMuted, fontStyle: "italic", margin: 0 }}>Nenhum vendedor</p>}
          </div>
          {client.notes && <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 10, padding: 14 }}><p style={{ fontSize: 10, color: T.textMuted, textTransform: "uppercase", letterSpacing: ".06em", margin: "0 0 6px" }}>Observações</p><p style={{ fontSize: 13, color: T.textSec, margin: 0, whiteSpace: "pre-wrap" }}>{client.notes}</p></div>}
        </div>)}

        {/* Tarefas */}
        {tab === "tarefas" && <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <TaskFilterBar
            tasks={tasks || []}
            statuses={statuses}
            labels={labels}
            filter={filter}
            setFilter={setFilter}
            search={taskSearch}
            setSearch={setTaskSearch}
            labelFilter={labelFilter}
            setLabelFilter={setLabelFilter}
            isAdmin={isAdmin}
            clientId={client.id}
            adminClients={myAdminClients}
            dateFrom={dateFrom}
            setDateFrom={setDateFrom}
            dateTo={dateTo}
            setDateTo={setDateTo}
            responsibleFilter={responsibleFilter}
            setResponsibleFilter={setResponsibleFilter}
            onNewTask={() => setTaskModal("new")}
            isAdminCanCreate={isAdmin}
          />
          {sortedTasks.length === 0 ? <EmptyState icon={ClipboardList} title="Nenhuma tarefa" desc={hasTaskFilters ? "Ajuste os filtros ou a busca." : "Crie a primeira tarefa para começar."} action={isAdmin && !hasTaskFilters && <Btn size="sm" onClick={() => setTaskModal("new")}><Plus size={13} /> Criar</Btn>} />
          : <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>{sortedTasks.map(t => <TaskCard key={t.id} task={t} isAdmin={isAdmin} labels={labels} statuses={statuses} onEdit={task => setTaskModal(task)} onToggle={handleToggleTask} onDelete={handleDeleteTask} onOpen={setTaskDetail} allClients={clientsMap} currentClient={client} />)}</div>}
          <TaskDetailDrawer task={taskDetail} open={!!taskDetail} onClose={() => setTaskDetail(null)} labels={labels} statuses={statuses} isAdmin={isAdmin} onToggle={handleToggleTask} onComplete={handleCompleteTask} onEdit={task => setTaskModal(task)} allClients={clientsMap} currentClient={client} />
          <Modal open={!!taskModal} onClose={() => setTaskModal(null)} title={taskModal && taskModal !== "new" ? "Editar Tarefa" : "Nova Tarefa"} wide>
            <TaskForm initial={taskModal !== "new" ? taskModal : null} labels={labels} statuses={statuses} onSave={handleSaveTask} onCancel={() => setTaskModal(null)} onAddLabel={onAddLabel} onAddStatus={onAddStatus} adminClients={myAdminClients} currentClient={client} />
          </Modal>
        </div>}

        {/* Relatórios */}
        {tab === "relatorios" && <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 240 }}>
              <ReportFilterBar search={reportSearch} setSearch={setReportSearch} monthFilter={reportMonthFilter} setMonthFilter={setReportMonthFilter} yearFilter={reportYearFilter} setYearFilter={setReportYearFilter} clientFilter={reportClientFilter} setClientFilter={setReportClientFilter} adminClients={myAdminClients} showClientFilter={isAdmin && myAdminClients.length > 1} />
            </div>
            {isAdmin && <Btn size="sm" onClick={() => setReportModal("new")} style={{ flexShrink: 0 }}><Plus size={13} /> Novo</Btn>}
          </div>
          {filteredReports.length === 0 ? <EmptyState icon={BarChart3} title="Nenhum relatório" desc={hasReportFilters ? "Tente outro filtro." : "Os relatórios mensais aparecerão aqui."} action={isAdmin && !hasReportFilters && <Btn size="sm" onClick={() => setReportModal("new")}><Plus size={13} /> Adicionar</Btn>} />
          : <div style={{ position: "relative", paddingLeft: 28 }}>
            <div style={{ position: "absolute", left: 15, top: 8, bottom: 8, width: 1, background: `linear-gradient(to bottom, ${T.gold}44, ${T.border})` }} />
            {[...filteredReports].sort((a, b) => (b.year * 12 + b.month) - (a.year * 12 + a.month)).map(r => (
              <div key={`${r.clientId}-${r.id}`} style={{ position: "relative", marginBottom: 16, paddingLeft: 20 }}>
                <div style={{ position: "absolute", left: -20, top: 18, width: 32, height: 32, borderRadius: 99, background: T.goldDim, border: `2px solid ${T.gold}`, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1 }}>
                  <span style={{ color: T.gold, fontSize: 9, fontWeight: 700, letterSpacing: ".02em" }}>{months[r.month - 1]}</span>
                </div>
                <div style={{ background: T.bgCard, border: `1px solid ${T.border}`, borderRadius: 10, padding: "16px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", transition: "border-color .2s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = T.goldBorder; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; }}
                >
                  <div>
                    <p style={{ fontSize: 15, fontWeight: 600, color: T.text, margin: 0, fontFamily: FONT.serif }}>{r.title || `Relatório ${months[r.month - 1]} ${r.year}`}</p>
                    <p style={{ fontSize: 11, color: T.textMuted, margin: "4px 0 0" }}>{isAdmin && r.clientId !== client.id ? `${r.clientName} · ` : ""}{months[r.month - 1]} {r.year}</p>
                    {r.notes && <p style={{ fontSize: 12, color: T.textSec, margin: "8px 0 0", lineHeight: 1.5 }}>{r.notes}</p>}
                    <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                      {r.link && <a href={r.link} target="_blank" rel="noopener" style={{ fontSize: 12, color: T.gold, textDecoration: "none" }}>Abrir link →</a>}
                      {r.file && r.fileName && <button onClick={() => openStoredFile(r.file, r.fileName)} style={{ fontSize: 12, color: T.gold, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}><FileText size={12} />{r.fileName}</button>}
                    </div>
                  </div>
                  {isAdmin && r.clientId === client.id && <div style={{ display: "flex", gap: 4 }}>
                    <button onClick={() => setReportModal(r)} style={{ background: T.bgInput, border: `1px solid ${T.border}`, borderRadius: 6, color: T.textMuted, cursor: "pointer", padding: 6 }}><Edit3 size={13} /></button>
                    <button onClick={() => handleDeleteReport(r.id)} style={{ background: T.danger + "12", border: `1px solid ${T.danger}33`, borderRadius: 6, color: T.danger, cursor: "pointer", padding: 6 }}><Trash2 size={13} /></button>
                  </div>}
                </div>
              </div>
            ))}
          </div>}
          <Modal open={!!reportModal} onClose={() => setReportModal(null)} title={reportModal && reportModal !== "new" ? "Editar Relatório" : "Novo Relatório"}>
            <ReportForm initial={reportModal !== "new" ? reportModal : null} onSave={handleSaveReport} onCancel={() => setReportModal(null)} />
          </Modal>
        </div>}
      </div>
    </div>
  );
}

// ─── Main App ───
export default function App() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(emptyData());
  const [auth, setAuth] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientValid, setNewClientValid] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [readNotifs, setReadNotifs] = useState(() => loadReadNotifs());
  const [clientTab, setClientTab] = useState("tarefas");
  const [adminTab, setAdminTab] = useState("tarefas");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem(SIDEBAR_KEY) === "1");

  const toggleSidebar = () => setSidebarCollapsed(v => { const next = !v; localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0"); return next; });

  const markNotifRead = (id) => setReadNotifs(prev => { const next = [...new Set([...prev, id])]; saveReadNotifs(next); return next; });
  const markAllNotifsRead = (items) => setReadNotifs(prev => { const next = [...new Set([...prev, ...items.map(n => n.id)])]; saveReadNotifs(next); return next; });
  const unreadNotifs = (items) => items.filter(n => !readNotifs.includes(n.id));

  useEffect(() => { loadData().then(d => { setData(d); setLoading(false); }); }, []);
  const persist = useCallback(async (nd) => { setData(nd); await saveData(nd); }, []);

  const handleLogin = (email, password) => {
    const admin = findAdmin(data, email, password);
    if (admin) {
      setAuth({ role: "admin", adminId: admin.id, adminName: admin.name, adminEmail: admin.email });
      return;
    }
    const client = Object.values(data.clients).find(c => c.email?.toLowerCase().trim() === email.toLowerCase().trim() && c.password === password);
    if (client) { setAuth({ role: "client", clientId: client.id }); return; }
    return false;
  };

  const handleSaveAdminName = (name) => {
    if (!auth?.adminId) return;
    const admins = (data.admins || DEFAULT_ADMINS).map(a => a.id === auth.adminId ? { ...a, name } : a);
    persist({ ...data, admins, adminName: name });
    setAuth(prev => ({ ...prev, adminName: name }));
  };

  const handleLogout = () => { setAuth(null); setSelectedClient(null); };
  const handleSaveClient = (client) => {
    const withAdmin = { ...client, adminId: client.adminId || auth?.adminId || "" };
    const nd = { ...data, clients: { ...data.clients, [withAdmin.id]: withAdmin } };
    if (!data.tasks[withAdmin.id]) nd.tasks = { ...data.tasks, [withAdmin.id]: [] };
    if (!data.reports[withAdmin.id]) nd.reports = { ...data.reports, [withAdmin.id]: [] };
    persist(nd);
    setShowNewClient(false);
    setSelectedClient(withAdmin.id);
  };
  const handleDeleteClient = (id) => { const { [id]: _, ...rc } = data.clients; const { [id]: _t, ...rt } = data.tasks; const { [id]: _r, ...rr } = data.reports; persist({ ...data, clients: rc, tasks: rt, reports: rr }); if (selectedClient === id) setSelectedClient(null); };
  const handleUpdateTasks = (cid, tasks, actorRole = "admin") => {
    const oldTasks = data.tasks[cid] || [];
    const company = data.clients[cid]?.company || "Cliente";
    const { events: newEvents, normalizedTasks } = buildTaskEvents(oldTasks, tasks, cid, company, actorRole);
    const events = [...newEvents, ...(data.events || [])].slice(0, 200);
    persist({ ...data, tasks: { ...data.tasks, [cid]: normalizedTasks }, events });
  };
  const handleUpdateReports = (cid, reports) => persist({ ...data, reports: { ...data.reports, [cid]: reports } });
  const handleAddLabel = (l) => { const ex = data.labels || DEFAULT_LABELS; if (!ex.find(x => x.id === l.id)) persist({ ...data, labels: [...ex, l] }); };
  const handleAddStatus = (s) => { const ex = data.statuses || DEFAULT_STATUSES; if (!ex.find(x => x.id === s.id)) persist({ ...data, statuses: [...ex, s] }); };
  const appLabels = data.labels || DEFAULT_LABELS;
  const appStatuses = data.statuses || DEFAULT_STATUSES;

  if (loading) return <div style={{ minHeight: "100vh", background: T.bg, display: "flex", alignItems: "center", justifyContent: "center" }}><Loader2 size={24} style={{ color: T.gold, animation: "spin 1s linear infinite" }} /></div>;
  if (!auth) return <LoginScreen onLogin={handleLogin} />;

  const adminClients = getClientsForAdmin(data.clients, auth?.adminId);

  // Client view
  if (auth.role === "client") {
    const client = data.clients[auth.clientId];
    if (!client) return <LoginScreen onLogin={handleLogin} />;
    const clientNotifs = unreadNotifs(getClientNotifications(data, client.id));
    return (
      <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column" }}>
        <Topbar showSidebarToggle={false} sidebarCollapsed={false} onToggleSidebar={() => {}} notifications={clientNotifs} onNotifSelect={(n) => { markNotifRead(n.id); if (n.tab) setClientTab(n.tab); }} onMarkAllRead={() => markAllNotifsRead(clientNotifs)} onLogout={handleLogout} />
        <ClientWorkspace client={client} tasks={data.tasks[client.id] || []} reports={data.reports[client.id] || []} isAdmin={false} labels={appLabels} statuses={appStatuses} onUpdateClient={handleSaveClient} onUpdateTasks={t => handleUpdateTasks(client.id, t, "client")} onUpdateReports={r => handleUpdateReports(client.id, r)} onAddLabel={handleAddLabel} onAddStatus={handleAddStatus} activeTab={clientTab} onTabChange={setClientTab} allClients={data.clients} />
      </div>
    );
  }

  // Admin
  const clientList = adminClients;
  const filtered = searchQ ? clientList.filter(c => c.company.toLowerCase().includes(searchQ.toLowerCase()) || c.name.toLowerCase().includes(searchQ.toLowerCase())) : clientList;
  const active = selectedClient ? data.clients[selectedClient] : null;
  const adminNotifs = unreadNotifs(getAdminNotifications(data));

  return (
    <div style={{ minHeight: "100vh", background: T.bg, display: "flex", flexDirection: "column" }}>
      <Topbar sidebarCollapsed={sidebarCollapsed} onToggleSidebar={toggleSidebar} notifications={adminNotifs} onNotifSelect={(n) => { markNotifRead(n.id); if (n.clientId) setSelectedClient(n.clientId); if (n.tab) setAdminTab(n.tab); }} onMarkAllRead={() => markAllNotifsRead(adminNotifs)} onLogout={handleLogout} onLogoClick={() => setSelectedClient(null)} largeLogo={!active} />
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Sidebar */}
        <aside style={{ width: sidebarCollapsed ? 56 : 260, borderRight: `1px solid ${T.border}`, display: "flex", flexDirection: "column", flexShrink: 0, background: T.bgCard, transition: "width .25s ease", overflow: "hidden" }}>
          <div style={{ padding: sidebarCollapsed ? 8 : "12px 8px 10px", display: "flex", flexDirection: "column", gap: 10 }}>
            {sidebarCollapsed ? (
              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                title="Painel"
                style={{ width: 40, height: 40, borderRadius: 8, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "center", background: !selectedClient ? T.goldDim : T.bgInput, border: !selectedClient ? `2px solid ${T.gold}` : `1px solid ${T.border}`, cursor: "pointer", color: !selectedClient ? T.gold : T.textSec }}
              >
                <LayoutDashboard size={16} strokeWidth={1.5} />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                style={{ width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 8, marginBottom: 2, background: !selectedClient ? T.goldDim : "transparent", border: "none", cursor: "pointer", borderLeft: !selectedClient ? `3px solid ${T.gold}` : "3px solid transparent", display: "flex", alignItems: "center", gap: 10, transition: "all .15s" }}
              >
                <LayoutDashboard size={15} strokeWidth={1.5} style={{ color: !selectedClient ? T.gold : T.textMuted, flexShrink: 0 }} />
                <span style={{ fontSize: 13, fontWeight: 500, color: !selectedClient ? T.gold : T.text }}>Painel</span>
              </button>
            )}
            {!sidebarCollapsed && <span style={{ fontSize: 10, fontWeight: 600, color: T.goldMuted, textTransform: "uppercase", letterSpacing: ".08em", padding: "0 12px", marginBottom: 4, marginTop: 4 }}>Clientes</span>}
            {sidebarCollapsed ? (
              <button onClick={() => setShowNewClient(true)} title="Novo Cliente" style={{ width: 40, height: 40, borderRadius: 8, background: `linear-gradient(135deg, ${T.goldLight}, ${T.gold})`, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", boxShadow: `0 2px 8px ${T.gold}22` }}>
                <Plus size={16} style={{ color: T.bg }} strokeWidth={2} />
              </button>
            ) : (
              <>
                <Btn variant="outline" style={{ width: "100%" }} size="sm" onClick={() => setShowNewClient(true)}><Plus size={13} /> Novo Cliente</Btn>
                <div style={{ position: "relative" }}>
                  <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.textMuted }} strokeWidth={1.5} />
                  <input value={searchQ} onChange={e => setSearchQ(e.target.value)} placeholder="Buscar cliente..." style={{ width: "100%", background: T.bgInput, border: `1px solid ${T.border}`, borderRadius: 8, padding: "8px 10px 8px 32px", fontSize: 12, color: T.text, outline: "none", fontFamily: FONT.sans }} />
                </div>
              </>
            )}
          </div>
          <div style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: sidebarCollapsed ? "0 8px 14px" : "0 8px 14px" }}>
            {filtered.length === 0 ? !sidebarCollapsed && <p style={{ textAlign: "center", color: T.textMuted, fontSize: 12, padding: 24 }}>Nenhum cliente</p>
            : filtered.sort((a, b) => a.company.localeCompare(b.company)).map(c => {
              const tc = (data.tasks[c.id] || []).filter(t => t.status !== "done").length;
              const sel = selectedClient === c.id;
              if (sidebarCollapsed) {
                return (
                  <button key={c.id} onClick={() => setSelectedClient(c.id)} title={`${c.company}${c.nicho ? ` · ${c.nicho}` : ""}`} style={{ width: 40, height: 40, borderRadius: 8, margin: "0 auto 6px", display: "flex", alignItems: "center", justifyContent: "center", background: sel ? T.goldDim : T.bgInput, border: sel ? `2px solid ${T.gold}` : `1px solid ${T.border}`, cursor: "pointer", position: "relative" }}>
                    <span style={{ color: sel ? T.gold : T.textSec, fontWeight: 700, fontSize: 14 }}>{(c.company || "?")[0].toUpperCase()}</span>
                    {tc > 0 && <span style={{ position: "absolute", top: -4, right: -4, minWidth: 14, height: 14, borderRadius: 99, background: T.danger, color: "#fff", fontSize: 9, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{tc > 9 ? "9+" : tc}</span>}
                  </button>
                );
              }
              return <button key={c.id} onClick={() => setSelectedClient(c.id)} style={{ width: "100%", textAlign: "left", padding: "10px 12px", borderRadius: 8, marginBottom: 2, background: sel ? T.goldDim : "transparent", border: "none", cursor: "pointer", borderLeft: sel ? `3px solid ${T.gold}` : "3px solid transparent", transition: "all .15s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: sel ? T.gold : T.text, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.company}</p>
                    <p style={{ fontSize: 11, color: T.textMuted, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.nicho ? `${c.nicho} · ` : ""}{c.name}</p>
                  </div>
                  {tc > 0 && <span style={{ fontSize: 10, background: T.bgInput, color: T.textMuted, padding: "1px 6px", borderRadius: 99, flexShrink: 0 }}>{tc}</span>}
                </div>
              </button>;
            })}
          </div>
        </aside>
        {/* Main */}
        <main style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {active ? <ClientWorkspace client={active} tasks={data.tasks[active.id] || []} reports={data.reports[active.id] || []} isAdmin={true} labels={appLabels} statuses={appStatuses} onUpdateClient={handleSaveClient} onUpdateTasks={t => handleUpdateTasks(active.id, t)} onUpdateReports={r => handleUpdateReports(active.id, r)} onAddLabel={handleAddLabel} onAddStatus={handleAddStatus} onDeleteClient={handleDeleteClient} activeTab={adminTab} onTabChange={setAdminTab} onGoHome={() => setSelectedClient(null)} adminClients={adminClients} allClients={data.clients} allReports={data.reports} />
          : <AdminDashboard data={data} onSelectClient={(id, tab) => { setSelectedClient(id); if (tab) setAdminTab(tab); }} onNewClient={() => setShowNewClient(true)} onUpdateData={persist} statuses={appStatuses} adminId={auth.adminId} displayName={auth.adminName} onSaveDisplayName={handleSaveAdminName} />}
        </main>
      </div>
      <Modal
        open={showNewClient}
        onClose={() => setShowNewClient(false)}
        title="Onboarding — Novo Cliente"
        wide
        footer={
          <>
            <Btn variant="secondary" onClick={() => setShowNewClient(false)}>Cancelar</Btn>
            <Btn type="submit" form="new-client-form" disabled={!newClientValid}>Criar Cliente</Btn>
          </>
        }
      >
        <ClientForm
          formId="new-client-form"
          hideActions
          onValidityChange={setNewClientValid}
          onSave={c => { handleSaveClient(c); setShowNewClient(false); }}
          onCancel={() => setShowNewClient(false)}
        />
      </Modal>
    </div>
  );
}
