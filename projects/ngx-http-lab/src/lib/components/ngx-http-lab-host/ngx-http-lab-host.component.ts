import { Component, signal } from '@angular/core';
import { NgxHttpLabPanelComponent } from '../ngx-http-lab-panel/ngx-http-lab-panel.component';

@Component({
  selector: 'ngx-http-lab-host',
  standalone: true,
  imports: [NgxHttpLabPanelComponent],
  template: `
    <!-- Floating toggle button -->
    <button class="__nhlab-fab" (click)="open.set(!open())" [title]="open() ? 'Close Dev Lab' : 'Open Http Lab'">
      🧪
    </button>

    <!-- Full-screen overlay -->
    @if (open()) {
      <div class="__nhlab-overlay">
        <div class="__nhlab-header">
          <span>🧪 ngx-http-lab</span>
          <button (click)="open.set(false)">✕ Close</button>
        </div>
        <div class="__nhlab-body">
          <ngx-http-lab-panel />
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: contents; }

    .__nhlab-fab {
      position: fixed;
      bottom: 24px;
      right: 24px;
      width: 52px;
      height: 52px;
      border-radius: 50%;
      background: #7c3aed;
      color: #fff;
      border: none;
      font-size: 22px;
      cursor: pointer;
      z-index: 2147483640;
      box-shadow: 0 4px 20px rgba(124,58,237,0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: transform 0.2s, box-shadow 0.2s;
      line-height: 1;
      &:hover {
        transform: scale(1.12);
        box-shadow: 0 6px 28px rgba(124,58,237,0.7);
      }
    }

    .__nhlab-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483639;
      display: flex;
      flex-direction: column;
      background: #0f0f12;
      font-family: 'Segoe UI', system-ui, sans-serif;
    }

    .__nhlab-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 16px;
      background: #18181f;
      border-bottom: 1px solid #2a2a38;
      color: #a78bfa;
      font-weight: 700;
      font-size: 14px;
      flex-shrink: 0;
      button {
        background: transparent;
        border: 1px solid #3a3a50;
        color: #94a3b8;
        padding: 4px 14px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 12px;
        &:hover { background: #2a2a38; color: #fff; }
      }
    }

    .__nhlab-body {
      flex: 1;
      overflow: auto;
      min-height: 0;
    }
  `]
})
export class NgxHttpLabHostComponent {
  readonly open = signal(false);
}
