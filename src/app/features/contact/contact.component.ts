import { Component, inject, OnInit } from '@angular/core';
import { SeoService } from '../../core/services/seo.service';

@Component({
  selector: 'app-contact',
  standalone: true,
  template: `
    <div class="contact-page">
      <div class="contact-card">
        <div class="contact-icon">⚽</div>
        <h1 class="contact-title">Contact Us</h1>
        <p class="contact-desc">
          Have a question, suggestion, or just want to say hi?<br>
          Reach out to us on Facebook — we'd love to hear from you!
        </p>
        <a
          href="https://www.facebook.com/share/1Ky9JzeZBq/"
          target="_blank"
          rel="noopener noreferrer"
          class="fb-btn">
          <svg class="fb-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073C0 18.1 4.388 23.094 10.125 24v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.791-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.97h-1.513c-1.491 0-1.956.93-1.956 1.883v2.286h3.328l-.532 3.49h-2.796V24C19.612 23.094 24 18.1 24 12.073z"/>
          </svg>
          Message us on Facebook
        </a>
        <div class="contact-divider">
          <span>or email us directly</span>
        </div>
        <a href="mailto:support@predictthechampion.com" class="email-btn">
          ✉️ support&#64;predictthechampion.com
        </a>
        <p class="contact-response">We typically respond within 24 hours.</p>
      </div>
    </div>
  `,
  styles: [`
    .contact-page {
      min-height: 70vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px 16px;
    }
    .contact-card {
      background: white;
      border-radius: 20px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
      padding: 48px 40px;
      max-width: 480px;
      width: 100%;
      text-align: center;
    }
    .contact-icon { font-size: 3rem; margin-bottom: 16px; }
    .contact-title {
      font-size: 1.8rem; font-weight: 900;
      color: #1a237e; margin: 0 0 16px;
    }
    .contact-desc {
      font-size: 0.95rem; color: #555;
      line-height: 1.7; margin: 0 0 32px;
    }
    .fb-btn {
      display: inline-flex; align-items: center; gap: 10px;
      background: #1877f2; color: white; text-decoration: none;
      padding: 14px 28px; border-radius: 50px;
      font-size: 1rem; font-weight: 700; transition: all 0.2s;
      box-shadow: 0 4px 14px rgba(24,119,242,0.35);
    }
    .fb-btn:hover {
      background: #1565c0;
      box-shadow: 0 6px 20px rgba(24,119,242,0.45);
      transform: translateY(-2px);
    }
    .fb-icon { width: 22px; height: 22px; flex-shrink: 0; }
    .contact-divider {
      display: flex; align-items: center; gap: 10px;
      margin: 20px 0; color: #bbb; font-size: 0.8rem;
    }
    .contact-divider::before, .contact-divider::after {
      content: ''; flex: 1; height: 1px; background: #e0e0e0;
    }
    .email-btn {
      display: inline-flex; align-items: center; gap: 8px;
      background: #f5f5f5; color: #1a237e; text-decoration: none;
      padding: 12px 24px; border-radius: 50px;
      font-size: 0.9rem; font-weight: 700;
      border: 2px solid #e0e0e0;
      transition: all 0.2s; word-break: break-all;
    }
    .email-btn:hover {
      background: #e8eaf6; border-color: #1a237e;
      transform: translateY(-2px);
    }
    .contact-response { margin: 20px 0 0; font-size: 0.8rem; color: #aaa; }
    @media (max-width: 480px) {
      .contact-card { padding: 36px 24px; }
      .contact-title { font-size: 1.5rem; }
    }
  `],
})
export class ContactComponent implements OnInit {
  private readonly seo = inject(SeoService);

  ngOnInit(): void {
    this.seo.set({
      title: 'Contact | Predict The Champion',
      description: 'Get in touch with the Predict The Champion team.',
      url: '/contact',
    });
  }
}
