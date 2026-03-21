import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { ArrowRight, Code, MessageSquare, Download } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const features = [
  { icon: Code, text: 'API with auto-generated docs' },
  { icon: MessageSquare, text: 'Embeddable chatbot (HTML/JS)' },
  { icon: Download, text: 'Model checkpoint download' },
];

export default function FeatureSpotlightSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const floatingCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const image = imageRef.current;
    const text = textRef.current;
    const floatingCard = floatingCardRef.current;

    if (!section || !image || !text || !floatingCard) return;

    const ctx = gsap.context(() => {
      // Image block animation
      gsap.fromTo(image,
        { x: '-8vw', opacity: 0, scale: 0.98 },
        {
          x: 0,
          opacity: 1,
          scale: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
            end: 'top 30%',
            scrub: true,
          },
        }
      );

      // Text block animation
      gsap.fromTo(text,
        { x: '8vw', opacity: 0 },
        {
          x: 0,
          opacity: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 80%',
            end: 'top 30%',
            scrub: true,
          },
        }
      );

      // Floating card animation
      gsap.fromTo(floatingCard,
        { y: 40, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: section,
            start: 'top 70%',
            end: 'top 40%',
            scrub: true,
          },
        }
      );

      // Parallax on floating card
      gsap.to(floatingCard, {
        y: -20,
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top bottom',
          end: 'bottom top',
          scrub: true,
        },
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="features"
      className="relative w-full bg-light grain-overlay py-20 lg:py-32 z-40"
    >
      {/* Hairline Grid Background */}
      <div className="absolute inset-0 hairline-grid opacity-60" />

      {/* Content */}
      <div className="relative w-full px-4 sm:px-6 lg:px-8">
        <div className="max-w-[1100px] mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
            {/* Image Block */}
            <div
              ref={imageRef}
              className="w-full lg:w-[52%] relative will-change-transform"
            >
              <div className="relative rounded-3xl overflow-hidden card-shadow">
                <img
                  src="/feature-workspace.jpg"
                  alt="Modern workspace"
                  className="w-full h-auto object-cover"
                />

                {/* Floating Info Card */}
                <div
                  ref={floatingCardRef}
                  className="absolute bottom-4 left-4 right-4 lg:bottom-6 lg:left-6 lg:right-auto bg-white/95 backdrop-blur-sm rounded-2xl p-4 lg:p-5 border border-[rgba(11,12,16,0.08)] shadow-lg will-change-transform"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-lg bg-cyan/10 flex items-center justify-center">
                      <Code className="w-4 h-4 text-cyan" />
                    </div>
                    <span className="font-mono text-xs text-gray-text">API READY</span>
                  </div>
                  <p className="text-sm font-medium text-dark">Deploy with one click</p>
                </div>
              </div>
            </div>

            {/* Text Block */}
            <div
              ref={textRef}
              className="w-full lg:w-[44%] will-change-transform"
            >
              {/* Eyebrow */}
              <div className="flex items-center gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-cyan" />
                <span className="eyebrow">DEPLOY ANYWHERE</span>
              </div>

              {/* Headline */}
              <h2 className="font-heading text-2xl sm:text-3xl lg:text-4xl text-dark mb-4">
                One training run. Multiple outputs.
              </h2>

              {/* Body */}
              <p className="text-base text-gray-text leading-relaxed mb-6">
                Export a private API endpoint, embed a chat widget, or download the model for on-premise use.
              </p>

              {/* Features List */}
              <ul className="space-y-3 mb-8">
                {features.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <li key={index} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-cyan/10 flex items-center justify-center flex-shrink-0">
                        <div className="w-2 h-2 rounded-full bg-cyan" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-gray-text" strokeWidth={1.5} />
                        <span className="text-sm text-dark">{feature.text}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* CTA */}
              <a
                href="#"
                className="inline-flex items-center gap-2 text-sm font-medium text-dark hover:text-cyan transition-colors group"
              >
                See integrations
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
