import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Check, Zap, Building2, Users } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const tiers = [
  {
    name: 'Free',
    price: '$0',
    period: '/month',
    description: 'Perfect for getting started',
    icon: Zap,
    features: [
      '3 projects',
      'Limited tokens',
      'Shared GPU',
      'Community support',
      'Basic tokenization',
    ],
    cta: 'Start free',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$29',
    period: '/month',
    description: 'For serious builders',
    icon: Users,
    features: [
      'Unlimited projects',
      'Faster GPU',
      'API export',
      'Priority support',
      'Advanced training',
      'Custom models',
    ],
    cta: 'Start Pro trial',
    highlighted: true,
  },
  {
    name: 'Business',
    price: '$199',
    period: '/month',
    description: 'For teams and organizations',
    icon: Building2,
    features: [
      'Team workspace',
      'Private models',
      'Dedicated compute',
      'SSO & SAML',
      'Audit logs',
      'SLA guarantee',
      'Custom contracts',
    ],
    cta: 'Contact sales',
    highlighted: false,
  },
];

export default function PricingSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const section = sectionRef.current;
    const header = headerRef.current;
    const cards = cardsRef.current.filter(Boolean);

    if (!section || !header || cards.length === 0) return;

    const ctx = gsap.context(() => {
      // Header animation
      gsap.fromTo(header,
        { y: 20, opacity: 0 },
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

      // Cards animation with stagger
      cards.forEach((card, index) => {
        gsap.fromTo(card,
          { y: 60, opacity: 0, rotateX: 12 },
          {
            y: 0,
            opacity: 1,
            rotateX: 0,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: section,
              start: 'top 70%',
              end: 'top 40%',
              scrub: true,
            },
            delay: index * 0.12,
          }
        );
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="pricing"
      className="relative w-full bg-light grain-overlay py-20 lg:py-32 z-[80]"
    >
      {/* Hairline Grid Background */}
      <div className="absolute inset-0 hairline-grid opacity-60" />

      {/* Content */}
      <div className="relative w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1120px] mx-auto">
          {/* Header */}
          <div ref={headerRef} className="text-center mb-12 lg:mb-16 will-change-transform">
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl text-dark mb-4">
              Simple pricing.
            </h2>
            <p className="text-base lg:text-lg text-gray-text max-w-md mx-auto">
              Start free. Upgrade when you need more power.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="flex flex-col lg:flex-row items-stretch justify-center gap-6 lg:gap-8">
            {tiers.map((tier, index) => {
              const Icon = tier.icon;
              return (
                <div
                  key={tier.name}
                  ref={(el) => { cardsRef.current[index] = el; }}
                  className={`w-full lg:w-[30vw] lg:max-w-[360px] rounded-3xl p-6 lg:p-8 flex flex-col will-change-transform hover:-translate-y-1.5 transition-transform duration-300 ${
                    tier.highlighted
                      ? 'bg-white border-2 border-cyan card-shadow'
                      : 'bg-white border border-[rgba(11,12,16,0.08)] card-shadow'
                  }`}
                >
                  {/* Tier Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      tier.highlighted ? 'bg-cyan/10' : 'bg-light'
                    }`}>
                      <Icon className={`w-5 h-5 ${tier.highlighted ? 'text-cyan' : 'text-gray-text'}`} />
                    </div>
                    <div>
                      <h3 className="font-heading text-xl text-dark">{tier.name}</h3>
                      {tier.highlighted && (
                        <span className="font-mono text-[10px] uppercase tracking-wider text-cyan">Most Popular</span>
                      )}
                    </div>
                  </div>

                  {/* Price */}
                  <div className="mb-4">
                    <span className="font-heading text-4xl lg:text-5xl text-dark">{tier.price}</span>
                    <span className="text-gray-text">{tier.period}</span>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-text mb-6">{tier.description}</p>

                  {/* Features */}
                  <ul className="space-y-3 mb-8 flex-1">
                    {tier.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${
                          tier.highlighted ? 'bg-cyan/10' : 'bg-light'
                        }`}>
                          <Check className={`w-3 h-3 ${tier.highlighted ? 'text-cyan' : 'text-gray-text'}`} />
                        </div>
                        <span className="text-sm text-dark">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  <button
                    className={`w-full py-3 rounded-full font-medium transition-all duration-200 ${
                      tier.highlighted
                        ? 'bg-cyan text-dark hover:bg-cyan-dark'
                        : 'bg-dark text-white hover:bg-dark-light'
                    }`}
                  >
                    {tier.cta}
                  </button>
                </div>
              );
            })}
          </div>

          {/* Micro Note */}
          <p className="text-center font-mono text-xs text-gray-text mt-8">
            Prices in USD. Billed monthly or annually.
          </p>
        </div>
      </div>
    </section>
  );
}
