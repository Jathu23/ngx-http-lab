import { InjectionToken } from '@angular/core';

export interface NgxHttpLabConfig {
    /** Enable or disable the interceptor. Set false for production. */
    enabled?: boolean;
    /** Max number of logs to keep in memory. Default: 200 */
    maxLogs?: number;
}

export const NGX_HTTP_LAB_CONFIG = new InjectionToken<NgxHttpLabConfig>('NGX_HTTP_LAB_CONFIG');
