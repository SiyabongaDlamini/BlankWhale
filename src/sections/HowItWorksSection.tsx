import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Upload, FileText, Rocket } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const steps = [
  {
    number: '01',
    title: 'Upload Knowledge',
    description: 'Drop PDFs, CSVs, docs, images, or audio. We extract text and structure automatically.',
    icon: Upload,
  },
  {
    number: '02',
    title: 'Smart Tokenization',
    description: 'Preview chunks, adjust overlap, and estimate tokens before training starts.',
    icon: FileText,
  },
  {
    number: '03',
    title: 'Train & Deploy',
    description: 'Choose a model, set parameters, and launch an API or chatbot—no code needed.',
    icon: Rocket,
  },
];

export default function HowItWorksSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const section = sectionRef.current;
    const header = headerRef.current;
    const cards = cardsRef.current.filter(Boolean);

    if (!section || !header || cards.length === 0) return;

    const ctx = gsap.context(() => {
      const scrollTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: '+=130%',
          pin: true,
          scrub: 0.7,
        },
      });

      // Header animation
      scrollTl
        .fromTo(header,
          { y: '-10vh', opacity: 0 },
          { y: 0, opacity: 1, ease: 'none' },
          0
        )
        .to(header,
          { y: '-8vh', opacity: 0, ease: 'power2.in' },
          0.7
        );

      // Cards animation with stagger
      cards.forEach((card, index) => {
        const startY = 60 + index * 10;
        const rotate = index === 0 ? -2 : index === 2 ? 2 : 0;

        scrollTl
          .fromTo(card,
            { y: `${startY}vh`, opacity: 0, rotate: rotate },
            { y: 0, opacity: 1, rotate: 0, ease: 'none' },
            0.05 + index * 0.06
          )
          .to(card,
            { 
              y: '35vh', 
              opacity: 0, 
              x: index === 0 ? '-6vw' : index === 2 ? '6vw' : 0,
              ease: 'power2.in' 
            },
            0.7
          );
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      id="how-it-works"
      className="relative w-full h-screen bg-light grain-overlay overflow-hidden z-20"
    >
      {/* Hairline Grid Background */}
      <div className="absolute inset-0 hairline-grid opacity-60" />

      {/* Content */}
      <div className="relative w-full h-full flex flex-col items-center justify-center px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          ref={headerRef}
          className="text-center mb-8 lg:mb-12 will-change-transform"
        >
          <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl text-dark mb-4">
            How it works
          </h2>
          <p className="text-base lg:text-lg text-gray-text max-w-md mx-auto">
            A simple loop: upload, tokenize, train.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-6 w-full max-w-[1400px]">
          {steps.map((step, index) => {
            const Icon = step.icon;
            return (
              <div
                key={step.number}
                ref={(el) => { cardsRef.current[index] = el; }}
                className="w-full lg:w-[26vw] lg:max-w-[360px] h-auto lg:h-[52vh] min-h-[280px] bg-white rounded-3xl border border-[rgba(11,12,16,0.08)] card-shadow p-6 lg:p-8 flex flex-col will-change-transform hover:-translate-y-1.5 transition-transform duration-300"
              >
                {/* Card Header */}
                <div className="flex items-start justify-between mb-6">
                  <span className="font-mono text-sm text-cyan font-medium">
                    {step.number}
                  </span>
                  <div className="w-10 h-10 rounded-xl bg-light flex items-center justify-center">
                    <Icon className="w-5 h-5 text-dark" strokeWidth={1.5} />
                  </div>
                </div>

                {/* Card Content */}
                <h3 className="font-heading text-xl lg:text-2xl text-dark mb-3">
                  {step.title}
                </h3>
                <p className="text-sm lg:text-base text-gray-text leading-relaxed">
                  {step.description}
                </p>

                {/* Decorative Element */}
                <div className="mt-auto pt-6">
                  <div className="h-1 w-12 rounded-full bg-cyan/30" />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
