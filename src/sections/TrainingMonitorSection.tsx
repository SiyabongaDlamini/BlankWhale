import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TrendingDown, Cpu, Database, Clock, ExternalLink } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

export default function TrainingMonitorSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const leftCardRef = useRef<HTMLDivElement>(null);
  const rightCardRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<SVGSVGElement>(null);
  const metricsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const leftCard = leftCardRef.current;
    const rightCard = rightCardRef.current;
    const chart = chartRef.current;
    const metrics = metricsRef.current;

    if (!section || !leftCard || !rightCard || !chart || !metrics) return;

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

      // Left dashboard card
      scrollTl
        .fromTo(leftCard,
          { x: '-60vw', opacity: 0 },
          { x: 0, opacity: 1, ease: 'none' },
          0
        )
        .to(leftCard,
          { x: '-40vw', opacity: 0, ease: 'power2.in' },
          0.7
        );

      // Right metrics card
      scrollTl
        .fromTo(rightCard,
          { x: '60vw', opacity: 0 },
          { x: 0, opacity: 1, ease: 'none' },
          0.08
        )
        .to(rightCard,
          { x: '40vw', opacity: 0, ease: 'power2.in' },
          0.7
        );

      // Chart line draw animation
      const chartPath = chart.querySelector('path');
      if (chartPath) {
        const pathLength = chartPath.getTotalLength();
        gsap.set(chartPath, { strokeDasharray: pathLength, strokeDashoffset: pathLength });

        scrollTl
          .to(chartPath,
            { strokeDashoffset: 0, ease: 'none' },
            0.15
          )
          .to(chartPath,
            { opacity: 0.2, ease: 'power2.in' },
            0.7
          );
      }

      // Metrics count-up animation
      const metricValues = metrics.querySelectorAll('.metric-value');
      metricValues.forEach((metric) => {
        scrollTl
          .fromTo(metric,
            { opacity: 0, y: 20 },
            { opacity: 1, y: 0, ease: 'none' },
            0.18
          )
          .to(metric,
            { opacity: 0, ease: 'power2.in' },
            0.7
          );
      });
    }, section);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative w-full h-screen bg-light grain-overlay overflow-hidden z-30"
    >
      {/* Hairline Grid Background */}
      <div className="absolute inset-0 hairline-grid opacity-60" />

      {/* Content */}
      <div className="relative w-full h-full flex flex-col lg:flex-row items-center justify-center px-4 sm:px-6 lg:px-8 gap-4 lg:gap-6 pt-16">
        {/* Left Dashboard Card */}
        <div
          ref={leftCardRef}
          className="w-full lg:w-[56vw] lg:max-w-[700px] h-[45vh] lg:h-[80vh] bg-white rounded-3xl border border-[rgba(11,12,16,0.08)] card-shadow overflow-hidden will-change-transform"
        >
          {/* Dashboard Header */}
          <div className="h-14 lg:h-16 border-b border-[rgba(11,12,16,0.08)] flex items-center px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <div className="ml-4 px-3 py-1 bg-light rounded-md">
              <span className="font-mono text-xs text-gray-text">Training Dashboard</span>
            </div>
          </div>

          {/* Dashboard Content */}
          <div className="flex h-[calc(100%-3.5rem)] lg:h-[calc(100%-4rem)]">
            {/* Sidebar */}
            <div className="w-14 lg:w-16 border-r border-[rgba(11,12,16,0.08)] flex flex-col items-center py-4 gap-3">
              <div className="w-8 h-8 rounded-lg bg-cyan/10 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-cyan" />
              </div>
              <div className="w-8 h-8 rounded-lg hover:bg-light flex items-center justify-center transition-colors">
                <Cpu className="w-4 h-4 text-gray-text" />
              </div>
              <div className="w-8 h-8 rounded-lg hover:bg-light flex items-center justify-center transition-colors">
                <Database className="w-4 h-4 text-gray-text" />
              </div>
            </div>

            {/* Chart Area */}
            <div className="flex-1 p-4 lg:p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-heading text-sm lg:text-base text-dark">Loss Curve</h4>
                <span className="font-mono text-xs text-cyan">Live</span>
              </div>

              {/* Chart */}
              <div className="relative h-[calc(100%-2rem)]">
                <svg
                  ref={chartRef}
                  className="w-full h-full"
                  viewBox="0 0 400 200"
                  preserveAspectRatio="none"
                >
                  {/* Grid Lines */}
                  {[0, 50, 100, 150, 200].map((y) => (
                    <line
                      key={y}
                      x1="0"
                      y1={y}
                      x2="400"
                      y2={y}
                      stroke="rgba(11,12,16,0.06)"
                      strokeWidth="1"
                    />
                  ))}

                  {/* Loss Line */}
                  <path
                    d="M 0 180 Q 50 170 100 150 Q 150 120 200 100 Q 250 80 300 60 Q 350 45 400 35"
                    fill="none"
                    stroke="#22D3EE"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                  />

                  {/* Area under curve */}
                  <path
                    d="M 0 180 Q 50 170 100 150 Q 150 120 200 100 Q 250 80 300 60 Q 350 45 400 35 L 400 200 L 0 200 Z"
                    fill="url(#gradient)"
                    opacity="0.2"
                  />

                  <defs>
                    <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#22D3EE" />
                      <stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Y-axis labels */}
                <div className="absolute left-0 top-0 bottom-0 flex flex-col justify-between text-[10px] text-gray-text font-mono -ml-6">
                  <span>2.5</span>
                  <span>2.0</span>
                  <span>1.5</span>
                  <span>1.0</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Metrics Card */}
        <div
          ref={rightCardRef}
          className="w-full lg:w-[36vw] lg:max-w-[450px] h-auto lg:h-[80vh] bg-white rounded-3xl border border-[rgba(11,12,16,0.08)] card-shadow p-6 lg:p-8 flex flex-col will-change-transform"
        >
          {/* Eyebrow */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-cyan animate-pulse" />
            <span className="eyebrow">LIVE TRAINING</span>
          </div>

          {/* Headline */}
          <h2 className="font-heading text-2xl lg:text-3xl text-dark mb-3">
            Watch your model learn in real time.
          </h2>

          {/* Body */}
          <p className="text-sm lg:text-base text-gray-text leading-relaxed mb-6">
            Track loss, GPU usage, and tokens processed. Pause, adjust, or export checkpoints instantly.
          </p>

          {/* Metrics */}
          <div ref={metricsRef} className="space-y-4 mb-6">
            <div className="flex items-center justify-between p-3 lg:p-4 bg-light rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan/10 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-cyan" />
                </div>
                <span className="text-sm text-gray-text">Loss</span>
              </div>
              <span className="metric-value font-mono text-lg lg:text-xl font-medium text-dark">1.18</span>
            </div>

            <div className="flex items-center justify-between p-3 lg:p-4 bg-light rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan/10 flex items-center justify-center">
                  <Database className="w-4 h-4 text-cyan" />
                </div>
                <span className="text-sm text-gray-text">Tokens</span>
              </div>
              <span className="metric-value font-mono text-lg lg:text-xl font-medium text-dark">4.2M</span>
            </div>

            <div className="flex items-center justify-between p-3 lg:p-4 bg-light rounded-2xl">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-cyan" />
                </div>
                <span className="text-sm text-gray-text">ETA</span>
              </div>
              <span className="metric-value font-mono text-lg lg:text-xl font-medium text-dark">6 min</span>
            </div>
          </div>

          {/* Mini Bar Chart */}
          <div className="mb-6">
            <div className="flex items-end justify-between gap-1 h-16">
              {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 50, 95].map((height, i) => (
                <div
                  key={i}
                  className="flex-1 bg-cyan/20 rounded-t-sm"
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>

          {/* CTA */}
          <a
            href="#"
            className="mt-auto flex items-center gap-2 text-sm font-medium text-dark hover:text-cyan transition-colors"
          >
            Open full dashboard
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>
    </section>
  );
}
