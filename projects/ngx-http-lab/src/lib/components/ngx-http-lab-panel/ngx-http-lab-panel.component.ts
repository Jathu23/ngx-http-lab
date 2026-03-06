import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxHttpLabService } from '../../ngx-http-lab.service';
import { ApiLog } from '../../models/api-log.model';
import { InterceptRule, MockScenario, KeyValuePair } from '../../models/intercept-rule.model';

type MethodFilter = 'ALL' | 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
type StatusFilter = 'ALL' | '2xx' | '3xx' | '4xx' | '5xx' | 'pending';
type ActivePanel = 'logs' | 'rules' | 'jwt';
type RuleTab = 'mock' | 'modify';

const COMMON_STATUS_CODES = [
    { code: 200, label: '200 OK', cls: 'status-2xx' },
    { code: 201, label: '201 Created', cls: 'status-2xx' },
    { code: 204, label: '204 No Content', cls: 'status-2xx' },
    { code: 301, label: '301 Redirect', cls: 'status-3xx' },
    { code: 400, label: '400 Bad Request', cls: 'status-4xx' },
    { code: 401, label: '401 Unauthorized', cls: 'status-4xx' },
    { code: 403, label: '403 Forbidden', cls: 'status-4xx' },
    { code: 404, label: '404 Not Found', cls: 'status-4xx' },
    { code: 422, label: '422 Unprocessable', cls: 'status-4xx' },
    { code: 500, label: '500 Server Error', cls: 'status-5xx' },
    { code: 502, label: '502 Bad Gateway', cls: 'status-5xx' },
    { code: 503, label: '503 Unavailable', cls: 'status-5xx' },
];

function makeKV(key = '', value = ''): KeyValuePair {
    return { key, value, enabled: true };
}

function makeScenario(name: string, status: number): MockScenario {
    return {
        id: crypto.randomUUID(),
        name,
        status,
        body: {},
        isActive: false
    };
}

@Component({
    selector: 'ngx-http-lab-panel',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './ngx-http-lab-panel.component.html',
    styleUrls: ['./ngx-http-lab-panel.component.scss']
})
export class NgxHttpLabPanelComponent {
    readonly service = inject(NgxHttpLabService);
    readonly statusCodes = COMMON_STATUS_CODES;

    // ── Tab State ──────────────────────────────
    activeTab = signal<ActivePanel>('logs');

    // ── Log State ─────────────────────────────
    selectedLog = signal<ApiLog | null>(null);
    urlFilter = signal<string>('');
    methodFilter = signal<MethodFilter>('ALL');
    statusFilter = signal<StatusFilter>('ALL');
    readonly methodOptions: MethodFilter[] = ['ALL', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    readonly statusOptions: StatusFilter[] = ['ALL', '2xx', '3xx', '4xx', '5xx', 'pending'];

    readonly filteredLogs = computed(() => {
        let logs = this.service.logs();
        const url = this.urlFilter().toLowerCase();
        const method = this.methodFilter();
        const status = this.statusFilter();
        if (url) logs = logs.filter(l => l.url.toLowerCase().includes(url));
        if (method !== 'ALL') logs = logs.filter(l => l.method === method);
        if (status !== 'ALL') {
            logs = logs.filter(l => {
                if (status === 'pending') return l.status === null;
                const s = l.status ?? 0;
                if (status === '2xx') return s >= 200 && s < 300;
                if (status === '3xx') return s >= 300 && s < 400;
                if (status === '4xx') return s >= 400 && s < 500;
                if (status === '5xx') return s >= 500;
                return true;
            });
        }
        return logs;
    });

    // ── JWT State ──────────────────────────────
    jwtInput = signal<string>('');
    applyJwt(): void { this.service.setJwt(this.jwtInput().trim() || null); }
    clearJwt(): void { this.jwtInput.set(''); this.service.setJwt(null); }

    // ── Rule Editor State ─────────────────────
    editingRuleId = signal<string | null>(null);
    ruleTab = signal<RuleTab>('mock');
    showRuleForm = signal<boolean>(false);

    // Rule form fields
    ruleName = signal<string>('');
    ruleUrl = signal<string>('');
    ruleMethod = signal<string>('*');
    ruleEnabled = signal<boolean>(true);
    ruleQueryParams = signal<KeyValuePair[]>([makeKV()]);
    ruleHeaderMods = signal<KeyValuePair[]>([makeKV()]);
    ruleQueryParamMods = signal<KeyValuePair[]>([makeKV()]);
    ruleBodyPatch = signal<string>('');

    // Scenarios
    ruleScenarios = signal<MockScenario[]>([
        { ...makeScenario('Success', 200), isActive: true }
    ]);
    selectedScenarioId = signal<string | null>(null);

    readonly selectedScenario = computed(() =>
        this.ruleScenarios().find(s => s.id === this.selectedScenarioId()) ?? null
    );

    readonly selectedScenarioBodyText = computed(() => {
        const s = this.selectedScenario();
        if (!s) return '';
        return this.formatBody(s.body);
    });

    setSelectedScenario(id: string): void {
        this.selectedScenarioId.set(id);
    }

    getStatusCls(code: number): string {
        if (code < 300) return 'status-2xx';
        if (code < 400) return 'status-3xx';
        if (code < 500) return 'status-4xx';
        return 'status-5xx';
    }

    // ── Scenario Methods ──────────────────────
    addScenario(): void {
        const id = crypto.randomUUID();
        const scenario: MockScenario = {
            id,
            name: `Scenario ${this.ruleScenarios().length + 1}`,
            status: 200,
            body: {},
            isActive: false
        };
        this.ruleScenarios.update(ss => [...ss, scenario]);
        this.selectedScenarioId.set(id);
    }

    removeScenario(id: string): void {
        const remaining = this.ruleScenarios().filter(s => s.id !== id);
        this.ruleScenarios.set(remaining.length ? remaining : [{ ...makeScenario('Success', 200), isActive: true }]);
        if (this.selectedScenarioId() === id) {
            this.selectedScenarioId.set(this.ruleScenarios()[0]?.id ?? null);
        }
    }

    updateScenarioField(id: string, field: keyof MockScenario, value: unknown): void {
        this.ruleScenarios.update(ss => ss.map(s => s.id === id ? { ...s, [field]: value } : s));
    }

    updateScenarioBody(id: string, jsonText: string): void {
        let body: unknown = {};
        try { body = JSON.parse(jsonText); } catch { body = jsonText; }
        this.updateScenarioField(id, 'body', body);
    }

    updateScenarioMatchBody(id: string, jsonText: string): void {
        const trimmed = jsonText.trim();
        if (!trimmed || trimmed === '{}') {
            this.updateScenarioField(id, 'matchBodySubset', undefined);
            return;
        }
        try {
            const parsed = JSON.parse(trimmed);
            this.updateScenarioField(id, 'matchBodySubset', parsed);
        } catch { /* ignore invalid JSON */ }
    }

    setActiveScenario(id: string): void {
        this.ruleScenarios.update(ss => ss.map(s => ({ ...s, isActive: s.id === id })));
    }

    // ── KV Row Methods ────────────────────────
    addQueryParam(): void { this.ruleQueryParams.update(kv => [...kv, makeKV()]); }
    removeQueryParam(i: number): void { this.ruleQueryParams.update(kv => kv.filter((_, j) => j !== i)); }
    updateQueryParam(i: number, field: keyof KeyValuePair, val: string | boolean): void {
        this.ruleQueryParams.update(kv => kv.map((row, j) => j === i ? { ...row, [field]: val } : row));
    }

    addHeaderMod(): void { this.ruleHeaderMods.update(kv => [...kv, makeKV()]); }
    removeHeaderMod(i: number): void { this.ruleHeaderMods.update(kv => kv.filter((_, j) => j !== i)); }
    updateHeaderMod(i: number, field: keyof KeyValuePair, val: string | boolean): void {
        this.ruleHeaderMods.update(kv => kv.map((row, j) => j === i ? { ...row, [field]: val } : row));
    }

    addQueryParamMod(): void { this.ruleQueryParamMods.update(kv => [...kv, makeKV()]); }
    removeQueryParamMod(i: number): void { this.ruleQueryParamMods.update(kv => kv.filter((_, j) => j !== i)); }
    updateQueryParamMod(i: number, field: keyof KeyValuePair, val: string | boolean): void {
        this.ruleQueryParamMods.update(kv => kv.map((row, j) => j === i ? { ...row, [field]: val } : row));
    }

    // ── Open/Close Form ───────────────────────
    openNewRuleForm(): void {
        this.editingRuleId.set(null);
        this.ruleName.set('');
        this.ruleUrl.set('');
        this.ruleMethod.set('*');
        this.ruleEnabled.set(true);
        this.ruleQueryParams.set([makeKV()]);
        this.ruleHeaderMods.set([makeKV()]);
        this.ruleQueryParamMods.set([makeKV()]);
        this.ruleBodyPatch.set('');
        const firstId = crypto.randomUUID();
        this.ruleScenarios.set([{ ...makeScenario('Success', 200), id: firstId, isActive: true }]);
        this.selectedScenarioId.set(firstId);
        this.ruleTab.set('mock');
        this.showRuleForm.set(true);
    }

    openEditRuleForm(rule: InterceptRule): void {
        this.editingRuleId.set(rule.id);
        this.ruleName.set(rule.name);
        this.ruleUrl.set(rule.urlPattern);
        this.ruleMethod.set(rule.method || '*');
        this.ruleEnabled.set(rule.enabled);

        const qp = rule.matchCriteria?.queryParams;
        this.ruleQueryParams.set(qp?.length ? [...qp] : [makeKV()]);

        const hm = rule.modifyRequest?.headers;
        this.ruleHeaderMods.set(hm?.length ? [...hm] : [makeKV()]);

        const qpm = rule.modifyRequest?.queryParams;
        this.ruleQueryParamMods.set(qpm?.length ? [...qpm] : [makeKV()]);

        const bp = rule.modifyRequest?.bodyPatch;
        this.ruleBodyPatch.set(bp ? this.formatBody(bp) : '');

        const scenarios = rule.scenarios?.length
            ? JSON.parse(JSON.stringify(rule.scenarios))
            : [{ ...makeScenario('Success', 200), isActive: true }];
        this.ruleScenarios.set(scenarios);
        this.selectedScenarioId.set(scenarios.find((s: MockScenario) => s.isActive)?.id ?? scenarios[0]?.id);
        this.ruleTab.set('mock');
        this.showRuleForm.set(true);
    }

    closeRuleForm(): void { this.showRuleForm.set(false); this.editingRuleId.set(null); }

    // ── Save Rule ────────────────────────────
    saveRule(): void {
        if (!this.ruleUrl().trim()) return;

        const enabledQP = this.ruleQueryParams().filter(p => p.enabled && p.key.trim());
        const enabledHM = this.ruleHeaderMods().filter(h => h.enabled && h.key.trim());
        const enabledQPM = this.ruleQueryParamMods().filter(p => p.enabled && p.key.trim());

        let bodyPatch: Record<string, unknown> | undefined;
        if (this.ruleBodyPatch().trim()) {
            try { bodyPatch = JSON.parse(this.ruleBodyPatch()); } catch { /* ignore */ }
        }

        const rule: Omit<InterceptRule, 'id'> = {
            name: this.ruleName().trim() || this.ruleUrl().trim(),
            urlPattern: this.ruleUrl().trim(),
            method: this.ruleMethod(),
            enabled: this.ruleEnabled(),
            matchCriteria: enabledQP.length ? { queryParams: enabledQP } : undefined,
            scenarios: this.ruleScenarios(),
            modifyRequest: (enabledHM.length || enabledQPM.length || bodyPatch)
                ? {
                    headers: enabledHM.length ? enabledHM : undefined,
                    queryParams: enabledQPM.length ? enabledQPM : undefined,
                    bodyPatch
                }
                : undefined
        };

        const editId = this.editingRuleId();
        if (editId) {
            this.service.updateRule(editId, rule);
        } else {
            this.service.addRule(rule);
        }
        this.closeRuleForm();
    }

    // ── UI Helpers ────────────────────────────
    countQueryParams(rule: InterceptRule): number {
        return rule.matchCriteria?.queryParams?.filter(p => p.enabled && p.key.trim()).length ?? 0;
    }

    selectLog(log: ApiLog): void {
        this.selectedLog.update(c => c?.id === log.id ? null : log);
    }

    getStatusClass(status: number | null): string {
        if (status === null) return 'status-pending';
        if (status >= 200 && status < 300) return 'status-2xx';
        if (status >= 300 && status < 400) return 'status-3xx';
        if (status >= 400 && status < 500) return 'status-4xx';
        if (status >= 500) return 'status-5xx';
        return '';
    }

    formatBody(body: unknown): string {
        if (body === null || body === undefined || body === '') return '';
        try { return JSON.stringify(body, null, 2); } catch { return String(body); }
    }

    formatTime(date: Date): string { return new Date(date).toLocaleTimeString(); }
}
