import { Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxHttpLabService } from '../../ngx-http-lab.service';
import { ApiLog } from '../../models/api-log.model';
import { InterceptRule } from '../../models/intercept-rule.model';

type MethodFilter = 'ALL' | 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
type StatusFilter = 'ALL' | '2xx' | '3xx' | '4xx' | '5xx' | 'pending';

@Component({
    selector: 'ngx-http-lab-panel',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './ngx-http-lab-panel.component.html',
    styleUrls: ['./ngx-http-lab-panel.component.scss']
})
export class NgxHttpLabPanelComponent {
    readonly service = inject(NgxHttpLabService);

    // Active tab
    activeTab = signal<'logs' | 'rules' | 'jwt'>('logs');

    // Selected log for detail view
    selectedLog = signal<ApiLog | null>(null);

    // Filters
    urlFilter = signal<string>('');
    methodFilter = signal<MethodFilter>('ALL');
    statusFilter = signal<StatusFilter>('ALL');

    readonly methodOptions: MethodFilter[] = ['ALL', 'GET', 'POST', 'PUT', 'DELETE', 'PATCH'];
    readonly statusOptions: StatusFilter[] = ['ALL', '2xx', '3xx', '4xx', '5xx', 'pending'];

    // Filtered logs
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

    // JWT
    jwtInput = signal<string>('');
    applyJwt(): void {
        const token = this.jwtInput().trim();
        this.service.setJwt(token || null);
    }
    clearJwt(): void {
        this.jwtInput.set('');
        this.service.setJwt(null);
    }

    // New Rule form
    newRule = signal<Partial<InterceptRule>>({
        urlPattern: '',
        method: '*',
        enabled: true,
        modifyRequest: undefined,
        mockResponse: undefined
    });
    newRuleMode = signal<'request' | 'mock'>('mock');
    newMockBody = signal<string>('{\n  \n}');
    newMockStatus = signal<number>(200);
    newReqHeaderKey = signal<string>('');
    newReqHeaderVal = signal<string>('');
    newBodyPatch = signal<string>('{\n  \n}');

    updateNewRule(field: string, value: unknown): void {
        this.newRule.update(r => ({ ...r, [field]: value }));
    }

    addRule(): void {
        const rule = this.newRule();
        if (!rule.urlPattern?.trim()) return;

        const base: Omit<InterceptRule, 'id'> = {
            urlPattern: rule.urlPattern.trim(),
            method: rule.method || '*',
            enabled: true
        };

        if (this.newRuleMode() === 'mock') {
            let body: unknown = {};
            try { body = JSON.parse(this.newMockBody()); } catch { /* invalid json, use empty */ }
            base.mockResponse = { status: this.newMockStatus(), body };
        } else {
            const headers: Record<string, string> = {};
            if (this.newReqHeaderKey().trim()) {
                headers[this.newReqHeaderKey().trim()] = this.newReqHeaderVal().trim();
            }
            let bodyPatch: Record<string, unknown> = {};
            try { bodyPatch = JSON.parse(this.newBodyPatch()); } catch { /* ignore */ }
            base.modifyRequest = {
                headers: Object.keys(headers).length ? headers : undefined,
                bodyPatch: Object.keys(bodyPatch).length ? bodyPatch : undefined
            };
        }

        this.service.addRule(base);
        this.newRule.set({ urlPattern: '', method: '*', enabled: true });
        this.newMockBody.set('{\n  \n}');
        this.newMockStatus.set(200);
        this.newReqHeaderKey.set('');
        this.newReqHeaderVal.set('');
        this.newBodyPatch.set('{\n  \n}');
    }

    // UI helpers
    selectLog(log: ApiLog): void {
        this.selectedLog.update(current => current?.id === log.id ? null : log);
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
        if (body === null || body === undefined) return '—';
        try { return JSON.stringify(body, null, 2); } catch { return String(body); }
    }

    formatTime(date: Date): string {
        return new Date(date).toLocaleTimeString();
    }
}
