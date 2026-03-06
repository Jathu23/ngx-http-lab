# ngx-http-lab 🧪

A powerful, Postman-style HTTP debugging and mocking panel for Angular applications — zero setup, zero production overhead.

`ngx-http-lab` injects a floating dev panel directly inside your Angular app, giving you full control to inspect, mock, and modify HTTP requests in real time — without touching the real backend.

> **Developer-only** — when `enabled: false` (production), the library does absolutely nothing.

---

## Features ✨

### 📋 Network Logs
- Real-time log of every HTTP request/response made by Angular's `HttpClient`
- Columns: Method, URL, Status, Duration, Mocked/Modified flags
- Click any row to expand: Request Headers, Request Body, Response Body
- Filter by URL or method
- Export logs as JSON

### ⚙️ Postman-Style Rule Builder
- **Rule Name** — friendly label for each rule
- **Method** picker — GET, POST, PUT, DELETE, PATCH, or `*` (any)
- **URL pattern** — substring match (e.g. `/api/users`)
- **Query Param Matcher** — key=value rows; rule only fires when URL contains these params
- **Clone Rule** — duplicate a rule with one click

### 🎭 Scenario-Based Mock Responses
Each rule supports **multiple Scenarios** — switch between them without creating new rules:
- **Visual status code picker** — click 200 / 201 / 400 / 401 / 404 / 500 etc.
- Custom status code input
- Response Body (JSON)
- Artificial delay (ms)
- **Body Subset Match (per scenario)** — scenario fires only when request body contains a specific JSON subset (e.g. `{"role":"admin"}`)
- Mark one scenario as **Active** — that's the default response
- Body-matching scenarios override the active one automatically

### ✏️ Request Modifier
Intercept and mutate the outgoing request before it hits the server:
- **Add/Override Query Params** — key=value rows appended to the URL
- **Add/Override Headers** — key=value rows injected into request headers
- **Patch Request Body** — JSON deep-merge onto the existing body

### 🔑 JWT Override
Paste a Bearer token once → every outgoing request automatically gets `Authorization: Bearer <token>`. Clear it any time.

### 💾 Persistent Storage (Zero Config)
- Rules persist across **page refreshes** (sessionStorage — instant, synchronous)
- Rules persist across **tab close / browser restart** (IndexedDB)
- **`localStorage.clear()` in console will NOT affect rules** — different storage layers
- Automatic — no setup needed

---

## Installation 📦

```bash
npm install ngx-http-lab --save-dev
```

> Requires Angular 17+

---

## Setup 🛠️

In `app.config.ts`:

```typescript
import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideNgxHttpLab, ngxHttpLabInterceptor } from 'ngx-http-lab';
import { environment } from '../environments/environment';

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([
      ngxHttpLabInterceptor   // ← add this
    ])),
    provideNgxHttpLab({
      enabled: !environment.production, // ← always false in prod
      maxLogs: 200
    })
  ]
};
```

**That's it! 🎉** A floating `🧪` button appears in the bottom-right corner of your app automatically.

---

## Usage 💡

1. Click the **`🧪` button** to open the Dev Lab panel.
2. **Logs tab** — watch HTTP calls appear in real time. Click a row to inspect headers and bodies.
3. **Rules tab** — click `＋ New Rule` to set up a mock or modifier:
   - Enter a URL pattern and method.
   - Add **Query Param** matchers to narrow the match.
   - In the **Mock** tab: add scenarios, pick a status code, write a response body, set delay.
   - In the **Modify** tab: add query params, headers, or body patch to override the outgoing request.
   - Click **⎘ Clone** on any rule to duplicate it.
4. **JWT tab** — paste a token to override all request Authorization headers.

---

## Intercept Rule Model

```typescript
interface InterceptRule {
  id: string;
  name: string;
  urlPattern: string;    // substring match
  method: string;        // 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | '*'
  enabled: boolean;
  matchCriteria?: {
    queryParams?: KeyValuePair[];   // match URL query params
    bodySubset?: any;               // match request body subset
  };
  scenarios?: MockScenario[];       // multiple mock responses
  modifyRequest?: {
    queryParams?: KeyValuePair[];   // add/override query params
    headers?: KeyValuePair[];       // add/override headers
    bodyPatch?: Record<string, unknown>; // deep-patch request body
  };
}

interface MockScenario {
  id: string;
  name: string;
  status: number;
  body: unknown;
  delayMs?: number;
  isActive: boolean;
  matchBodySubset?: any;  // only fire this scenario when body contains this JSON
}
```

---

## How it Works ⚙️

- Uses **module-level singleton signals** — the interceptor and the UI panel always share the same state, regardless of Angular DI injector tree.
- The UI panel is injected into `document.body` via `APP_INITIALIZER` (no template changes needed).
- Rules are persisted using **sessionStorage** (synchronous, survives F5) + **IndexedDB** (survives tab close).
- Smart scenario selection: if a scenario has `matchBodySubset`, it fires when the request body matches — overriding the default active scenario.

---

## License

MIT
