import { Injectable, inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';

export interface SeoData {
  title: string;
  description: string;
  url?: string;
}

const OG_IMAGE = 'https://www.predictthechampion.com/og-image.png';
const BASE_URL = 'https://www.predictthechampion.com';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly title = inject(Title);
  private readonly meta  = inject(Meta);

  set(data: SeoData): void {
    const url = data.url ? `${BASE_URL}${data.url}` : BASE_URL;

    this.title.setTitle(data.title);

    // Basic
    this.meta.updateTag({ name: 'description', content: data.description });

    // Open Graph
    this.meta.updateTag({ property: 'og:title',       content: data.title });
    this.meta.updateTag({ property: 'og:description',  content: data.description });
    this.meta.updateTag({ property: 'og:type',         content: 'website' });
    this.meta.updateTag({ property: 'og:url',          content: url });
    this.meta.updateTag({ property: 'og:image',        content: OG_IMAGE });

    // Twitter
    this.meta.updateTag({ name: 'twitter:card',        content: 'summary_large_image' });
    this.meta.updateTag({ name: 'twitter:title',       content: data.title });
    this.meta.updateTag({ name: 'twitter:description', content: data.description });
  }
}
