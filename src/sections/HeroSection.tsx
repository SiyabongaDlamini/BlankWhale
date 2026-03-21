import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Play, ArrowRight } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export default function HeroSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const leftCardRef = useRef<HTMLDivElement>(null);
  const rightCardRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const subheadlineRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const leftCard = leftCardRef.current;
    const rightCard = rightCardRef.current;
    const headline = headlineRef.current;
    const subheadline = subheadlineRef.current;
    const cta = ctaRef.current;
    const eyebrow = eyebrowRef.current;

    if (!section || !leftCard || !rightCard || !headline || !subheadline || !cta || !eyebrow) return;

    const ctx = gsap.context(() => {
      // Initial states
      gsap.set([leftCard, rightCard], { opacity: 0 });
      gsap.set(leftCard, { x: '-12vw' });
      gsap.set(rightCard, { x: '12vw' });
      gsap.set([headline, subheadline, cta, eyebrow], { opacity: 0, y: 24 });

      // Entrance animation timeline
      const entranceTl = gsap.timeline({ delay: 0.2 });

      entranceTl
        .to([leftCard, rightCard], {
          opacity: 1,
          x: 0,
          duration: 1,
          ease: 'power2.out',
          stagger: 0.08,
        })
        .to(eyebrow, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power2.out',
        }, '-=0.5')
        .to(headline, {
          opacity: 1,
          y: 0,
          duration: 0.7,
          ease: 'power2.out',
        }, '-=0.4')
        .to(subheadline, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power2.out',
        }, '-=0.5')
        .to(cta, {
          opacity: 1,
          y: 0,
          duration: 0.6,
          ease: 'power2.out',
        }, '-=0.4');

      // Scroll-driven exit animation
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=130%',
          pin: true,
          scrub: 0.6,
          onLeaveBack: () => {
            // Reset to visible when scrolling back to top
            gsap.to([leftCard, rightCard, headline, subheadline, cta, eyebrow], {
              opacity: 1,
              x: 0,
              y: 0,
              duration: 0.3,
            });
          },
        },
      });

      // SETTLE phase (0% - 70%): hold position
      // EXIT phase (70% - 100%): cards exit
      scrollTl
        .fromTo(leftCard,
          { x: 0, opacity: 1 },
          { x: '-55vw', opacity: 0, ease: 'power2.in' },
          0.7
        )
        .fromTo(rightCard,
          { x: 0, opacity: 1 },
          { x: '55vw', opacity: 0, ease: 'power2.in' },
          0.7
        );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-screen bg-light grain-overlay overflow-hidden z-10"
    >
      {/* Hairline Grid Background */}
      <div className="absolute inset-0 hairline-grid opacity-60" />

      {/* Content Container */}
      <div className="relative w-full h-full flex items-center justify-center px-4 sm:px-6 lg:px-8 pt-16">
        <div className="w-full max-w-[1600px] flex flex-col lg:flex-row items-center justify-center gap-6 lg:gap-8">
          {/* Left Card - Image */}
          <div
            ref={leftCardRef}
            className="w-full lg:w-[46vw] lg:max-w-[600px] h-[40vh] lg:h-[75vh] rounded-3xl overflow-hidden card-shadow will-change-transform"
          >
            <img
              src="/hero-abstract.jpg"
              alt="Abstract 3D visualization"
              className="w-full h-full object-cover"
            />
          </div>

          {/* Right Card - Content */}
          <div
            ref={rightCardRef}
            className="w-full lg:w-[46vw] lg:max-w-[600px] h-auto lg:h-[75vh] bg-white rounded-3xl border border-[rgba(11,12,16,0.08)] card-shadow p-6 sm:p-8 lg:p-12 flex flex-col justify-center will-change-transform"
          >
            {/* Eyebrow */}
            <div ref={eyebrowRef} className="flex items-center gap-2 mb-4 lg:mb-6">
              <div className="w-2 h-2 rounded-full bg-cyan" />
              <span className="eyebrow">VSPAY AI TRAINING PLATFORM</span>
            </div>

            {/* Headline */}
            <h1
              ref={headlineRef}
              className="font-heading text-3xl sm:text-4xl lg:text-5xl xl:text-[56px] leading-[1.05] text-dark mb-4 lg:mb-6"
            >
              Train your own AI from files, documents, and data — visually.
            </h1>

            {/* Subheadline */}
            <p
              ref={subheadlineRef}
              className="text-base lg:text-lg text-gray-text leading-relaxed mb-6 lg:mb-8 max-w-lg"
            >
              Upload files, tokenize automatically, fine-tune models, and deploy your own AI assistant in minutes.
            </p>

            {/* CTA Buttons */}
            <div ref={ctaRef} className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-6">
              <a
                href="#pricing"
                className="btn-primary flex items-center gap-2 group"
              >
                Start free
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
              <button className="flex items-center gap-2 text-dark font-medium hover:text-gray-text transition-colors">
                <div className="w-10 h-10 rounded-full border border-[rgba(11,12,16,0.2)] flex items-center justify-center group-hover:border-dark transition-colors">
                  <Play className="w-4 h-4 ml-0.5" />
                </div>
                Watch demo
              </button>
            </div>

            {/* Micro Proof */}
            <p className="font-mono text-xs text-gray-text">
              No credit card • Cancel anytime
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
