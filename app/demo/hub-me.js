// Local mock only (?mock= / ?demo on localhost): a fake hub_me() so the app can be tried before ops/hub/001-roles.sql / 002-dania-workspace.sql run.
// Loaded ONLY in demo mode. It copies the seed of app_modules and filters it by role exactly like the
// real hub_me() does in the database (admin = every module; a role sees modules whose roles include it).
const SEED = [   // after ops/hub/002-dania-workspace.sql section 17
  { id: "home",          label: "الرئيسية",          icon: "home",           sort: 5,  roles: ["sales", "content"] },
  { id: "subscribers",   label: "المشتركين",        icon: "users",          sort: 10, roles: ["tech"] },
  { id: "tech-requests", label: "الطلبات والمشاكل", icon: "wrench",         sort: 20, roles: ["tech"] },
  { id: "companies",     label: "الشركات",           icon: "building",       sort: 31, roles: ["sales"] },
  { id: "followups",     label: "المتابعات اليومية", icon: "calendar-check", sort: 32, roles: ["sales"] },
  { id: "sales",         label: "التحليلات",         icon: "chart",          sort: 33, roles: ["sales"] },
  { id: "content",       label: "المحتوى",           icon: "image",          sort: 34, roles: ["content"] },
  { id: "research",      label: "الأبحاث",           icon: "book",           sort: 60, roles: ["sales"] },
  { id: "finance",       label: "المالية",           icon: "wallet",         sort: 90, roles: [] },
];

const PEOPLE = {
  admin:   { email: "admin@demo.invalid",   name: "مدير (تجريبي)",   is_admin: true,  roles: [] },
  tech:    { email: "tech@demo.invalid",    name: "تقني (تجريبي)", is_admin: false, roles: ["tech"] },
  sales:   { email: "sales@demo.invalid",   name: "مبيعات (تجريبي)", is_admin: false, roles: ["sales", "content"] },
  content: { email: "content@demo.invalid", name: "محتوى (تجريبي)", is_admin: false, roles: ["content"] },
};

export function mockHubMe(role) {
  const p = PEOPLE[role];
  if (!p) return null;                       // 'none' or unknown: same as a login that is not in app_users
  const modules = SEED
    .filter((m) => p.is_admin || m.roles.some((r) => p.roles.includes(r)))
    .sort((a, b) => a.sort - b.sort || a.id.localeCompare(b.id))
    .map(({ id, label, icon }) => ({ id, label, icon }));
  return { email: p.email, name: p.name, is_admin: p.is_admin, modules };
}
