# ngx-http-lab 🧪

A powerfully simple, zero-config HTTP debugging and mocking panel for Angular applications. 

`ngx-http-lab` acts as an in-app network inspector for Angular developers. Instead of constantly opening the browser's DevTools Network tab, you get a clean, floating UI right inside your app to view, filter, modify, and mock HTTP requests on the fly. 

It is designed to be **developer-only** — with zero overhead in production builds.

## Features ✨

* 🔍 **API Call Logging:** Inspect request/response URLs, Methods, Status Codes, and Durations.
* 📦 **Payload Inspection:** View Request Headers, Request Body, and Response Body.
* ✏️ **Request Modification:** Dynamically intercept and modify request headers or body payloads before they leave the browser.
* 🎭 **Response Mocking:** Define mock responses (status code, body, and artificial delay) for specific API endpoints.
* 🔑 **JWT Override:** Inject a custom Bearer token into all outgoing requests.
* ⚡ **Zero-Config UI:** Just provide the module in `app.config.ts`. The floating toggle button (`🧪`) injects itself into the DOM automatically.
* 🛡️ **Production Safe:** When the `enabled` config flag is false (e.g., in production), the library completely bypasses itself.

---

## Installation 📦

Install via npm:

```bash
npm install ngx-http-lab --save-dev
```

*(Note: Requires Angular 17+)*

---

## Setup (Zero-Config) 🛠️

In an Angular standalone application, open your `app.config.ts` and add `provideNgxHttpLab()` and `ngxHttpLabInterceptor`:

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideNgxHttpLab, ngxHttpLabInterceptor } from 'ngx-http-lab';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    // 1. Add the interceptor to your HttpClient
    provideHttpClient(withInterceptors([
      // ... your other interceptors (like auth),
      ngxHttpLabInterceptor 
    ])),

    // 2. Provide the library (pass enabled: false for production)
    provideNgxHttpLab({ 
      enabled: !environment.production,
      maxLogs: 200 // Optional: defaults to 200
    })
  ]
};
```

**That's it! 🎉** 

There is **no need** to modify your `index.html` or `app.component.html`. 
When your app runs (and `enabled` is `true`), a floating `🧪` button will automatically appear in the bottom-right corner of your screen. 

---

## Usage 💡

1. Click the floating `🧪` button to open the Dev Lab.
2. **Network Logs Tab**: As your application makes HTTP calls using Angular's `HttpClient`, they will appear here in real-time. Click any row to expand and view Headers and Body payloads.
3. **Intercept Rules Tab**: Click "Add Rule" to define paths you want to intercept.
   - You can match by URL snippet (e.g., `/api/users`) and Method (e.g., `GET`).
   - Use the **Mock Response** section to return fake data instantly without hitting the real server.
   - Use the **Modify Request** section to append headers or patch the JSON body.
4. **JWT Override Tab**: Paste a token here to force every request to include `Authorization: Bearer <token>`.

---

## How it works under the hood ⚙️

- The library uses a true JavaScript module-level singleton state. This guarantees that the interceptor capturing the network requests and the UI Panel displaying them are always reading from the exact same state, regardless of complex Dependency Injection injector contexts.
- The UI Panel is automatically injected into the `document.body` using an `APP_INITIALIZER` factory, which seamlessly mounts `NgxHttpLabHostComponent` to the DOM.

---

## License

MIT
