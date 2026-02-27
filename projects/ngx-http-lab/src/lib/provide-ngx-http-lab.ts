import { EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { NgxHttpLabConfig } from './models/ngx-http-lab-config.model';
import { NgxHttpLabService, configureNgxHttpLab } from './ngx-http-lab.service';
export { ngxHttpLabInterceptor } from './interceptors/ngx-http-lab.interceptor';

/**
 * Register ngx-http-lab in your Angular app.
 *
 * @example
 * ```ts
 * // app.config.ts
 * import { provideNgxHttpLab, ngxHttpLabInterceptor } from 'ngx-http-lab';
 *
 * provideHttpClient(withInterceptors([yourInterceptor, ngxHttpLabInterceptor])),
 * provideNgxHttpLab({ enabled: !environment.production }),
 * ```
 */
export function provideNgxHttpLab(config?: NgxHttpLabConfig): EnvironmentProviders {
    const enabled = config?.enabled ?? true;
    const maxLogs = config?.maxLogs ?? 200;

    // Configure the module-level store immediately (no DI needed)
    configureNgxHttpLab(enabled, maxLogs);

    if (!enabled) {
        return makeEnvironmentProviders([]);
    }

    // Provide the service for Angular DI (panel component uses it for reactivity)
    return makeEnvironmentProviders([NgxHttpLabService]);
}

/**
 * Helper: use inside provideHttpClient() to register the interceptor.
 */
export { withInterceptors as _withInterceptors } from '@angular/common/http';
