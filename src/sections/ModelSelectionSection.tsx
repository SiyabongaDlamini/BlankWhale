import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MessageSquare, FileText, Eye } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const aiTypes = [
  {
    id: 'chat',
    title: 'Chat AI',
    description: 'Conversational AI for customer support, Q\&A, and assistants.',
    icon: MessageSquare,
  },
  {
    id: 'document',
    title: 'Document AI',
    description: 'Process and analyze documents, contracts, and reports.',
    icon: FileText,
  },
  {
    id: 'vision',
    title: 'Vision AI',
    description: 'Analyze images, charts, and visual content.',
    icon: Eye,
  },
];

const baseModels = [
  { id: 'meta', name: 'Meta Platforms', short: 'LLaMA' },
  { id: 'mistral', name: 'Mistral AI', short: 'Mistral' },
  { id: 'google', name: 'Google', short: 'Gemma' },
];

export default function ModelSelectionSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<(HTMLDivElement | null)[]>([]);
  const selectorRef = useRef<HTMLDivElement>(null);
  const [selectedModel, setSelectedModel] = useState('meta');

  useEffect(() => {
    const section = sectionRef.current;
    const header = headerRef.current;
    const cards = cardsRef.current.filter(Boolean);
    const selector = selectorRef.current;

    if (!section || !header || cards.length === 0 || !selector) return;

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
          { y: '-12vh', opacity: 0 },
          { y: 0, opacity: 1, ease: 'none' },
          0
        )
        .to(header,
          { y: '-8vh', opacity: 0, ease: 'power2.in' },
          0.7
        );

      // Cards 3D tilt reveal
      cards.forEach((card, index) => {
        scrollTl
          .fromTo(card,
            { y: '70vh', opacity: 0, rotateX: 35, scale: 0.92 },
            { y: 0, opacity: 1, rotateX: 0, scale: 1, ease: 'none' },
            0.08 + index * 0.07
          )
          .to(card,
            { z: -300, scale: 0.92, opacity: 0, ease: 'power2.in' },
            0.7
          );
      });

      // Selector pills
      scrollTl
        .fromTo(selector,
          { y: '10vh', opacity: 0 },
          { y: 0, opacity: 1, ease: 'none' },
          0.18
        )
        .to(selector,
          { opacity: 0, ease: 'power2.in' },
          0.7
        );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-screen bg-light grain-overlay overflow-hidden z-50"
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
            Choose your AI type.
          </h2>
          <p className="text-base lg:text-lg text-gray-text max-w-lg mx-auto">
            Then pick a base model that fits your budget and latency needs.
          </p>
        </div>

        {/* Cards Grid */}
        <div 
          className="flex flex-col lg:flex-row items-center justify-center gap-4 lg:gap-6 w-full max-w-[1200px] perspective-1000"
          style={{ perspective: '1000px' }}
        >
          {aiTypes.map((type, index) => {
            const Icon = type.icon;
            return (
              <div
                key={type.id}
                ref={(el) => { cardsRef.current[index] = el; }}
                className="w-full lg:w-[28vw] lg:max-w-[340px] h-auto lg:h-[46vh] min-h-[240px] bg-white rounded-3xl border border-[rgba(11,12,16,0.08)] card-shadow p-6 lg:p-8 flex flex-col will-change-transform hover:-translate-y-1.5 transition-transform duration-300"
                style={{ transformStyle: 'preserve-3d' }}
              >
                {/* Icon */}
                <div className="w-12 h-12 rounded-2xl bg-cyan/10 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-cyan" strokeWidth={1.5} />
                </div>

                {/* Title */}
                <h3 className="font-heading text-xl lg:text-2xl text-dark mb-2">
                  {type.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-gray-text leading-relaxed">
                  {type.description}
                </p>

                {/* Decorative */}
                <div className="mt-auto pt-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1 w-8 rounded-full bg-cyan/30" />
                    <div className="h-1 w-4 rounded-full bg-cyan/10" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Base Model Selector */}
        <div
          ref={selectorRef}
          className="mt-8 lg:mt-12 will-change-transform"
        >
          <div className="flex flex-wrap items-center justify-center gap-2 lg:gap-3">
            {baseModels.map((model) => (
              <button
                key={model.id}
                onClick={() => setSelectedModel(model.id)}
                className={`px-4 lg:px-5 py-2 rounded-full text-xs lg:text-sm font-medium transition-all duration-200 ${
                  selectedModel === model.id
                    ? 'bg-dark text-white'
                    : 'bg-white border border-[rgba(11,12,16,0.12)] text-gray-text hover:text-dark hover:border-dark'
                }`}
              >
                <span className="font-mono uppercase tracking-wider">{model.name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
