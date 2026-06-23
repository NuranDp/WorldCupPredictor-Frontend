import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PwaInstallPromptComponent } from './shared/pwa-install-prompt/pwa-install-prompt.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, PwaInstallPromptComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {}
