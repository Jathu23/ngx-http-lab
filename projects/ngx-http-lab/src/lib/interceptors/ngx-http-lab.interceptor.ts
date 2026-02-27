import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpResponse, HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { tap, catchError, delay } from 'rxjs/operators';
import {
    ngxHttpLabEnabled,
    ngxHttpLabJwt,
    ngxHttpLabFindRule,
    ngxHttpLabAddLog,
    ngxHttpLabUpdateLog
} from '../ngx-http-lab.service';
import { ApiLog } from '../models/api-log.model';

export const ngxHttpLabInterceptor: HttpInterceptorFn = (
    req: HttpRequest<unknown>,
    next: HttpHandlerFn
) => {
    // If disabled — passthrough immediately, zero overhead
    if (!ngxHttpLabEnabled()) {
        return next(req);
    }

    const id = crypto.randomUUID();
    const startTime = Date.now();

    // Collect request headers
    const requestHeaders: Record<string, string> = {};
    req.headers.keys().forEach(key => {
        requestHeaders[key] = req.headers.get(key) ?? '';
    });

    let modifiedReq = req;

    // 1. Inject JWT override if set
    const jwt = ngxHttpLabJwt();
    if (jwt) {
        modifiedReq = modifiedReq.clone({
            setHeaders: { Authorization: `Bearer ${jwt}` }
        });
    }

    // 2. Find matching intercept rule
    const rule = ngxHttpLabFindRule(req.url, req.method);

    // 3. Apply request modifier
    if (rule?.modifyRequest) {
        const { headers: ruleHeaders, bodyPatch } = rule.modifyRequest;
        if (ruleHeaders) {
            modifiedReq = modifiedReq.clone({ setHeaders: ruleHeaders });
        }
        if (bodyPatch && modifiedReq.body && typeof modifiedReq.body === 'object') {
            modifiedReq = modifiedReq.clone({
                body: { ...(modifiedReq.body as Record<string, unknown>), ...bodyPatch }
            });
        }
    }

    // 4. Return mock response if rule says so
    if (rule?.mockResponse) {
        const mock = rule.mockResponse;
        const log: ApiLog = {
            id, timestamp: new Date(),
            method: req.method, url: req.url,
            status: mock.status, duration: mock.delayMs ?? 0,
            requestHeaders, requestBody: modifiedReq.body,
            responseBody: mock.body, isMocked: true,
            isError: mock.status >= 400
        };
        ngxHttpLabAddLog(log);
        return of(new HttpResponse({ status: mock.status, body: mock.body, url: req.url }))
            .pipe(delay(mock.delayMs ?? 0));
    }

    // 5. Log the pending request
    ngxHttpLabAddLog({
        id, timestamp: new Date(),
        method: req.method, url: req.url,
        status: null, duration: null,
        requestHeaders, requestBody: modifiedReq.body,
        responseBody: null, isMocked: false, isError: false
    });

    // 6. Send real request, capture response
    return next(modifiedReq).pipe(
        tap(event => {
            if (event instanceof HttpResponse) {
                ngxHttpLabUpdateLog(id, {
                    status: event.status,
                    duration: Date.now() - startTime,
                    responseBody: event.body,
                    isError: event.status >= 400
                });
            }
        }),
        catchError((error: HttpErrorResponse) => {
            ngxHttpLabUpdateLog(id, {
                status: error.status,
                duration: Date.now() - startTime,
                responseBody: error.error,
                isError: true
            });
            return throwError(() => error);
        })
    );
};
