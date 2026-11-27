// Small shared helpers: escaping, icons, toast, avatar letters.
export const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

export const initial = (name) => (String(name || "?").trim()[0] || "?").toUpperCase();

let toastTimer;
export function toast(message) {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 2600);
}

const svg = (body, extra = "") =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${body}</svg>`;

export const icons = {
  menu: svg('<path d="M4 6h16M4 12h16M4 18h16"/>'),
  share: svg('<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>'),
  back: svg('<path d="M19 12H5M12 19l-7-7 7-7"/>'),
  close: svg('<path d="M18 6L6 18M6 6l12 12"/>'),
  user: svg('<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>'),
  mail: svg('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>'),
  lock: svg('<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 018 0v3"/>'),
  eye: svg('<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>'),
  eyeOff: svg('<path d="M17.9 17.9A10.9 10.9 0 0112 19C5 19 1 12 1 12a18 18 0 015.1-5.9M9.9 5.2A10 10 0 0112 5c7 0 11 7 11 7a18 18 0 01-2.2 3.2M1 1l22 22"/>'),
  pencil: svg('<path d="M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4 12.5-12.5z"/>'),
  plus: svg('<path d="M12 5v14M5 12h14"/>'),
  check: svg('<path d="M20 6L9 17l-5-5"/>'),
  filter: svg('<path d="M3 4h18l-7 8v7l-4 2v-9L3 4z" fill="currentColor"/>'),
  receipt: svg('<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2V3z"/><path d="M9 8h6M9 12h6"/>'),
  cart: svg('<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.7 12.4a1 1 0 001 .8h8.7a1 1 0 001-.8L20 7H6"/>'),
  coffee: svg('<path d="M4 8h13v6a5 5 0 01-5 5H9a5 5 0 01-5-5V8z"/><path d="M17 10h2a2 2 0 010 4h-2M8 2v3M12 2v3"/>'),
  alert: svg('<circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M12 7v6" stroke="#fff"/><circle cx="12" cy="16.5" r=".6" fill="#fff" stroke="#fff"/>'),
  settled: svg('<circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M7.5 12.5l3 3 6-6.5" stroke="#fff"/>'),
  info: svg('<circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M12 11v6" stroke="#fff"/><circle cx="12" cy="7.5" r=".7" fill="#fff" stroke="#fff"/>'),
  calendar: svg('<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>'),
  chevron: svg('<path d="M6 9l6 6 6-6"/>'),
  stepBill: svg('<path d="M6 3h12v18l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-1.5V3z"/><path d="M9 8h6M9 12h6M9 16h3"/>', 'stroke-width="1.6"'),
  stepPeople: svg('<circle cx="12" cy="7" r="3"/><circle cx="5" cy="9" r="2.3"/><circle cx="19" cy="9" r="2.3"/><path d="M6 20c0-3.5 2.7-5.5 6-5.5s6 2 6 5.5M1 18c0-2.5 1.7-4 4-4M23 18c0-2.5-1.7-4-4-4"/>', 'stroke-width="1.6"'),
  stepSplit: svg('<path d="M4 20l7-7M4 20v-5M4 20h5M20 4l-7 7M20 4v5M20 4h-5M4 4l7 7M4 4v5M4 4h5M20 20l-7-7M20 20v-5M20 20h-5"/>', 'stroke-width="1.6"'),
};

/** Receipt + calculator logo used on Welcome and Login. */
export const logo = `
<svg class="logo" viewBox="0 0 96 96" aria-hidden="true">
  <path d="M10 8h40v70l-6-4-6 4-7-4-7 4-7-4-7 4V8z" fill="#f4eed8"/>
  <path d="M18 22h24M18 32h24M18 42h16" stroke="#9d93c9" stroke-width="3" stroke-linecap="round"/>
  <rect x="40" y="34" width="38" height="50" rx="6" fill="#c9d4f5"/>
  <rect x="46" y="40" width="26" height="10" rx="2" fill="#fff"/>
  <g fill="#4a3aa8"><circle cx="50" cy="59" r="3"/><circle cx="59" cy="59" r="3"/><circle cx="68" cy="59" r="3"/>
  <circle cx="50" cy="69" r="3"/><circle cx="59" cy="69" r="3"/><circle cx="68" cy="69" r="3"/>
  <circle cx="50" cy="78" r="3"/><circle cx="59" cy="78" r="3"/><circle cx="68" cy="78" r="3"/></g>
  <path d="M82 8l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" fill="none" stroke="#fff" stroke-width="2"/>
</svg>`;

export function iconForExpense(name = "") {
  const n = name.toLowerCase();
  if (/grocer|shop|market|supermarket|store/.test(n)) return icons.cart;
  if (/coffee|tea|cafe|café|drink/.test(n)) return icons.coffee;
  return icons.receipt;
}
