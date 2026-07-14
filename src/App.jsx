import React, { useState, useMemo, useRef, useEffect } from "react";
import {
  Home, Plus, Search, X, ChevronDown, ChevronRight, MoreHorizontal,
  Table, LayoutGrid, BarChart3, Trash2, Calendar, User, MessageCircle,
  Star, Filter, Pencil, Send, GripVertical, CheckCircle2, Zap, Hash,
  Type, CheckSquare, List, RotateCcw, Cloud, HardDrive,
} from "lucide-react";
import {
  PieChart, Pie, Cell as ReCell, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";

/* ---------------- constants ---------------- */

const STATUSES = [
  { id: "working", label: "Working on it", color: "#FDAB3D" },
  { id: "done", label: "Done", color: "#00C875" },
  { id: "stuck", label: "Stuck", color: "#E2445C" },
  { id: "review", label: "In Review", color: "#579BFC" },
  { id: "not_started", label: "Not Started", color: "#C4C4C4" },
];

const PRIORITIES = [
  { id: "critical", label: "Critical ⚠", color: "#333333" },
  { id: "high", label: "High", color: "#401694" },
  { id: "medium", label: "Medium", color: "#5559DF" },
  { id: "low", label: "Low", color: "#579BFC" },
];

const PEOPLE = [
  { id: "p1", name: "Ava Torres", initials: "AT", color: "#FF642E" },
  { id: "p2", name: "Ben Okafor", initials: "BO", color: "#00A9B5" },
  { id: "p3", name: "Carla Nguyen", initials: "CN", color: "#A25DDC" },
  { id: "p4", name: "Dev Patel", initials: "DP", color: "#037F4C" },
  { id: "p5", name: "Erin Walsh", initials: "EW", color: "#FFCB00" },
];

const GROUP_COLORS = ["#579BFC", "#00C875", "#A25DDC", "#FDAB3D", "#E2445C", "#66CCFF", "#FF642E", "#037F4C"];
const OPTION_COLORS = ["#00C875", "#FDAB3D", "#E2445C", "#579BFC", "#A25DDC", "#66CCFF", "#FF642E", "#7F5347"];

const uid = (p) => `${p}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/* Column model. Built-in columns read/write item fields; custom columns use item.values[col.id]. */
const defaultColumns = () => ([
  { id: "owners", title: "Owner", type: "person", builtin: true },
  { id: "status", title: "Status", type: "status", builtin: true },
  { id: "priority", title: "Priority", type: "priority", builtin: true },
  { id: "dueDate", title: "Due date", type: "date", builtin: true },
  { id: "notes", title: "Notes", type: "text", builtin: true },
]);

const COLUMN_TYPES = [
  { type: "text", label: "Text", icon: Type },
  { type: "number", label: "Number", icon: Hash },
  { type: "date", label: "Date", icon: Calendar },
  { type: "checkbox", label: "Checkbox", icon: CheckSquare },
  { type: "dropdown", label: "Dropdown", icon: List },
];

const COL_WIDTH = {
  person: "120px", status: "140px", priority: "130px", date: "116px",
  text: "minmax(130px,1fr)", number: "104px", checkbox: "76px", dropdown: "144px",
};

const gridStyle = (columns) => ({
  display: "grid",
  gridTemplateColumns: `36px minmax(220px,2fr) ${columns.map((c) => COL_WIDTH[c.type] || "120px").join(" ")} 44px`,
});

/* ---------------- storage adapter ----------------
   Preference order:
   1. window.storage  – Claude artifact persistent storage (works in this preview)
   2. localStorage    – when running locally (Vite dev server, static file)
   3. in-memory only  – nothing available; app still works, just doesn't persist */

const STORE_KEY = "workday-appdata";

const store = {
  async load() {
    if (typeof window !== "undefined" && window.storage) {
      try {
        const r = await window.storage.get(STORE_KEY);
        return { data: r?.value ? JSON.parse(r.value) : null, mode: "artifact" };
      } catch { return { data: null, mode: "artifact" }; }
    }
    try {
      const v = window.localStorage.getItem(STORE_KEY);
      return { data: v ? JSON.parse(v) : null, mode: "local" };
    } catch { return { data: null, mode: "memory" }; }
  },
  async save(data) {
    const s = JSON.stringify(data);
    if (typeof window !== "undefined" && window.storage) {
      try { await window.storage.set(STORE_KEY, s); return "artifact"; } catch { return "memory"; }
    }
    try { window.localStorage.setItem(STORE_KEY, s); return "local"; } catch { return "memory"; }
  },
  async clear() {
    if (typeof window !== "undefined" && window.storage) { try { await window.storage.delete(STORE_KEY); } catch {} }
    try { window.localStorage.removeItem(STORE_KEY); } catch {}
  },
};

/* ---------------- seed data ---------------- */

const item = (name, owners, status, priority, dueDate, notes = "", updates = []) => ({
  id: uid("i"), name, owners, status, priority, dueDate, notes, values: {}, updates,
});

const seedBoards = () => {
  const budgetCol = { id: uid("c"), title: "Budget ($)", type: "number" };
  const channelCol = {
    id: uid("c"), title: "Channel", type: "dropdown",
    options: [
      { id: "email", label: "Email", color: "#579BFC" },
      { id: "social", label: "Social", color: "#A25DDC" },
      { id: "events", label: "Events", color: "#FF642E" },
    ],
  };
  const b2g1 = [
    item("Summer webinar series", ["p3"], "working", "medium", "2026-07-22", "3 sessions confirmed"),
    item("Case study: Acme Corp", ["p5"], "review", "high", "2026-07-15", ""),
    item("Refresh landing page copy", ["p3", "p1"], "not_started", "low", "2026-07-29", ""),
  ];
  b2g1[0].values = { [budgetCol.id]: 4500, [channelCol.id]: "events" };
  b2g1[1].values = { [budgetCol.id]: 1200, [channelCol.id]: "email" };
  b2g1[2].values = { [channelCol.id]: "social" };
  const b2g2 = [
    item("Weekly newsletter", ["p3"], "working", "medium", "2026-07-10", "Goes out Thursdays"),
    item("SEO content calendar", ["p5"], "done", "low", "2026-07-01", ""),
  ];
  b2g2[0].values = { [budgetCol.id]: 300, [channelCol.id]: "email" };

  const b1 = {
    id: "b1", name: "Product Roadmap 2026", starred: true,
    columns: defaultColumns(), automations: [],
    groups: [
      {
        id: uid("g"), name: "This Sprint", color: "#579BFC", collapsed: false,
        items: [
          item("Redesign onboarding flow", ["p1", "p3"], "working", "high", "2026-07-14", "Figma link in updates",
            [{ id: uid("u"), author: "p3", text: "First draft of the new welcome screens is ready for review.", time: "Yesterday, 4:12 PM" }]),
          item("Fix billing webhook retries", ["p2"], "stuck", "critical", "2026-07-09", "Blocked on vendor response"),
          item("Ship dark mode toggle", ["p4"], "review", "medium", "2026-07-11", ""),
          item("Mobile push notifications", ["p1", "p2"], "working", "high", "2026-07-17", "iOS first, Android next sprint"),
        ],
      },
      {
        id: uid("g"), name: "Backlog", color: "#A25DDC", collapsed: false,
        items: [
          item("Self-serve data export", ["p5"], "not_started", "low", "2026-08-03", ""),
          item("Audit log for admins", [], "not_started", "medium", "2026-08-10", "Needs security review first"),
          item("Zapier integration v2", ["p4"], "not_started", "low", "2026-08-21", ""),
        ],
      },
      {
        id: uid("g"), name: "Done", color: "#00C875", collapsed: false,
        items: [
          item("SSO with Okta", ["p2", "p5"], "done", "critical", "2026-06-28", "Shipped in 4.2"),
          item("Rate-limit public API", ["p2"], "done", "high", "2026-06-30", ""),
        ],
      },
    ],
  };
  // Example automation that ships enabled: when status → Done, move the item into the Done group.
  b1.automations = [{
    id: uid("a"), active: true,
    trigger: { type: "status_changes_to", status: "done" },
    action: { type: "move_to_group", groupId: b1.groups[2].id },
  }];

  return [
    b1,
    {
      id: "b2", name: "Marketing Campaigns", starred: false,
      columns: [...defaultColumns(), budgetCol, channelCol], automations: [],
      groups: [
        { id: uid("g"), name: "Q3 Launches", color: "#FDAB3D", collapsed: false, items: b2g1 },
        { id: uid("g"), name: "Always On", color: "#66CCFF", collapsed: false, items: b2g2 },
      ],
    },
    {
      id: "b3", name: "Hiring Pipeline", starred: false,
      columns: defaultColumns(), automations: [],
      groups: [
        {
          id: uid("g"), name: "Engineering", color: "#037F4C", collapsed: false,
          items: [
            item("Senior Backend – final round", ["p2"], "working", "high", "2026-07-08", "Panel of 3"),
            item("Platform Eng – sourcing", ["p1"], "not_started", "medium", "2026-07-20", ""),
          ],
        },
        {
          id: uid("g"), name: "Design", color: "#FF642E", collapsed: false,
          items: [item("Product Designer – offer out", ["p3"], "done", "critical", "2026-07-06", "Offer expires Friday")],
        },
      ],
    },
  ];
};

/* Normalize boards loaded from storage (including saves from v1 without columns/automations). */
const normalizeBoards = (boards) =>
  (Array.isArray(boards) ? boards : []).map((b) => ({
    ...b,
    columns: Array.isArray(b.columns) && b.columns.length ? b.columns : defaultColumns(),
    automations: Array.isArray(b.automations) ? b.automations : [],
    groups: (b.groups || []).map((g) => ({
      ...g,
      items: (g.items || []).map((i) => ({ ...i, values: i.values || {}, updates: i.updates || [], owners: i.owners || [] })),
    })),
  }));

/* ---------------- helpers ---------------- */

const statusOf = (id) => STATUSES.find((s) => s.id === id) || STATUSES[4];
const priorityOf = (id) => PRIORITIES.find((p) => p.id === id) || PRIORITIES[2];
const personOf = (id) => PEOPLE.find((p) => p.id === id);

const fmtDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const isOverdue = (it) => it.dueDate && it.status !== "done" && new Date(it.dueDate + "T23:59:59") < new Date();

const todayISO = () => new Date().toISOString().slice(0, 10);
const nowStamp = () => new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

/* value access that works for built-in and custom columns */
const getVal = (it, col) => (col.builtin ? it[col.id] : (it.values || {})[col.id]);
const setValPatch = (it, col, v) =>
  col.builtin ? { [col.id]: v } : { values: { ...(it.values || {}), [col.id]: v } };

/* ---------------- primitives ---------------- */

function Avatar({ personId, size = 28, ring = false }) {
  if (personId === "auto") {
    return (
      <div className={`rounded-full flex items-center justify-center text-white ${ring ? "ring-2 ring-white" : ""}`}
        style={{ width: size, height: size, background: "#6161FF" }} title="Automation">
        <Zap size={Math.round(size * 0.55)} />
      </div>
    );
  }
  const p = personOf(personId);
  if (!p) return null;
  return (
    <div
      title={p.name}
      className={`rounded-full flex items-center justify-center text-white font-semibold select-none ${ring ? "ring-2 ring-white" : ""}`}
      style={{ width: size, height: size, background: p.color, fontSize: size * 0.38 }}
    >
      {p.initials}
    </div>
  );
}

function Popover({ open, onClose, children, align = "left", width = 260 }) {
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); onClose(); }} />
      <div
        className={`absolute z-50 mt-1 bg-white rounded-lg shadow-xl border border-gray-200 ${align === "right" ? "right-0" : "left-0"}`}
        style={{ width, top: "100%" }}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </>
  );
}

/* ---------------- cells ---------------- */

function LabelCell({ value, options, onChange, fallback }) {
  const [open, setOpen] = useState(false);
  const opt = options.find((o) => o.id === value) || fallback || null;
  return (
    <div className="relative h-full">
      <button
        className="w-full h-full flex items-center justify-center text-xs font-medium transition-opacity hover:opacity-90"
        style={opt ? { background: opt.color, color: "#fff" } : {}}
        onClick={() => setOpen(true)}
      >
        {opt ? opt.label : <span className="text-gray-300">—</span>}
      </button>
      <Popover open={open} onClose={() => setOpen(false)} width={200}>
        <div className="p-2 grid gap-1">
          {options.map((o) => (
            <button key={o.id} className="h-8 rounded text-white text-xs font-medium hover:opacity-90"
              style={{ background: o.color }}
              onClick={() => { onChange(o.id); setOpen(false); }}>
              {o.label}
            </button>
          ))}
          {!options.length && <p className="text-xs text-gray-400 p-2">No options defined.</p>}
          {value && (
            <button className="h-7 rounded text-xs text-gray-500 hover:bg-gray-100"
              onClick={() => { onChange(null); setOpen(false); }}>Clear</button>
          )}
        </div>
      </Popover>
    </div>
  );
}

function PersonCell({ owners, onChange }) {
  const [open, setOpen] = useState(false);
  const list = owners || [];
  const toggle = (pid) => onChange(list.includes(pid) ? list.filter((o) => o !== pid) : [...list, pid]);
  return (
    <div className="relative h-full">
      <button className="w-full h-full flex items-center justify-center hover:bg-gray-50" onClick={() => setOpen(true)}>
        {list.length === 0 ? (
          <span className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 flex items-center justify-center text-gray-300">
            <User size={14} />
          </span>
        ) : (
          <span className="flex -space-x-2">
            {list.slice(0, 3).map((pid) => <Avatar key={pid} personId={pid} ring />)}
            {list.length > 3 && (
              <span className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 text-xs flex items-center justify-center ring-2 ring-white">+{list.length - 3}</span>
            )}
          </span>
        )}
      </button>
      <Popover open={open} onClose={() => setOpen(false)} width={230}>
        <div className="p-2">
          <p className="text-xs text-gray-400 px-2 pb-1">Assign people</p>
          {PEOPLE.map((p) => (
            <button key={p.id}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 text-sm text-gray-700"
              onClick={() => toggle(p.id)}>
              <Avatar personId={p.id} size={24} />
              <span className="flex-1 text-left">{p.name}</span>
              {list.includes(p.id) && <CheckCircle2 size={16} className="text-blue-500" />}
            </button>
          ))}
        </div>
      </Popover>
    </div>
  );
}

function DateCell({ value, done, overdue, onChange }) {
  const ref = useRef(null);
  return (
    <button
      className={`w-full h-full flex items-center justify-center gap-1 text-xs hover:bg-gray-50 ${overdue ? "text-red-500 font-semibold" : "text-gray-600"}`}
      onClick={() => (ref.current?.showPicker ? ref.current.showPicker() : ref.current?.click())}
    >
      <Calendar size={12} className="text-gray-400" />
      {value ? fmtDate(value) : <span className="text-gray-300">Set date</span>}
      {done && value && <CheckCircle2 size={12} className="text-green-500" />}
      <input ref={ref} type="date" value={value || ""} onChange={(e) => onChange(e.target.value)}
        className="absolute w-0 h-0 opacity-0" tabIndex={-1} />
    </button>
  );
}

function TextCell({ value, onChange, placeholder = "Add note", align = "left" }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  useEffect(() => setDraft(value ?? ""), [value]);
  if (editing) {
    return (
      <input autoFocus value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => { onChange(draft); setEditing(false); }}
        onKeyDown={(e) => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") { setDraft(value ?? ""); setEditing(false); } }}
        className="w-full h-full px-2 text-xs border-2 border-blue-400 rounded outline-none" />
    );
  }
  return (
    <button className={`w-full h-full px-2 text-xs text-gray-600 truncate hover:bg-gray-50 ${align === "center" ? "text-center" : "text-left"}`}
      onClick={() => setEditing(true)}>
      {value || value === 0 ? String(value) : <span className="text-gray-300">{placeholder}</span>}
    </button>
  );
}

function NumberCell({ value, onChange }) {
  return (
    <TextCell
      value={value ?? ""}
      align="center"
      placeholder="0"
      onChange={(v) => {
        const n = parseFloat(String(v).replace(/,/g, ""));
        onChange(Number.isFinite(n) ? n : null);
      }}
    />
  );
}

function CheckboxCell({ value, onChange }) {
  return (
    <label className="w-full h-full flex items-center justify-center cursor-pointer hover:bg-gray-50">
      <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4 accent-green-600 cursor-pointer" />
    </label>
  );
}

/* One switch used by the table so every column type renders consistently. */
function CellSwitch({ col, it, onPatch }) {
  const v = getVal(it, col);
  const set = (nv) => onPatch(setValPatch(it, col, nv));
  switch (col.type) {
    case "person": return <PersonCell owners={v} onChange={set} />;
    case "status": return <LabelCell value={v} options={STATUSES} onChange={set} fallback={statusOf(v)} />;
    case "priority": return <LabelCell value={v} options={PRIORITIES} onChange={set} fallback={priorityOf(v)} />;
    case "date":
      return <DateCell value={v} done={col.id === "dueDate" && it.status === "done"}
        overdue={col.id === "dueDate" && isOverdue(it)} onChange={set} />;
    case "number": return <NumberCell value={v} onChange={set} />;
    case "checkbox": return <CheckboxCell value={v} onChange={set} />;
    case "dropdown": return <LabelCell value={v} options={col.options || []} onChange={set} />;
    default: return <TextCell value={v} onChange={set} />;
  }
}

/* ---------------- automation engine ----------------
   Pure functions over a board object so every mutation path (table edits,
   kanban drag, item creation) runs through the same rules. */

const autoLog = (text) => ({ id: uid("u"), author: "auto", text, time: `Today, ${nowStamp()}` });

function applyActionToBoard(board, itemId, action) {
  const groups = board.groups;
  const findItem = () => groups.flatMap((g) => g.items).find((i) => i.id === itemId);
  const it = findItem();
  if (!it) return board;

  const patchItemIn = (patch, logText) => ({
    ...board,
    groups: groups.map((g) => ({
      ...g,
      items: g.items.map((i) =>
        i.id === itemId ? { ...i, ...patch, updates: logText ? [...i.updates, autoLog(logText)] : i.updates } : i),
    })),
  });

  switch (action.type) {
    case "move_to_group": {
      const target = groups.find((g) => g.id === action.groupId);
      if (!target || target.items.some((i) => i.id === itemId)) return board;
      const moved = { ...it, updates: [...it.updates, autoLog(`Automation moved this item to "${target.name}".`)] };
      return {
        ...board,
        groups: groups.map((g) => {
          if (g.id === target.id) return { ...g, items: [...g.items, moved] };
          return { ...g, items: g.items.filter((i) => i.id !== itemId) };
        }),
      };
    }
    case "set_priority":
      return patchItemIn({ priority: action.priority }, `Automation set priority to "${priorityOf(action.priority).label}".`);
    case "assign_person": {
      const owners = it.owners.includes(action.personId) ? it.owners : [...it.owners, action.personId];
      return patchItemIn({ owners }, `Automation assigned ${personOf(action.personId)?.name || "someone"}.`);
    }
    case "set_date_today":
      return patchItemIn({ dueDate: todayISO() }, "Automation set the due date to today.");
    case "post_update":
      return patchItemIn({}, action.text || "Automation update.");
    default:
      return board;
  }
}

function runAutomations(board, itemId, event) {
  let b = board;
  for (const a of board.automations || []) {
    if (!a.active) continue;
    const t = a.trigger;
    const match =
      (t.type === "status_changes_to" && event.type === "status_change" && event.status === t.status) ||
      (t.type === "item_created" && event.type === "created");
    if (match) b = applyActionToBoard(b, itemId, a.action);
  }
  return b;
}

const describeTrigger = (t) =>
  t.type === "item_created" ? "When an item is created" : `When status changes to "${statusOf(t.status).label}"`;

const describeAction = (a, board) => {
  switch (a.type) {
    case "move_to_group": return `move it to "${board.groups.find((g) => g.id === a.groupId)?.name || "a group"}"`;
    case "set_priority": return `set priority to "${priorityOf(a.priority).label}"`;
    case "assign_person": return `assign ${personOf(a.personId)?.name || "someone"}`;
    case "set_date_today": return "set the due date to today";
    case "post_update": return `post the update "${a.text}"`;
    default: return "do nothing";
  }
};

/* ---------------- table view ---------------- */

function ItemRow({ it, columns, groupColor, selected, onSelect, onPatch, onDelete, onOpen }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className={`border-b border-gray-100 text-sm ${selected ? "bg-blue-50" : "bg-white"}`}
      style={{ ...gridStyle(columns), minHeight: 36 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div className="flex items-center justify-center border-r border-gray-100" style={{ boxShadow: `inset 3px 0 0 ${groupColor}` }}>
        <input type="checkbox" checked={selected} onChange={onSelect} className="accent-blue-600 cursor-pointer" />
      </div>
      <div className="flex items-center gap-1 border-r border-gray-100 pl-2 pr-1 min-w-0">
        <span className="flex-1 min-w-0 h-full"><TextCell value={it.name} onChange={(v) => v.trim() && onPatch({ name: v })} placeholder="Item name" /></span>
        <button
          className={`flex items-center gap-0.5 text-gray-400 hover:text-blue-600 px-1 ${hover || it.updates.length ? "opacity-100" : "opacity-0"}`}
          onClick={onOpen} title="Open updates">
          <MessageCircle size={15} />
          {it.updates.length > 0 && <span className="text-[10px] font-semibold">{it.updates.length}</span>}
        </button>
        <button className={`text-gray-300 hover:text-red-500 px-1 ${hover ? "opacity-100" : "opacity-0"}`} onClick={onDelete} title="Delete item">
          <Trash2 size={14} />
        </button>
      </div>
      {columns.map((col) => (
        <div key={col.id} className="border-r border-gray-100 relative">
          <CellSwitch col={col} it={it} onPatch={onPatch} />
        </div>
      ))}
      <div />
    </div>
  );
}

function ColumnHeaderCell({ col, onRename, onDelete }) {
  const [menu, setMenu] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [title, setTitle] = useState(col.title);
  useEffect(() => setTitle(col.title), [col.title]);
  return (
    <div className="px-2 py-1.5 border-r border-gray-200 text-center relative group/col flex items-center justify-center gap-1">
      {renaming ? (
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
          onBlur={() => { setRenaming(false); title.trim() && onRename(title.trim()); }}
          onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
          className="w-full text-xs border border-blue-400 rounded px-1 outline-none text-center" />
      ) : (
        <>
          <span className="truncate">{col.title}</span>
          {!col.builtin && (
            <button className="opacity-0 group-hover/col:opacity-100 text-gray-400 hover:text-gray-700" onClick={() => setMenu(true)}>
              <MoreHorizontal size={13} />
            </button>
          )}
        </>
      )}
      <Popover open={menu} onClose={() => setMenu(false)} width={170}>
        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
          onClick={() => { setMenu(false); setRenaming(true); }}>
          <Pencil size={13} /> Rename column
        </button>
        <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50"
          onClick={() => { setMenu(false); onDelete(); }}>
          <Trash2 size={13} /> Delete column
        </button>
      </Popover>
    </div>
  );
}

function AddColumnButton({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState(null); // null | column type being configured
  const [title, setTitle] = useState("");
  const [opts, setOpts] = useState("");
  const reset = () => { setOpen(false); setStage(null); setTitle(""); setOpts(""); };
  const create = () => {
    if (!title.trim()) return;
    const col = { id: uid("c"), title: title.trim(), type: stage };
    if (stage === "dropdown") {
      const labels = opts.split(",").map((s) => s.trim()).filter(Boolean);
      col.options = (labels.length ? labels : ["Option 1", "Option 2"]).map((label, i) => ({
        id: uid("o"), label, color: OPTION_COLORS[i % OPTION_COLORS.length],
      }));
    }
    onAdd(col);
    reset();
  };
  return (
    <div className="relative flex items-center justify-center">
      <button className="text-gray-400 hover:text-indigo-600 p-1" title="Add column" onClick={() => setOpen(true)}>
        <Plus size={15} />
      </button>
      <Popover open={open} onClose={reset} align="right" width={240}>
        {!stage ? (
          <div className="p-2">
            <p className="text-xs text-gray-400 px-2 pb-1">Add column</p>
            {COLUMN_TYPES.map((t) => (
              <button key={t.type} className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 text-sm text-gray-700"
                onClick={() => setStage(t.type)}>
                <t.icon size={14} className="text-indigo-500" /> {t.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="p-3">
            <p className="text-xs font-semibold text-gray-500 mb-2">New {COLUMN_TYPES.find((t) => t.type === stage)?.label.toLowerCase()} column</p>
            <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && stage !== "dropdown" && create()}
              placeholder="Column name"
              className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 outline-none focus:border-indigo-400 mb-2" />
            {stage === "dropdown" && (
              <input value={opts} onChange={(e) => setOpts(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && create()}
                placeholder="Options, comma separated"
                className="w-full text-sm border border-gray-300 rounded px-2 py-1.5 outline-none focus:border-indigo-400 mb-2" />
            )}
            <div className="flex justify-end gap-2">
              <button className="text-xs text-gray-500 px-2 py-1 hover:bg-gray-100 rounded" onClick={reset}>Cancel</button>
              <button className="text-xs text-white rounded px-3 py-1.5 disabled:opacity-50" style={{ background: "#6161FF" }}
                disabled={!title.trim()} onClick={create}>Add column</button>
            </div>
          </div>
        )}
      </Popover>
    </div>
  );
}

function GroupSection({ group, columns, selectedIds, onToggleSelect, onGroupChange, onDeleteGroup,
  onItemPatch, onItemDelete, onAddItem, onOpenItem, onAddColumn, onRenameColumn, onDeleteColumn }) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(group.name);
  const [newItem, setNewItem] = useState("");
  const [menu, setMenu] = useState(false);
  useEffect(() => setName(group.name), [group.name]);

  const total = group.items.length;
  const statusDist = STATUSES.map((s) => ({ ...s, n: group.items.filter((i) => i.status === s.id).length })).filter((s) => s.n > 0);
  const donePct = total ? Math.round((group.items.filter((i) => i.status === "done").length / total) * 100) : 0;
  const numberSum = (col) => group.items.reduce((acc, i) => acc + (Number(getVal(i, col)) || 0), 0);

  return (
    <div className="mb-6">
      <div className="flex items-center gap-1.5 mb-1 group/hdr relative">
        <button onClick={() => onGroupChange({ collapsed: !group.collapsed })} style={{ color: group.color }} className="p-0.5">
          {group.collapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
        </button>
        {renaming ? (
          <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
            onBlur={() => { setRenaming(false); name.trim() && onGroupChange({ name }); }}
            onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
            className="text-base font-semibold border-2 border-blue-400 rounded px-1 outline-none"
            style={{ color: group.color }} />
        ) : (
          <button className="text-base font-semibold hover:bg-gray-100 rounded px-1" style={{ color: group.color }} onClick={() => setRenaming(true)}>
            {group.name}
          </button>
        )}
        <span className="text-xs text-gray-400">{total} item{total === 1 ? "" : "s"} · {donePct}% done</span>
        <div className="relative">
          <button className="opacity-0 group-hover/hdr:opacity-100 text-gray-400 hover:text-gray-700 p-1" onClick={() => setMenu(true)}>
            <MoreHorizontal size={16} />
          </button>
          <Popover open={menu} onClose={() => setMenu(false)} width={180}>
            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100" onClick={() => { setMenu(false); setRenaming(true); }}>
              <Pencil size={14} /> Rename group
            </button>
            <button className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50" onClick={() => { setMenu(false); onDeleteGroup(); }}>
              <Trash2 size={14} /> Delete group
            </button>
          </Popover>
        </div>
      </div>

      {!group.collapsed && (
        <div className="rounded-lg overflow-visible border border-gray-200">
          <div className="bg-gray-50 text-xs font-medium text-gray-500 border-b border-gray-200" style={gridStyle(columns)}>
            <div className="border-r border-gray-200" style={{ boxShadow: `inset 3px 0 0 ${group.color}`, borderTopLeftRadius: 8 }} />
            <div className="px-3 py-1.5 border-r border-gray-200 flex items-center">Item</div>
            {columns.map((col) => (
              <ColumnHeaderCell key={col.id} col={col}
                onRename={(t) => onRenameColumn(col.id, t)}
                onDelete={() => onDeleteColumn(col.id)} />
            ))}
            <AddColumnButton onAdd={onAddColumn} />
          </div>

          {group.items.map((it) => (
            <ItemRow key={it.id} it={it} columns={columns} groupColor={group.color}
              selected={selectedIds.has(it.id)}
              onSelect={() => onToggleSelect(it.id)}
              onPatch={(patch) => onItemPatch(it.id, patch)}
              onDelete={() => onItemDelete(it.id)}
              onOpen={() => onOpenItem(it.id)} />
          ))}

          <div className="flex items-center border-b border-gray-100" style={{ boxShadow: `inset 3px 0 0 ${group.color}66` }}>
            <span className="w-9" />
            <input value={newItem} onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && newItem.trim()) { onAddItem(newItem.trim()); setNewItem(""); } }}
              placeholder="+ Add item"
              className="flex-1 text-sm px-2 py-2 outline-none placeholder-gray-400 focus:bg-blue-50 rounded" />
            {newItem.trim() && (
              <button className="text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded px-3 py-1 mr-2"
                onClick={() => { onAddItem(newItem.trim()); setNewItem(""); }}>
                Add
              </button>
            )}
          </div>

          {total > 0 && (
            <div style={gridStyle(columns)} className="text-xs">
              <div /><div />
              {columns.map((col) => {
                if (col.type === "status") {
                  return (
                    <div key={col.id} className="px-2 py-1.5">
                      <div className="flex h-5 rounded overflow-hidden">
                        {statusDist.map((s) => (
                          <div key={s.id} title={`${s.label}: ${s.n}/${total}`}
                            style={{ background: s.color, width: `${(s.n / total) * 100}%` }} className="hover:opacity-80" />
                        ))}
                      </div>
                    </div>
                  );
                }
                if (col.type === "number") {
                  return (
                    <div key={col.id} className="px-2 py-1.5 text-center font-semibold text-gray-600 bg-gray-50 rounded m-0.5"
                      title={`Sum of ${col.title}`}>
                      {numberSum(col).toLocaleString()}
                    </div>
                  );
                }
                return <div key={col.id} />;
              })}
              <div />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ---------------- kanban view ---------------- */

function KanbanView({ board, onItemPatch, onOpenItem }) {
  const [dragId, setDragId] = useState(null);
  const [over, setOver] = useState(null);
  const customCols = board.columns.filter((c) => !c.builtin).slice(0, 2);
  const allItems = board.groups.flatMap((g) => g.items.map((i) => ({ ...i, groupName: g.name, groupColor: g.color })));

  const chip = (it, col) => {
    const v = getVal(it, col);
    if (v === undefined || v === null || v === "" || v === false) return null;
    if (col.type === "dropdown") {
      const o = (col.options || []).find((x) => x.id === v);
      if (!o) return null;
      return <span key={col.id} className="text-[10px] text-white px-1.5 py-0.5 rounded" style={{ background: o.color }}>{o.label}</span>;
    }
    if (col.type === "checkbox") {
      return <span key={col.id} className="text-[10px] text-green-700 bg-green-100 px-1.5 py-0.5 rounded">✓ {col.title}</span>;
    }
    return <span key={col.id} className="text-[10px] text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">{col.title}: {col.type === "date" ? fmtDate(v) : String(v)}</span>;
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 h-full items-start">
      {STATUSES.map((s) => {
        const items = allItems.filter((i) => i.status === s.id);
        return (
          <div key={s.id}
            className={`w-72 shrink-0 rounded-lg bg-gray-100 flex flex-col max-h-full ${over === s.id ? "ring-2 ring-blue-400" : ""}`}
            onDragOver={(e) => { e.preventDefault(); setOver(s.id); }}
            onDragLeave={() => setOver(null)}
            onDrop={() => { if (dragId) onItemPatch(dragId, { status: s.id }); setDragId(null); setOver(null); }}>
            <div className="rounded-t-lg px-3 py-2 text-white text-sm font-semibold flex justify-between" style={{ background: s.color }}>
              <span>{s.label}</span><span className="opacity-90">{items.length}</span>
            </div>
            <div className="p-2 flex flex-col gap-2 overflow-y-auto">
              {items.map((it) => (
                <div key={it.id} draggable
                  onDragStart={() => setDragId(it.id)}
                  onClick={() => onOpenItem(it.id)}
                  className="bg-white rounded-md shadow-sm border border-gray-200 p-3 cursor-grab active:cursor-grabbing hover:shadow-md">
                  <div className="flex items-start gap-1">
                    <GripVertical size={14} className="text-gray-300 mt-0.5 shrink-0" />
                    <p className="text-sm text-gray-800 font-medium leading-snug">{it.name}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2.5">
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ background: it.groupColor + "22", color: it.groupColor }}>
                      {it.groupName}
                    </span>
                    <span className="text-[10px] text-white px-1.5 py-0.5 rounded" style={{ background: priorityOf(it.priority).color }}>
                      {priorityOf(it.priority).label}
                    </span>
                  </div>
                  {customCols.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">{customCols.map((c) => chip(it, c))}</div>
                  )}
                  <div className="flex items-center justify-between mt-2">
                    <span className={`text-[11px] ${isOverdue(it) ? "text-red-500 font-semibold" : "text-gray-400"}`}>
                      {it.dueDate ? fmtDate(it.dueDate) : "No date"}
                    </span>
                    <span className="flex -space-x-1.5">
                      {it.owners.map((pid) => <Avatar key={pid} personId={pid} size={20} ring />)}
                    </span>
                  </div>
                </div>
              ))}
              {items.length === 0 && <p className="text-xs text-gray-400 text-center py-6">Drop items here</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- dashboard view ---------------- */

function DashboardView({ board }) {
  const allItems = board.groups.flatMap((g) => g.items);
  const byStatus = STATUSES.map((s) => ({ name: s.label, value: allItems.filter((i) => i.status === s.id).length, color: s.color })).filter((d) => d.value > 0);
  const byGroup = board.groups.map((g) => ({
    name: g.name,
    Done: g.items.filter((i) => i.status === "done").length,
    Active: g.items.filter((i) => i.status !== "done").length,
  }));
  const byPerson = PEOPLE.map((p) => ({ name: p.name.split(" ")[0], tasks: allItems.filter((i) => i.owners.includes(p.id) && i.status !== "done").length, color: p.color })).filter((d) => d.tasks > 0);
  const overdue = allItems.filter(isOverdue).length;
  const done = allItems.filter((i) => i.status === "done").length;

  const numberCols = board.columns.filter((c) => c.type === "number" && !c.builtin);
  const dropdownCol = board.columns.find((c) => c.type === "dropdown" && !c.builtin);
  const byDropdown = dropdownCol
    ? (dropdownCol.options || []).map((o) => ({
        name: o.label, color: o.color,
        value: allItems.filter((i) => getVal(i, dropdownCol) === o.id).length,
      })).filter((d) => d.value > 0)
    : [];

  const Stat = ({ label, value, accent }) => (
    <div className="bg-white rounded-lg border border-gray-200 p-4 flex-1 min-w-[130px]">
      <p className="text-3xl font-bold" style={{ color: accent }}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  );

  return (
    <div className="max-w-5xl">
      <div className="flex gap-4 mb-6 flex-wrap">
        <Stat label="Total items" value={allItems.length} accent="#323338" />
        <Stat label="Done" value={done} accent="#00C875" />
        <Stat label="In progress" value={allItems.length - done} accent="#FDAB3D" />
        <Stat label="Overdue" value={overdue} accent="#E2445C" />
        {numberCols.map((c) => (
          <Stat key={c.id} label={`Total ${c.title}`} accent="#6161FF"
            value={allItems.reduce((acc, i) => acc + (Number(getVal(i, c)) || 0), 0).toLocaleString()} />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Items by status</h3>
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={byStatus} dataKey="value" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                  {byStatus.map((d, i) => <ReCell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip /><Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Progress by group</h3>
          <div style={{ height: 240 }}>
            <ResponsiveContainer>
              <BarChart data={byGroup}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Done" stackId="a" fill="#00C875" />
                <Bar dataKey="Active" stackId="a" fill="#579BFC" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        {byDropdown.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Items by {dropdownCol.title}</h3>
            <div style={{ height: 220 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={byDropdown} dataKey="value" nameKey="name" outerRadius={80}>
                    {byDropdown.map((d, i) => <ReCell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip /><Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        <div className={`bg-white rounded-lg border border-gray-200 p-4 ${byDropdown.length ? "" : "md:col-span-2"}`}>
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Open tasks per person</h3>
          <div style={{ height: 220 }}>
            <ResponsiveContainer>
              <BarChart data={byPerson}>
                <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="tasks">{byPerson.map((d, i) => <ReCell key={i} fill={d.color} />)}</Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- item updates panel ---------------- */

function ItemPanel({ boardItem, onClose, onAddUpdate }) {
  const [text, setText] = useState("");
  if (!boardItem) return null;
  const { it } = boardItem;
  const send = () => { if (!text.trim()) return; onAddUpdate(it.id, text.trim()); setText(""); };
  return (
    <div className="w-96 shrink-0 border-l border-gray-200 bg-white flex flex-col h-full">
      <div className="p-4 border-b border-gray-200 flex items-start justify-between">
        <div>
          <h2 className="font-semibold text-gray-800 leading-snug">{it.name}</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[11px] text-white px-2 py-0.5 rounded" style={{ background: statusOf(it.status).color }}>{statusOf(it.status).label}</span>
            <span className="flex -space-x-1.5">{it.owners.map((pid) => <Avatar key={pid} personId={pid} size={22} ring />)}</span>
            {it.dueDate && <span className="text-xs text-gray-400">Due {fmtDate(it.dueDate)}</span>}
          </div>
        </div>
        <button className="text-gray-400 hover:text-gray-700" onClick={onClose}><X size={18} /></button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {it.updates.length === 0 && (
          <div className="text-center text-gray-400 text-sm mt-10">
            <MessageCircle size={32} className="mx-auto mb-2 text-gray-300" />
            No updates yet. Write the first one to keep everyone in the loop.
          </div>
        )}
        {it.updates.map((u) => (
          <div key={u.id} className={`border rounded-lg p-3 ${u.author === "auto" ? "border-indigo-100 bg-indigo-50" : "border-gray-200"}`}>
            <div className="flex items-center gap-2 mb-1">
              <Avatar personId={u.author} size={24} />
              <span className="text-sm font-medium text-gray-700">{u.author === "auto" ? "Automation" : personOf(u.author)?.name || "You"}</span>
              <span className="text-[11px] text-gray-400 ml-auto">{u.time}</span>
            </div>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{u.text}</p>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-gray-200 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Write an update…"
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-blue-500" />
        <button className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3" onClick={send}><Send size={16} /></button>
      </div>
    </div>
  );
}

/* ---------------- automations modal ---------------- */

function AutomationsModal({ board, onClose, onChange }) {
  const [trigger, setTrigger] = useState({ type: "status_changes_to", status: "done" });
  const [action, setAction] = useState({ type: "move_to_group", groupId: board.groups[0]?.id });
  const [updateText, setUpdateText] = useState("");

  const setActionType = (type) => {
    if (type === "move_to_group") setAction({ type, groupId: board.groups[0]?.id });
    else if (type === "set_priority") setAction({ type, priority: "high" });
    else if (type === "assign_person") setAction({ type, personId: PEOPLE[0].id });
    else if (type === "post_update") setAction({ type, text: updateText });
    else setAction({ type });
  };

  const addRule = () => {
    const a = action.type === "post_update" ? { ...action, text: updateText.trim() || "Heads up — this item changed." } : action;
    onChange([...board.automations, { id: uid("a"), active: true, trigger, action: a }]);
  };

  const sel = "text-sm border border-gray-300 rounded px-2 py-1.5 outline-none focus:border-indigo-400 bg-white";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="font-semibold text-gray-800 flex items-center gap-2"><Zap size={17} className="text-indigo-500" /> Board automations</h2>
          <button className="text-gray-400 hover:text-gray-700" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="p-4 overflow-y-auto">
          <div className="border border-indigo-200 bg-indigo-50 rounded-lg p-3 mb-4">
            <p className="text-xs font-semibold text-indigo-600 mb-2">Create a rule</p>
            <div className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
              <span>When</span>
              <select className={sel} value={trigger.type}
                onChange={(e) => setTrigger(e.target.value === "item_created" ? { type: "item_created" } : { type: "status_changes_to", status: "done" })}>
                <option value="status_changes_to">status changes to</option>
                <option value="item_created">an item is created</option>
              </select>
              {trigger.type === "status_changes_to" && (
                <select className={sel} value={trigger.status} onChange={(e) => setTrigger({ ...trigger, status: e.target.value })}>
                  {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                </select>
              )}
              <span>then</span>
              <select className={sel} value={action.type} onChange={(e) => setActionType(e.target.value)}>
                <option value="move_to_group">move item to group</option>
                <option value="set_priority">set priority to</option>
                <option value="assign_person">assign person</option>
                <option value="set_date_today">set due date to today</option>
                <option value="post_update">post an update</option>
              </select>
              {action.type === "move_to_group" && (
                <select className={sel} value={action.groupId} onChange={(e) => setAction({ ...action, groupId: e.target.value })}>
                  {board.groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                </select>
              )}
              {action.type === "set_priority" && (
                <select className={sel} value={action.priority} onChange={(e) => setAction({ ...action, priority: e.target.value })}>
                  {PRIORITIES.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
                </select>
              )}
              {action.type === "assign_person" && (
                <select className={sel} value={action.personId} onChange={(e) => setAction({ ...action, personId: e.target.value })}>
                  {PEOPLE.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              )}
              {action.type === "post_update" && (
                <input className={`${sel} flex-1 min-w-[160px]`} placeholder="Update text"
                  value={updateText} onChange={(e) => setUpdateText(e.target.value)} />
              )}
              <button className="text-white text-sm rounded px-3 py-1.5 disabled:opacity-50" style={{ background: "#6161FF" }}
                disabled={action.type === "move_to_group" && !board.groups.length} onClick={addRule}>
                Add rule
              </button>
            </div>
          </div>

          <p className="text-xs font-semibold text-gray-500 mb-2">Active on this board</p>
          {board.automations.length === 0 && (
            <p className="text-sm text-gray-400">No automations yet. Rules run instantly when their trigger fires — in the table, on kanban drag, or when items are created.</p>
          )}
          <div className="space-y-2">
            {board.automations.map((a) => (
              <div key={a.id} className={`flex items-center gap-3 border rounded-lg p-3 ${a.active ? "border-gray-200" : "border-gray-100 opacity-60"}`}>
                <Zap size={16} className={a.active ? "text-indigo-500" : "text-gray-300"} />
                <p className="flex-1 text-sm text-gray-700">
                  {describeTrigger(a.trigger)}, {describeAction(a.action, board)}.
                </p>
                <button
                  className={`text-xs rounded-full px-3 py-1 font-medium ${a.active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}
                  onClick={() => onChange(board.automations.map((x) => x.id === a.id ? { ...x, active: !x.active } : x))}>
                  {a.active ? "On" : "Off"}
                </button>
                <button className="text-gray-300 hover:text-red-500"
                  onClick={() => onChange(board.automations.filter((x) => x.id !== a.id))}>
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- sidebar ---------------- */

function Sidebar({ boards, activeId, onSelect, onAdd, onToggleStar, onDeleteBoard, saveMode, onReset }) {
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const add = () => { if (name.trim()) { onAdd(name.trim()); setName(""); setAdding(false); } };
  const starred = boards.filter((b) => b.starred);
  const StorageIcon = saveMode === "memory" ? HardDrive : Cloud;
  const storageLabel = saveMode === "artifact" ? "Saved automatically" : saveMode === "local" ? "Saved in this browser" : "In-memory only";
  return (
    <aside className="w-64 shrink-0 bg-white border-r border-gray-200 flex flex-col">
      <div className="px-4 py-3 flex items-center gap-2 border-b border-gray-100">
        <span className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold" style={{ background: "#6161FF" }}>w</span>
        <div>
          <p className="text-sm font-semibold text-gray-800 leading-tight">workday</p>
          <p className="text-[11px] text-gray-400 leading-tight">Main workspace</p>
        </div>
      </div>
      <div className="p-2">
        <button className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-gray-600 hover:bg-gray-100">
          <Home size={15} /> Home
        </button>
      </div>
      {starred.length > 0 && (
        <div className="px-2">
          <p className="px-2 pt-1 pb-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Favorites</p>
          {starred.map((b) => (
            <button key={b.id}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm truncate ${b.id === activeId ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-600 hover:bg-gray-100"}`}
              onClick={() => onSelect(b.id)}>
              <Star size={14} className="text-yellow-400 fill-yellow-400 shrink-0" /> <span className="truncate">{b.name}</span>
            </button>
          ))}
        </div>
      )}
      <div className="px-2 mt-2 flex-1 overflow-y-auto">
        <div className="flex items-center justify-between px-2 pb-1">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Boards</p>
          <button className="text-gray-400 hover:text-indigo-600" title="Add board" onClick={() => setAdding(true)}><Plus size={15} /></button>
        </div>
        {boards.map((b) => (
          <div key={b.id} className={`group flex items-center rounded ${b.id === activeId ? "bg-indigo-50" : "hover:bg-gray-100"}`}>
            <button
              className={`flex-1 flex items-center gap-2 px-2 py-1.5 text-sm truncate ${b.id === activeId ? "text-indigo-700 font-medium" : "text-gray-600"}`}
              onClick={() => onSelect(b.id)}>
              <Table size={14} className="shrink-0 text-gray-400" /> <span className="truncate">{b.name}</span>
            </button>
            <button className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-yellow-400" onClick={() => onToggleStar(b.id)} title="Favorite">
              <Star size={13} className={b.starred ? "text-yellow-400 fill-yellow-400" : ""} />
            </button>
            <button className="opacity-0 group-hover:opacity-100 p-1 mr-1 text-gray-300 hover:text-red-500" onClick={() => onDeleteBoard(b.id)} title="Delete board">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
        {adding && (
          <div className="px-2 py-1.5 flex gap-1">
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") add(); if (e.key === "Escape") setAdding(false); }}
              placeholder="Board name" className="flex-1 min-w-0 text-sm border border-indigo-300 rounded px-2 py-1 outline-none" />
            <button className="text-white text-xs rounded px-2" style={{ background: "#6161FF" }} onClick={add}>Add</button>
          </div>
        )}
      </div>
      <div className="px-3 py-2 border-t border-gray-100">
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <StorageIcon size={12} /> {storageLabel}
          <span className="ml-auto">
            {confirmReset ? (
              <span className="flex items-center gap-1">
                <button className="text-red-600 font-medium hover:underline" onClick={() => { setConfirmReset(false); onReset(); }}>Reset all data?</button>
                <button className="hover:underline" onClick={() => setConfirmReset(false)}>No</button>
              </span>
            ) : (
              <button className="flex items-center gap-1 hover:text-gray-600" title="Restore sample data" onClick={() => setConfirmReset(true)}>
                <RotateCcw size={11} /> Reset
              </button>
            )}
          </span>
        </div>
      </div>
      <div className="p-3 border-t border-gray-100 flex items-center gap-2">
        <Avatar personId="p1" size={30} />
        <div className="text-xs"><p className="font-medium text-gray-700">Ava Torres</p><p className="text-gray-400">ava@workday.app</p></div>
      </div>
    </aside>
  );
}

/* ---------------- main app ---------------- */

export default function App() {
  const [boards, setBoards] = useState(null); // null until storage load resolves
  const [activeId, setActiveId] = useState("b1");
  const [view, setView] = useState("table");
  const [search, setSearch] = useState("");
  const [personFilter, setPersonFilter] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [openItemId, setOpenItemId] = useState(null);
  const [renamingBoard, setRenamingBoard] = useState(false);
  const [boardName, setBoardName] = useState("");
  const [showAutomations, setShowAutomations] = useState(false);
  const [saveMode, setSaveMode] = useState("memory");
  const saveTimer = useRef(null);
  const loadedRef = useRef(false);

  /* --- load once --- */
  useEffect(() => {
    let alive = true;
    store.load().then(({ data, mode }) => {
      if (!alive) return;
      setSaveMode(mode);
      if (data?.boards?.length) {
        const bs = normalizeBoards(data.boards);
        setBoards(bs);
        setActiveId(bs.some((b) => b.id === data.activeId) ? data.activeId : bs[0].id);
        if (data.view) setView(data.view);
      } else {
        setBoards(seedBoards());
      }
      loadedRef.current = true;
    });
    return () => { alive = false; };
  }, []);

  /* --- save (debounced) on any change --- */
  useEffect(() => {
    if (!loadedRef.current || !boards) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const mode = await store.save({ boards, activeId, view });
      setSaveMode(mode);
    }, 400);
    return () => clearTimeout(saveTimer.current);
  }, [boards, activeId, view]);

  const resetData = async () => {
    await store.clear();
    const bs = seedBoards();
    setBoards(bs);
    setActiveId(bs[0].id);
    setView("table");
    setSelectedIds(new Set());
    setOpenItemId(null);
  };

  const board = boards ? (boards.find((b) => b.id === activeId) || boards[0]) : null;

  /* --- filtering (search covers name, notes, and custom column values) ---
     Declared here, before the loading early-return below, so this hook always
     runs in the same order regardless of whether `boards` has loaded yet. */
  const filteredBoard = useMemo(() => {
    if (!board) return null;
    const q = search.trim().toLowerCase();
    if (!q && !personFilter) return board;
    const dropdownLabel = (col, v) => (col.options || []).find((o) => o.id === v)?.label || "";
    const haystack = (i) => {
      const custom = board.columns
        .filter((c) => !c.builtin)
        .map((c) => {
          const v = getVal(i, c);
          if (v === undefined || v === null) return "";
          return c.type === "dropdown" ? dropdownLabel(c, v) : String(v);
        })
        .join(" ");
      return `${i.name} ${i.notes} ${custom}`.toLowerCase();
    };
    return {
      ...board,
      groups: board.groups.map((g) => ({
        ...g,
        items: g.items.filter((i) =>
          (!q || haystack(i).includes(q)) && (!personFilter || i.owners.includes(personFilter))),
      })),
    };
  }, [board, search, personFilter]);

  if (!boards || !board) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50 text-gray-400 text-sm">
        Loading your boards…
      </div>
    );
  }

  /* --- board-level updates --- */
  const patchBoard = (boardId, fn) => setBoards((bs) => bs.map((b) => (b.id === boardId ? fn(b) : b)));

  const patchGroup = (groupId, patch) =>
    patchBoard(board.id, (b) => ({ ...b, groups: b.groups.map((g) => (g.id === groupId ? { ...g, ...patch } : g)) }));

  /* Single mutation path for item edits — table cells, kanban drag, everything.
     Detects status changes and runs the board's automations. */
  const patchItem = (itemId, patch) =>
    patchBoard(board.id, (b) => {
      const old = b.groups.flatMap((g) => g.items).find((i) => i.id === itemId);
      if (!old) return b;
      let nb = {
        ...b,
        groups: b.groups.map((g) => ({ ...g, items: g.items.map((i) => (i.id === itemId ? { ...i, ...patch } : i)) })),
      };
      if (patch.status && patch.status !== old.status) {
        nb = runAutomations(nb, itemId, { type: "status_change", status: patch.status });
      }
      return nb;
    });

  const deleteItems = (ids) => {
    patchBoard(board.id, (b) => ({
      ...b,
      groups: b.groups.map((g) => ({ ...g, items: g.items.filter((i) => !ids.has(i.id)) })),
    }));
    setSelectedIds(new Set());
    if (ids.has(openItemId)) setOpenItemId(null);
  };

  const addItem = (groupId, name) => {
    const ni = item(name, [], "not_started", "medium", "", "");
    patchBoard(board.id, (b) => {
      let nb = {
        ...b,
        groups: b.groups.map((g) => (g.id === groupId ? { ...g, items: [...g.items, ni] } : g)),
      };
      return runAutomations(nb, ni.id, { type: "created" });
    });
  };

  const addGroup = () =>
    patchBoard(board.id, (b) => ({
      ...b,
      groups: [...b.groups, { id: uid("g"), name: "New group", color: GROUP_COLORS[b.groups.length % GROUP_COLORS.length], collapsed: false, items: [] }],
    }));

  const deleteGroup = (groupId) =>
    patchBoard(board.id, (b) => ({
      ...b,
      groups: b.groups.filter((g) => g.id !== groupId),
      automations: b.automations.filter((a) => !(a.action.type === "move_to_group" && a.action.groupId === groupId)),
    }));

  /* --- columns --- */
  const addColumn = (col) => patchBoard(board.id, (b) => ({ ...b, columns: [...b.columns, col] }));
  const renameColumn = (colId, title) =>
    patchBoard(board.id, (b) => ({ ...b, columns: b.columns.map((c) => (c.id === colId ? { ...c, title } : c)) }));
  const deleteColumn = (colId) =>
    patchBoard(board.id, (b) => ({
      ...b,
      columns: b.columns.filter((c) => c.id !== colId),
      groups: b.groups.map((g) => ({
        ...g,
        items: g.items.map((i) => {
          if (!i.values || !(colId in i.values)) return i;
          const { [colId]: _drop, ...rest } = i.values;
          return { ...i, values: rest };
        }),
      })),
    }));

  /* --- boards --- */
  const addBoard = (name) => {
    const nb = {
      id: uid("b"), name, starred: false, columns: defaultColumns(), automations: [],
      groups: [{ id: uid("g"), name: "Group 1", color: GROUP_COLORS[0], collapsed: false, items: [] }],
    };
    setBoards((bs) => [...bs, nb]);
    setActiveId(nb.id);
    setView("table");
  };

  const deleteBoard = (boardId) => {
    const next = boards.filter((b) => b.id !== boardId);
    if (next.length === 0) return; // keep at least one board
    setBoards(next);
    if (boardId === activeId) setActiveId(next[0].id);
  };

  const addUpdate = (itemId, text) =>
    patchBoard(board.id, (b) => ({
      ...b,
      groups: b.groups.map((g) => ({
        ...g,
        items: g.items.map((i) =>
          i.id === itemId
            ? { ...i, updates: [...i.updates, { id: uid("u"), author: "p1", text, time: `Today, ${nowStamp()}` }] }
            : i),
      })),
    }));

  const openItem = openItemId
    ? board.groups.flatMap((g) => g.items).filter((i) => i.id === openItemId).map((it) => ({ it }))[0] || null
    : null;

  const toggleSelect = (id) =>
    setSelectedIds((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const VIEWS = [
    { id: "table", label: "Main table", icon: Table },
    { id: "kanban", label: "Kanban", icon: LayoutGrid },
    { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  ];

  return (
    <div className="h-screen flex bg-gray-50 text-gray-800" style={{ fontFamily: "'Figtree','Segoe UI',system-ui,sans-serif" }}>
      <Sidebar
        boards={boards} activeId={board.id}
        onSelect={(id) => { setActiveId(id); setSelectedIds(new Set()); setOpenItemId(null); }}
        onAdd={addBoard}
        onToggleStar={(id) => setBoards((bs) => bs.map((b) => (b.id === id ? { ...b, starred: !b.starred } : b)))}
        onDeleteBoard={deleteBoard}
        saveMode={saveMode}
        onReset={resetData}
      />

      <main className="flex-1 flex flex-col min-w-0">
        {/* board header */}
        <div className="bg-white border-b border-gray-200 px-6 pt-4">
          <div className="flex items-center gap-2">
            {renamingBoard ? (
              <input autoFocus value={boardName} onChange={(e) => setBoardName(e.target.value)}
                onBlur={() => { setRenamingBoard(false); boardName.trim() && patchBoard(board.id, (b) => ({ ...b, name: boardName })); }}
                onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
                className="text-2xl font-bold border-2 border-blue-400 rounded px-1 outline-none" />
            ) : (
              <h1 className="text-2xl font-bold cursor-text hover:bg-gray-100 rounded px-1 -mx-1"
                onClick={() => { setBoardName(board.name); setRenamingBoard(true); }}>
                {board.name}
              </h1>
            )}
            <button onClick={() => setBoards((bs) => bs.map((b) => (b.id === board.id ? { ...b, starred: !b.starred } : b)))}>
              <Star size={18} className={board.starred ? "text-yellow-400 fill-yellow-400" : "text-gray-300 hover:text-yellow-400"} />
            </button>
          </div>

          <div className="flex items-center gap-1 mt-3">
            {VIEWS.map((v) => (
              <button key={v.id}
                className={`flex items-center gap-1.5 text-sm px-3 py-2 border-b-2 -mb-px ${view === v.id ? "border-indigo-600 text-indigo-700 font-medium" : "border-transparent text-gray-500 hover:text-gray-800"}`}
                onClick={() => setView(v.id)}>
                <v.icon size={15} /> {v.label}
              </button>
            ))}
          </div>
        </div>

        {/* toolbar */}
        <div className="bg-white border-b border-gray-200 px-6 py-2 flex items-center gap-3 flex-wrap">
          <button className="flex items-center gap-1 text-white text-sm font-medium rounded px-3 py-1.5"
            style={{ background: "#6161FF" }}
            onClick={() => (board.groups[0] ? addItem(board.groups[0].id, "New item") : addGroup())}>
            New item <ChevronDown size={14} />
          </button>
          <button className="flex items-center gap-1.5 text-sm text-indigo-700 border border-indigo-200 hover:bg-indigo-50 rounded px-3 py-1.5"
            onClick={() => setShowAutomations(true)}>
            <Zap size={14} /> Automate
            {board.automations.filter((a) => a.active).length > 0 && (
              <span className="text-[10px] font-bold text-white rounded-full px-1.5 py-0.5" style={{ background: "#6161FF" }}>
                {board.automations.filter((a) => a.active).length}
              </span>
            )}
          </button>
          <div className="flex items-center gap-1.5 border border-gray-200 rounded px-2 py-1.5 bg-gray-50 focus-within:bg-white focus-within:border-indigo-400">
            <Search size={14} className="text-gray-400" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search items"
              className="text-sm outline-none bg-transparent w-40" />
            {search && <button onClick={() => setSearch("")}><X size={13} className="text-gray-400" /></button>}
          </div>
          <div className="flex items-center gap-1">
            <Filter size={14} className="text-gray-400" />
            <span className="text-xs text-gray-400 mr-1">Person:</span>
            {PEOPLE.map((p) => (
              <button key={p.id} onClick={() => setPersonFilter(personFilter === p.id ? null : p.id)}
                className={`rounded-full ${personFilter === p.id ? "ring-2 ring-indigo-500" : "opacity-70 hover:opacity-100"}`}>
                <Avatar personId={p.id} size={26} />
              </button>
            ))}
            {personFilter && <button className="text-xs text-indigo-600 ml-1 hover:underline" onClick={() => setPersonFilter(null)}>Clear</button>}
          </div>
          {view === "table" && (
            <button className="flex items-center gap-1 text-sm text-gray-600 hover:bg-gray-100 rounded px-2 py-1.5 ml-auto" onClick={addGroup}>
              <Plus size={14} /> Add group
            </button>
          )}
        </div>

        {/* content + panel */}
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 overflow-auto p-6 min-w-0">
            {view === "table" && filteredBoard.groups.map((g) => (
              <GroupSection
                key={g.id} group={g} columns={board.columns}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onGroupChange={(patch) => patchGroup(g.id, patch)}
                onDeleteGroup={() => deleteGroup(g.id)}
                onItemPatch={patchItem}
                onItemDelete={(id) => deleteItems(new Set([id]))}
                onAddItem={(name) => addItem(g.id, name)}
                onOpenItem={setOpenItemId}
                onAddColumn={addColumn}
                onRenameColumn={renameColumn}
                onDeleteColumn={deleteColumn}
              />
            ))}
            {view === "table" && filteredBoard.groups.length === 0 && (
              <div className="text-center text-gray-400 mt-20">
                <p className="mb-3">This board is empty.</p>
                <button className="text-white text-sm rounded px-4 py-2" style={{ background: "#6161FF" }} onClick={addGroup}>Add a group</button>
              </div>
            )}
            {view === "kanban" && <KanbanView board={filteredBoard} onItemPatch={patchItem} onOpenItem={setOpenItemId} />}
            {view === "dashboard" && <DashboardView board={filteredBoard} />}
          </div>
          <ItemPanel boardItem={openItem} onClose={() => setOpenItemId(null)} onAddUpdate={addUpdate} />
        </div>

        {/* bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-white shadow-xl border border-gray-200 rounded-xl flex items-center overflow-hidden z-30">
            <span className="text-white font-bold px-4 py-3 text-lg" style={{ background: "#6161FF" }}>{selectedIds.size}</span>
            <span className="px-3 text-sm text-gray-600">item{selectedIds.size === 1 ? "" : "s"} selected</span>
            <button className="flex items-center gap-1 px-4 py-3 text-sm text-red-600 hover:bg-red-50 border-l border-gray-100"
              onClick={() => deleteItems(selectedIds)}>
              <Trash2 size={15} /> Delete
            </button>
            <button className="px-3 py-3 text-gray-400 hover:text-gray-700 border-l border-gray-100" onClick={() => setSelectedIds(new Set())}>
              <X size={16} />
            </button>
          </div>
        )}

        {showAutomations && (
          <AutomationsModal
            board={board}
            onClose={() => setShowAutomations(false)}
            onChange={(automations) => patchBoard(board.id, (b) => ({ ...b, automations }))}
          />
        )}
      </main>
    </div>
  );
}
