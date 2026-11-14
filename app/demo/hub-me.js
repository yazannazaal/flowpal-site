// Local mock only (?mock= / ?demo on localhost): a fake hub_me() so the app can be tried without the database.
// Loaded ONLY in demo mode. It copies the seed of app_modules and filters it by role exactly like the
// real hub_me() does in the database (admin = every module; a role sees modules whose roles include it).
const SEED = [   // = the app_modules seed in the database
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
  // member ids are the database's own ids (app_users.member_id); names are fake. people = who the caller may see by name
  const member = { admin: "yazan", sales: "dania", content: "dania" }[role] || null;
  const people = p.roles.includes("sales") || p.roles.includes("content") || p.is_admin ? { yazan: PEOPLE.admin.name, dania: PEOPLE.sales.name } : {};
  return { email: p.email, name: p.name, is_admin: p.is_admin, member_id: member, people, modules };
}
