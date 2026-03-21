import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, MessageCircle, Twitter, Github, Linkedin } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const footerLinks = {
  Product: ['Features', 'Pricing', 'Integrations', 'Changelog'],
  Resources: ['Docs', 'API Reference', 'Tutorials', 'Blog'],
  Company: ['About', 'Careers', 'Contact', 'Press'],
  Legal: ['Privacy', 'Terms', 'Security', 'Cookies'],
};

const socialLinks = [
  { icon: Twitter, href: '#' },
  { icon: Github, href: '#' },
  { icon: Linkedin, href: '#' },
  { icon: MessageCircle, href: '#' },
];

export default function FinalCTASection() {
  const sectionRef = useRef<HTMLElement>(null);
  const ctaCardRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const ctaCard = ctaCardRef.current;

    if (!section || !ctaCard) return;

    const ctx = gsap.context(() => {
      // CTA card animation
      gsap.fromTo(ctaCard,
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
            end: 'top 50%',
            scrub: true,
          },
        }
      );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full bg-dark grain-overlay py-16 lg:py-24 z-[90]"
    >
      {/* Grain overlay for dark background */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div 
          className="w-full h-full"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            mixBlendMode: 'overlay',
          }}
        />
      </div>

      {/* Content */}
      <div className="relative w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-[920px] mx-auto">
          {/* CTA Card */}
          <div
            ref={ctaCardRef}
            className="bg-dark-light/50 backdrop-blur-sm rounded-3xl border border-[rgba(246,247,249,0.10)] p-8 lg:p-12 mb-16 will-change-transform"
          >
            <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl text-white mb-4 text-center">
              Build AI from your own data—without writing code.
            </h2>
            <p className="text-base text-[#A1A7B3] text-center mb-8 max-w-lg mx-auto">
              Upload, tokenize, train, and deploy in minutes. Join the teams shipping private AI today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#pricing"
                className="btn-cyan flex items-center gap-2 group"
              >
                Start free
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href="#"
                className="text-white font-medium hover:text-cyan transition-colors"
              >
                Talk to sales
              </a>
            </div>
          </div>

          {/* Footer */}
          <footer ref={footerRef} className="border-t border-[rgba(246,247,249,0.10)] pt-12">
            {/* Footer Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
              {Object.entries(footerLinks).map(([category, links]) => (
                <div key={category}>
                  <h4 className="font-mono text-xs uppercase tracking-wider text-[#A1A7B3] mb-4">
                    {category}
                  </h4>
                  <ul className="space-y-3">
                    {links.map((link) => (
                      <li key={link}>
                        <a
                          href="#"
                          className="text-sm text-white hover:text-cyan transition-colors"
                        >
                          {link}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            {/* Footer Bottom */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-[rgba(246,247,249,0.10)]">
              {/* Logo */}
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                  <span className="text-dark font-heading font-bold text-sm">V</span>
                </div>
                <span className="font-heading font-semibold text-lg text-white">VSpay</span>
              </div>

              {/* Copyright */}
              <p className="text-xs text-[#A1A7B3]">
                © 2024 VSpay. All rights reserved.
              </p>

              {/* Social Links */}
              <div className="flex items-center gap-4">
                {socialLinks.map((social, index) => {
                  const Icon = social.icon;
                  return (
                    <a
                      key={index}
                      href={social.href}
                      className="w-9 h-9 rounded-full border border-[rgba(246,247,249,0.10)] flex items-center justify-center text-[#A1A7B3] hover:text-white hover:border-white transition-colors"
                    >
                      <Icon className="w-4 h-4" />
                    </a>
                  );
                })}
              </div>
            </div>
          </footer>
        </div>
      </div>
    </section>
  );
}
