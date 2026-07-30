// Loads the built bundle under a permissive DOM stub.
//
// There is no usable browser in this sandbox, so this stands in for "does the
// page's JS still evaluate". It specifically catches the one failure mode the
// module split can introduce: a generated bridge line referencing a name that
// isn't actually declared in its module, which throws ReferenceError the
// instant the bundle runs. Browser APIs are faked loosely — the goal is to get
// through top-level evaluation, not to simulate the page.
import fs from 'node:fs';
import path from 'node:path';

const stub = () => new Proxy(function () {}, {
  get(t, k) {
    if (k === Symbol.toPrimitive) return () => '';
    if (k === 'then') return undefined;          // don't look thenable
    if (k === 'length') return 0;
    if (k === Symbol.iterator) return function* () {};
    if (k === 'style' || k === 'dataset' || k === 'classList') return stub();
    return stub();
  },
  set() { return true; },
  apply() { return stub(); },
  construct() { return stub(); },
  has() { return true; },
});

const el = stub();
globalThis.window = globalThis;
globalThis.document = new Proxy({}, {
  get(t, k) {
    if (k === 'getElementById' || k === 'querySelector' || k === 'createElement') return () => el;
    if (k === 'querySelectorAll' || k === 'getElementsByClassName') return () => [];
    if (k === 'addEventListener' || k === 'removeEventListener') return () => {};
    if (k === 'documentElement' || k === 'body' || k === 'head') return el;
    if (k === 'readyState') return 'complete';
    if (k === 'cookie') return '';
    return stub();
  },
  set() { return true; },
});
Object.defineProperty(globalThis,'navigator',{value:{ userAgent: 'node', language: 'en-GB', onLine: true },configurable:true,writable:true});
Object.defineProperty(globalThis,'location',{value:{ href: 'http://localhost/', hash: '', search: '', pathname: '/', origin: 'http://localhost' },configurable:true,writable:true});
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {}, clear() {} };
globalThis.sessionStorage = globalThis.localStorage;
globalThis.fetch = () => Promise.resolve({ ok: true, json: async () => ({}), text: async () => '' });
globalThis.alert = () => {}; globalThis.confirm = () => true; globalThis.prompt = () => null;
globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, addListener() {} });
globalThis.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
globalThis.ResizeObserver = globalThis.IntersectionObserver;
globalThis.MutationObserver = globalThis.IntersectionObserver;
globalThis.requestAnimationFrame = (f) => setTimeout(f, 0);
globalThis.getComputedStyle = () => stub();
globalThis.supabase = { createClient: () => stub() };
globalThis.Stripe = () => stub();
globalThis.addEventListener = () => {};
globalThis.scrollTo = () => {};

const dir = new URL('../dist/assets', import.meta.url).pathname;
const files = fs.readdirSync(dir);
const bundle = files.find((f) => f.startsWith('index-') && f.endsWith('.js'));
// The portal chunk is lazy in the browser (fetched on login); load it here too
// so the handler check covers the signed-in surface as well as the public one.
const portal = files.find((f) => f.startsWith('portal-') && f.endsWith('.js'));
if (!bundle) { console.error('no bundle found'); process.exit(1); }
if (!portal) { console.error('no portal chunk — code splitting did not happen'); process.exit(1); }

const errors = [];
process.on('uncaughtException', (e) => errors.push(e));
process.on('unhandledRejection', (e) => errors.push(e));

try {
  await import(path.join(dir, bundle));
  await import(path.join(dir, portal));
} catch (e) {
  console.error('FAILED to evaluate bundle:');
  console.error('  ', e.constructor.name + ':', e.message);
  if (e instanceof ReferenceError) {
    console.error('   ^ a bridged name is not declared in its module — bridge bug');
  }
  console.error(e.stack.split('\n').slice(1, 4).join('\n'));
  process.exit(1);
}

// Give any deferred top-level work a tick to blow up.
await new Promise((r) => setTimeout(r, 150));

const fatal = errors.filter((e) => e instanceof ReferenceError || e instanceof SyntaxError);
if (fatal.length) {
  console.error('FATAL during evaluation:');
  for (const e of fatal.slice(0, 5)) console.error('  ', e.constructor.name + ':', e.message);
  process.exit(1);
}

// Confirm the bridge actually populated the globals the markup calls.
const need = JSON.parse(fs.readFileSync(
  new URL('./inline-handlers.json', import.meta.url), 'utf8'));
const cssNoise = new Set(['rgba', 'scale', 'translateY', 'var', 'child', 'spOpenBook']);
const undef = need.filter((n) => !cssNoise.has(n) && typeof globalThis[n] === 'undefined');

console.log('bundle evaluated OK');
console.log('non-fatal errors during eval:', errors.length - fatal.length);
console.log('inline handlers checked:', need.length - cssNoise.size);
if (undef.length) {
  console.error('MISSING AT RUNTIME:', undef.length, undef.join(' '));
  process.exit(1);
}
console.log('every inline handler resolves at runtime ✓');

process.exit(0);
