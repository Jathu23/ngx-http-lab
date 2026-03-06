import { Injectable, signal, computed } from '@angular/core';
import { HttpRequest } from '@angular/common/http';
import { ApiLog } from './models/api-log.model';
import { InterceptRule, MockScenario } from './models/intercept-rule.model';

// ─── IndexedDB persistence (silent, internal) ─────────────────────────────────
const IDB_DB = 'ngx-http-lab';
const IDB_VER = 1;
const IDB_STORE = 'state';
const KEY_RULES = 'rules';
const KEY_JWT = 'jwt';

function openIdb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const req = indexedDB.open(IDB_DB, IDB_VER);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE);
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    const db = await openIdb();
    return new Promise((res, rej) => {
      const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).get(key);
      req.onsuccess = () => res(req.result as T);
      req.onerror = () => rej(req.error);
    });
  } catch { return undefined; }
}

async function idbSet(key: string, value: unknown): Promise<void> {
  try {
    const db = await openIdb();
    return new Promise((res, rej) => {
      const req = db.transaction(IDB_STORE, 'readwrite').objectStore(IDB_STORE).put(value, key);
      req.onsuccess = () => res();
      req.onerror = () => rej(req.error);
    });
  } catch { /* ignore */ }
}

// ─── sessionStorage (synchronous — survives F5 refresh, immune to localStorage.clear()) ───
const SS_RULES = 'ngx-http-lab:rules';
const SS_JWT = 'ngx-http-lab:jwt';
function ssLoadRules(): InterceptRule[] {
  try { const r = sessionStorage.getItem(SS_RULES); return r ? JSON.parse(r) : []; } catch { return []; }
}
function ssSave(rules: InterceptRule[]): void {
  try { sessionStorage.setItem(SS_RULES, JSON.stringify(rules)); } catch { /* ignore */ }
}
function ssLoadJwt(): string | null {
  try { return sessionStorage.getItem(SS_JWT); } catch { return null; }
}
function ssSaveJwt(jwt: string | null): void {
  try { if (jwt) sessionStorage.setItem(SS_JWT, jwt); else sessionStorage.removeItem(SS_JWT); } catch { /* ignore */ }
}

// ─── Module-level singleton signals ───────────────────────────────────────────
const _enabled = signal<boolean>(true);
const _maxLogs = { value: 200 };
const _logs = signal<ApiLog[]>([]);
// Synchronous init from sessionStorage: no blank flash on page refresh
const _rules = signal<InterceptRule[]>(ssLoadRules());
const _jwtOverride = signal<string | null>(ssLoadJwt());

/** Also load from IndexedDB asynchronously for cross-tab / restart persistence */
(async () => {
  try {
    const idbRules = await idbGet<InterceptRule[]>(KEY_RULES);
    if (Array.isArray(idbRules) && idbRules.length > 0 && _rules().length === 0) {
      _rules.set(idbRules);
      ssSave(idbRules);
    }
    const idbJwt = await idbGet<string>(KEY_JWT);
    if (idbJwt && !_jwtOverride()) {
      _jwtOverride.set(idbJwt);
      ssSaveJwt(idbJwt);
    }
  } catch { /* ignore */ }
})();

/** Write to both layers — sessionStorage is instant, IndexedDB survives tab close */
function persist(rules: InterceptRule[]): void {
  ssSave(rules);
  idbSet(KEY_RULES, rules);
}

// ─── Interceptor exports ──────────────────────────────────────────────────────
export function configureNgxHttpLab(enabled: boolean, maxLogs: number): void {
  _enabled.set(enabled);
  _maxLogs.value = maxLogs;
}

export const ngxHttpLabEnabled = _enabled.asReadonly();
export const ngxHttpLabJwt = _jwtOverride.asReadonly();

function isSubset(subset: any, superSet: any): boolean {
  if (subset === null || subset === undefined) return true;
  if (typeof subset !== 'object') return subset === superSet;
  if (Array.isArray(subset)) return Array.isArray(superSet);
  for (const key in subset) {
    if (!superSet || !isSubset(subset[key], superSet[key])) return false;
  }
  return true;
}

export function ngxHttpLabFindRule(req: HttpRequest<unknown>): { rule: InterceptRule; scenario: MockScenario | undefined } | undefined {
  const rule = _rules().find(rule => {
    if (!rule.enabled) return false;
    const urlMatch = req.urlWithParams.includes(rule.urlPattern);
    const methodMatch = !rule.method || rule.method === '*' || rule.method.toUpperCase() === req.method.toUpperCase();
    if (!urlMatch || !methodMatch) return false;

    if (rule.matchCriteria) {
      if (rule.matchCriteria.queryParams?.length) {
        for (const p of rule.matchCriteria.queryParams.filter(p => p.enabled && p.key.trim())) {
          if (!req.urlWithParams.includes(`${p.key}=${p.value}`)) return false;
        }
      }
      if (rule.matchCriteria.bodySubset) {
        try {
          const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
          if (!isSubset(rule.matchCriteria.bodySubset, body)) return false;
        } catch { return false; }
      }
    }
    return true;
  });

  if (!rule) return undefined;

  let scenario: MockScenario | undefined;
  if (rule.scenarios?.length) {
    let body: any;
    try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; } catch { /* ignore */ }
    scenario = rule.scenarios.find(s => s.isActive && s.matchBodySubset && body && isSubset(s.matchBodySubset, body));
    if (!scenario) scenario = rule.scenarios.find(s => s.matchBodySubset && body && isSubset(s.matchBodySubset, body));
    if (!scenario) scenario = rule.scenarios.find(s => s.isActive);
  }

  return { rule, scenario };
}

export function ngxHttpLabAddLog(log: ApiLog): void {
  _logs.update(logs => {
    const updated = [log, ...logs];
    return updated.length > _maxLogs.value ? updated.slice(0, _maxLogs.value) : updated;
  });
}

export function ngxHttpLabUpdateLog(id: string, patch: Partial<ApiLog>): void {
  _logs.update(logs => logs.map(l => l.id === id ? { ...l, ...patch } : l));
}

// ─── Service ──────────────────────────────────────────────────────────────────
@Injectable()
export class NgxHttpLabService {

  readonly enabled = _enabled.asReadonly();
  readonly logs = _logs.asReadonly();
  readonly rules = _rules.asReadonly();
  readonly jwtOverride = _jwtOverride.asReadonly();

  readonly totalCalls = computed(() => _logs().length);
  readonly errorCount = computed(() => _logs().filter(l => l.isError).length);
  readonly mockedCount = computed(() => _logs().filter(l => l.isMocked).length);

  clearLogs(): void { _logs.set([]); }

  exportLogs(): void {
    const json = JSON.stringify(_logs(), null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ngx-http-lab-logs-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  setJwt(token: string | null): void {
    _jwtOverride.set(token);
    idbSet(KEY_JWT, token);
  }

  addRule(rule: Omit<InterceptRule, 'id'>): void {
    _rules.update(rules => [...rules, { ...rule, id: crypto.randomUUID() }]);
    persist(_rules());
  }

  cloneRule(id: string): void {
    const rule = _rules().find(r => r.id === id);
    if (!rule) return;
    _rules.update(rules => [...rules, { ...JSON.parse(JSON.stringify(rule)), id: crypto.randomUUID(), name: `${rule.name} (Copy)` }]);
    persist(_rules());
  }

  removeRule(id: string): void {
    _rules.update(rules => rules.filter(r => r.id !== id));
    persist(_rules());
  }

  toggleRule(id: string): void {
    _rules.update(rules => rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
    persist(_rules());
  }

  updateRule(id: string, patch: Partial<InterceptRule>): void {
    _rules.update(rules => rules.map(r => r.id === id ? { ...r, ...patch } : r));
    persist(_rules());
  }

  setActiveScenario(ruleId: string, scenarioId: string): void {
    _rules.update(rules => rules.map(r => {
      if (r.id !== ruleId) return r;
      return { ...r, scenarios: r.scenarios?.map(s => ({ ...s, isActive: s.id === scenarioId })) };
    }));
    persist(_rules());
  }

  clearRules(): void {
    _rules.set([]);
    persist([]);
  }
}
