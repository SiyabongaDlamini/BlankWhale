import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Send, Quote, Sparkles, Shield, ThumbsUp } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const chatMessages = [
  {
    type: 'user',
    content: 'What is inside my uploaded files?',
  },
  {
    type: 'ai',
    content: 'Based on your documents, I found information about your company\'s Q4 financial performance, customer feedback from 847 surveys, and product roadmap for 2024-2025. Would you like me to summarize any specific section?',
  },
  {
    type: 'user',
    content: 'Summarize the Q4 financials.',
  },
  {
    type: 'ai',
    content: 'Q4 2024 Summary:\n• Revenue: $4.2M (+23% YoY)\n• Gross Margin: 68%\n• New Customers: 342\n• Churn Rate: 2.1%\n\nKey drivers were the Enterprise tier launch and expanded partnerships in APAC.',
  },
];

const features = [
  { icon: Quote, text: 'Source citations' },
  { icon: Shield, text: 'Confidence scores' },
  { icon: ThumbsUp, text: 'Feedback loop' },
];

export default function TestValidateSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const leftCardRef = useRef<HTMLDivElement>(null);
  const rightCardRef = useRef<HTMLDivElement>(null);
  const bubblesRef = useRef<(HTMLDivElement | null)[]>([]);
  const inputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const leftCard = leftCardRef.current;
    const rightCard = rightCardRef.current;
    const bubbles = bubblesRef.current.filter(Boolean);
    const input = inputRef.current;

    if (!section || !leftCard || !rightCard || !input) return;

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

      // Left chat card
      scrollTl
        .fromTo(leftCard,
          { y: '80vh', opacity: 0 },
          { y: 0, opacity: 1, ease: 'none' },
          0
        )
        .to(leftCard,
          { y: '-30vh', opacity: 0, ease: 'power2.in' },
          0.7
        );

      // Right info card
      scrollTl
        .fromTo(rightCard,
          { y: '60vh', opacity: 0 },
          { y: 0, opacity: 1, ease: 'none' },
          0.1
        )
        .to(rightCard,
          { y: '-20vh', opacity: 0, ease: 'power2.in' },
          0.7
        );

      // Chat bubbles staggered
      bubbles.forEach((bubble, index) => {
        scrollTl
          .fromTo(bubble,
            { y: 24, opacity: 0 },
            { y: 0, opacity: 1, ease: 'none' },
            0.18 + index * 0.05
          )
          .to(bubble,
            { opacity: 0.2, ease: 'power2.in' },
            0.7
          );
      });

      // Input line
      scrollTl
        .fromTo(input,
          { scaleX: 0, opacity: 0 },
          { scaleX: 1, opacity: 1, ease: 'none', transformOrigin: 'left' },
          0.22
        )
        .to(input,
          { opacity: 0, ease: 'power2.in' },
          0.7
        );
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-screen bg-light grain-overlay overflow-hidden z-[70]"
    >
      {/* Hairline Grid Background */}
      <div className="absolute inset-0 hairline-grid opacity-60" />

      {/* Content */}
      <div className="relative w-full h-full flex flex-col lg:flex-row items-center justify-center px-4 sm:px-6 lg:px-8 gap-4 lg:gap-6 pt-16">
        {/* Left Chat Card */}
        <div
          ref={leftCardRef}
          className="w-full lg:w-[52vw] lg:max-w-[650px] h-[50vh] lg:h-[80vh] bg-white rounded-3xl border border-[rgba(11,12,16,0.08)] card-shadow overflow-hidden flex flex-col will-change-transform"
        >
          {/* Chat Header */}
          <div className="h-14 lg:h-16 border-b border-[rgba(11,12,16,0.08)] flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-cyan/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-cyan" />
              </div>
              <div>
                <p className="text-sm font-medium text-dark">AI Assistant</p>
                <p className="text-xs text-gray-text">Online</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="font-mono text-xs text-gray-text">LIVE</span>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4">
            {chatMessages.map((message, index) => (
              <div
                key={index}
                ref={(el) => { bubblesRef.current[index] = el; }}
                className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} will-change-transform`}
              >
                <div
                  className={`max-w-[85%] lg:max-w-[75%] p-3 lg:p-4 rounded-2xl ${
                    message.type === 'user'
                      ? 'bg-dark text-white rounded-br-md'
                      : 'bg-light text-dark rounded-bl-md'
                  }`}
                >
                  <p className="text-xs lg:text-sm whitespace-pre-line">{message.content}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Chat Input */}
          <div ref={inputRef} className="p-4 lg:p-6 border-t border-[rgba(11,12,16,0.08)] will-change-transform">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-10 lg:h-12 bg-light rounded-full flex items-center px-4">
                <input
                  type="text"
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent text-sm text-dark placeholder:text-gray-text outline-none"
                  readOnly
                />
              </div>
              <button className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-cyan flex items-center justify-center hover:bg-cyan-dark transition-colors">
                <Send className="w-4 h-4 lg:w-5 lg:h-5 text-dark" />
              </button>
            </div>
          </div>
        </div>

        {/* Right Info Card */}
        <div
          ref={rightCardRef}
          className="w-full lg:w-[40vw] lg:max-w-[480px] h-auto lg:h-[80vh] bg-white rounded-3xl border border-[rgba(11,12,16,0.08)] card-shadow p-6 lg:p-8 flex flex-col will-change-transform"
        >
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-cyan" />
            <span className="eyebrow">TESTING</span>
          </div>

          {/* Headline */}
          <h2 className="font-heading text-2xl lg:text-3xl text-dark mb-3">
            Ask questions. Verify answers.
          </h2>

          {/* Body */}
          <p className="text-sm lg:text-base text-gray-text leading-relaxed mb-6">
            Validate responses against your sources. Flag hallucinations and tune behavior before going live.
          </p>

          {/* Features List */}
          <ul className="space-y-3 mb-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <li key={index} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-cyan" />
                  </div>
                  <span className="text-sm text-dark">{feature.text}</span>
                </li>
              );
            })}
          </ul>

          {/* Confidence Score */}
          <div className="p-4 bg-light rounded-2xl mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-text">Average Confidence</span>
              <span className="font-mono text-sm text-cyan font-medium">94.2%</span>
            </div>
            <div className="h-2 bg-white rounded-full overflow-hidden">
              <div className="h-full w-[94%] bg-cyan rounded-full" />
            </div>
          </div>

          {/* CTA */}
          <a
            href="#"
            className="mt-auto btn-primary text-center"
          >
            Try the demo
          </a>
        </div>
      </div>
    </section>
  );
}
