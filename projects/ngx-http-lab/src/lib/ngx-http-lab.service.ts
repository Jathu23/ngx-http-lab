import { Injectable, signal, computed } from '@angular/core';
import { ApiLog } from './models/api-log.model';
import { InterceptRule } from './models/intercept-rule.model';

/**
 * Module-level singleton signals — shared across all Angular DI injector contexts.
 * This ensures the interceptor and panel always read/write the same state,
 * regardless of which injector created them.
 */
const _enabled = signal<boolean>(true);
const _maxLogs = { value: 200 };
const _logs = signal<ApiLog[]>([]);
const _rules = signal<InterceptRule[]>([]);
const _jwtOverride = signal<string | null>(null);

/** Called once by provideNgxHttpLab() to configure the module */
export function configureNgxHttpLab(enabled: boolean, maxLogs: number): void {
  _enabled.set(enabled);
  _maxLogs.value = maxLogs;
}

// Expose as readonly for interceptor use
export const ngxHttpLabEnabled = _enabled.asReadonly();
export const ngxHttpLabJwt = _jwtOverride.asReadonly();

export function ngxHttpLabFindRule(url: string, method: string): InterceptRule | undefined {
  return _rules().find(rule => {
    if (!rule.enabled) return false;
    const urlMatch = url.includes(rule.urlPattern);
    const methodMatch = !rule.method || rule.method === '*' || rule.method.toUpperCase() === method.toUpperCase();
    return urlMatch && methodMatch;
  });
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

@Injectable()
export class NgxHttpLabService {

  // Expose module-level signals through the service (reactive in templates)
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
    a.download = `ngx-http-lab-${new Date().toISOString()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  setJwt(token: string | null): void { _jwtOverride.set(token); }

  addRule(rule: Omit<InterceptRule, 'id'>): void {
    const newRule: InterceptRule = { ...rule, id: crypto.randomUUID() };
    _rules.update(rules => [...rules, newRule]);
  }

  removeRule(id: string): void {
    _rules.update(rules => rules.filter(r => r.id !== id));
  }

  toggleRule(id: string): void {
    _rules.update(rules => rules.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  }

  updateRule(id: string, patch: Partial<InterceptRule>): void {
    _rules.update(rules => rules.map(r => r.id === id ? { ...r, ...patch } : r));
  }
}
