import { EnvironmentProviders, makeEnvironmentProviders, APP_INITIALIZER, ApplicationRef, createComponent, EnvironmentInjector } from '@angular/core';
import { NgxHttpLabConfig } from './models/ngx-http-lab-config.model';
import { NgxHttpLabService, configureNgxHttpLab } from './ngx-http-lab.service';
import { NgxHttpLabHostComponent } from './components/ngx-http-lab-host/ngx-http-lab-host.component';

export { ngxHttpLabInterceptor } from './interceptors/ngx-http-lab.interceptor';

/**
 * Factory to inject the http lab host component into the DOM automatically
 */
function injectNgxHttpLabHost(appRef: ApplicationRef, injector: EnvironmentInjector) {
    return () => {
        // Create the component and attach it to the application reference
        const hostComponent = createComponent(NgxHttpLabHostComponent, {
            environmentInjector: injector
        });

        // Attach to Angular's change detection
        appRef.attachView(hostComponent.hostView);

        // Append it to the document body
        document.body.appendChild(hostComponent.location.nativeElement);
    };
}

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
    // Also provide the APP_INITIALIZER to auto-mount the host component
    return makeEnvironmentProviders([
        NgxHttpLabService,
        {
            provide: APP_INITIALIZER,
            useFactory: injectNgxHttpLabHost,
            deps: [ApplicationRef, EnvironmentInjector],
            multi: true
        }
    ]);
}

/**
 * Helper: use inside provideHttpClient() to register the interceptor.
 */
export { withInterceptors as _withInterceptors } from '@angular/common/http';
