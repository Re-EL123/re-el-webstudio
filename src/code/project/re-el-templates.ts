// re-el-templates.ts — Pre-built vertical landing page templates in Re-EL Navy & Gold (SaaS, E-commerce, Portfolio)

export interface ReelTemplate {
  id: string;
  name: string;
  category: 'SaaS' | 'E-commerce' | 'Portfolio';
  description: string;
  code: string;
}

export const REEL_TEMPLATES: ReelTemplate[] = [
  {
    id: 'reel-saas',
    name: 'Re-EL SaaS Cloud Platform',
    category: 'SaaS',
    description: 'High-converting SaaS landing page styled in Deep Navy (#020A2B) and Re-EL Gold (#FFD700).',
    code: `'use client';
import React from 'react';
export default function SaaSPage() {
  return (
    <div data-id="saas-root" data-name="SaaS Landing" style={{
      position: 'relative', width: '100%', minHeight: '900px',
      backgroundColor: '#020A2B', color: '#FFFFFF', fontFamily: 'Inter, sans-serif', padding: '60px 40px'
    }}>
      <nav data-id="nav" data-name="Header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '80px' }}>
        <h2 data-id="logo" data-name="Logo" style={{ color: '#FFD700', fontSize: '24px', fontWeight: '800' }}>Re-EL Cloud</h2>
        <button data-id="nav-cta" data-name="CTA" style={{ backgroundColor: '#FFD700', color: '#020A2B', padding: '10px 20px', borderRadius: '6px', fontWeight: '700', border: 'none' }}>Sign In</button>
      </nav>
      <main data-id="hero" data-name="Hero" style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
        <h1 data-id="hero-title" data-name="Headline" style={{ color: '#FFD700', fontSize: '56px', fontWeight: '900', lineHeight: '1.2', marginBottom: '24px' }}>
          Scale Your Architecture with Re-EL
        </h1>
        <p data-id="hero-desc" data-name="Description" style={{ color: '#E5E7EB', fontSize: '20px', lineHeight: '1.6', marginBottom: '40px' }}>
          Enterprise-grade cloud solutions powered by high-performance code generation and visual design.
        </p>
        <button data-id="hero-btn" data-name="Get Started" style={{ backgroundColor: '#FFD700', color: '#020A2B', padding: '16px 32px', borderRadius: '8px', fontSize: '18px', fontWeight: '700', border: 'none', cursor: 'pointer' }}>
          Start Free Trial
        </button>
      </main>
    </div>
  );
}
`,
  },
  {
    id: 'reel-ecommerce',
    name: 'Re-EL Luxury E-Commerce',
    category: 'E-commerce',
    description: 'Boutique store front styled in Re-EL Navy (#06124A), Gold (#FFD700), and White (#FFFFFF).',
    code: `'use client';
import React from 'react';
export default function EcommercePage() {
  return (
    <div data-id="ecom-root" data-name="Storefront" style={{
      position: 'relative', width: '100%', minHeight: '900px',
      backgroundColor: '#06124A', color: '#FFFFFF', fontFamily: 'Inter, sans-serif', padding: '40px'
    }}>
      <header data-id="store-header" data-name="Store Header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #1E3A8A', paddingBottom: '20px', marginBottom: '60px' }}>
        <h1 data-id="store-title" data-name="Brand" style={{ color: '#FFD700', fontSize: '28px', fontWeight: '800' }}>Re-EL Boutique</h1>
        <div data-id="cart" data-name="Cart" style={{ color: '#FFFFFF', fontWeight: '600' }}>Cart (0)</div>
      </header>
      <section data-id="banner" data-name="Promo Banner" style={{ textAlign: 'center', padding: '80px 20px', backgroundColor: '#020A2B', borderRadius: '12px', border: '1px solid #D4AF00' }}>
        <h2 style={{ color: '#FFD700', fontSize: '42px', fontWeight: '800', marginBottom: '16px' }}>New Autumn Collection</h2>
        <p style={{ color: '#E5E7EB', fontSize: '18px', marginBottom: '30px' }}>Discover artisanal luxury crafted for the modern aesthetic.</p>
        <button style={{ backgroundColor: '#FFD700', color: '#020A2B', padding: '14px 28px', borderRadius: '6px', fontWeight: '700', border: 'none' }}>Shop Collection</button>
      </section>
    </div>
  );
}
`,
  },
  {
    id: 'reel-portfolio',
    name: 'Re-EL Creative Portfolio',
    category: 'Portfolio',
    description: 'Sleek designer portfolio featuring Slate Blue (#1E3A8A), Purple Accent (#6A0DAD), and Re-EL Gold (#FFD700).',
    code: `'use client';
import React from 'react';
export default function PortfolioPage() {
  return (
    <div data-id="port-root" data-name="Portfolio" style={{
      position: 'relative', width: '100%', minHeight: '900px',
      backgroundColor: '#020A2B', color: '#FFFFFF', fontFamily: 'Inter, sans-serif', padding: '60px'
    }}>
      <header data-id="port-nav" data-name="Navigation" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '100px' }}>
        <span style={{ color: '#FFD700', fontSize: '20px', fontWeight: '800' }}>Re-EL Studio</span>
        <div style={{ display: 'flex', gap: '24px', color: '#E5E7EB', fontWeight: '600' }}>
          <span>Work</span><span>About</span><span>Contact</span>
        </div>
      </header>
      <main style={{ maxWidth: '900px' }}>
        <p style={{ color: '#00B894', fontSize: '16px', fontWeight: '700', marginBottom: '12px' }}>AVAILABLE FOR FREELANCE</p>
        <h1 style={{ color: '#FFFFFF', fontSize: '64px', fontWeight: '900', lineHeight: '1.1', marginBottom: '24px' }}>
          Digital Craft & Visual Engineering.
        </h1>
        <p style={{ color: '#E5E7EB', fontSize: '22px', lineHeight: '1.5', marginBottom: '40px' }}>
          Building high-performance web applications and immersive brand experiences.
        </p>
        <button style={{ backgroundColor: '#6A0DAD', color: '#FFFFFF', padding: '14px 28px', borderRadius: '8px', fontWeight: '700', border: 'none' }}>
          Let's Talk
        </button>
      </main>
    </div>
  );
}
`,
  },
];
