import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Upload, FileText, Image, Music, Table, Cloud } from 'lucide-react';

gsap.registerPlugin(ScrollTrigger);

const fileTypes = [
  { name: 'Annual_Report_2024.pdf', size: '2.4 MB', tokens: '845K', icon: FileText },
  { name: 'Customer_Data.csv', size: '1.1 MB', tokens: '420K', icon: Table },
  { name: 'Product_Images.zip', size: '156 MB', tokens: '2.1M', icon: Image },
  { name: 'Interview_Audio.mp3', size: '45 MB', tokens: '890K', icon: Music },
];

const connectors = [
  { name: 'Google', color: 'bg-blue-500' },
  { name: 'Microsoft', color: 'bg-blue-600' },
  { name: 'Dropbox', color: 'bg-blue-400' },
  { name: 'Notion', color: 'bg-gray-700' },
  { name: 'Slack', color: 'bg-purple-500' },
  { name: 'Zendesk', color: 'bg-green-500' },
];

export default function DataSourcesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const leftCardRef = useRef<HTMLDivElement>(null);
  const rightCardRef = useRef<HTMLDivElement>(null);
  const iconsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const section = sectionRef.current;
    const leftCard = leftCardRef.current;
    const rightCard = rightCardRef.current;
    const icons = iconsRef.current.filter(Boolean);

    if (!section || !leftCard || !rightCard) return;

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

      // Left card
      scrollTl
        .fromTo(leftCard,
          { x: '-60vw', opacity: 0 },
          { x: 0, opacity: 1, ease: 'none' },
          0
        )
        .to(leftCard,
          { x: '-35vw', opacity: 0, ease: 'power2.in' },
          0.7
        );

      // Right card
      scrollTl
        .fromTo(rightCard,
          { x: '60vw', opacity: 0 },
          { x: 0, opacity: 1, ease: 'none' },
          0.08
        )
        .to(rightCard,
          { x: '35vw', opacity: 0, ease: 'power2.in' },
          0.7
        );

      // Connector icons staggered
      icons.forEach((icon, index) => {
        scrollTl
          .fromTo(icon,
            { scale: 0.6, opacity: 0, y: 20 },
            { scale: 1, opacity: 1, y: 0, ease: 'none' },
            0.15 + index * 0.03
          )
          .to(icon,
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
      className="relative w-full h-screen bg-light grain-overlay overflow-hidden z-[60]"
    >
      {/* Hairline Grid Background */}
      <div className="absolute inset-0 hairline-grid opacity-60" />

      {/* Content */}
      <div className="relative w-full h-full flex flex-col lg:flex-row items-center justify-center px-4 sm:px-6 lg:px-8 gap-4 lg:gap-6 pt-16">
        {/* Left Upload Card */}
        <div
          ref={leftCardRef}
          className="w-full lg:w-[44vw] lg:max-w-[550px] h-auto lg:h-[80vh] bg-white rounded-3xl border border-[rgba(11,12,16,0.08)] card-shadow p-6 lg:p-8 flex flex-col will-change-transform"
        >
          {/* Header */}
          <h2 className="font-heading text-2xl lg:text-3xl text-dark mb-2">
            Upload anything.
          </h2>
          <p className="text-sm lg:text-base text-gray-text leading-relaxed mb-6">
            Drag files or import from your favorite tools. We handle parsing, OCR, and transcription.
          </p>

          {/* Drop Zone */}
          <div className="flex-1 min-h-[160px] lg:min-h-0 border-2 border-dashed border-[rgba(11,12,16,0.12)] rounded-2xl flex flex-col items-center justify-center p-6 mb-6 hover:border-cyan/50 hover:bg-cyan/5 transition-colors cursor-pointer">
            <div className="w-12 h-12 rounded-xl bg-cyan/10 flex items-center justify-center mb-3">
              <Upload className="w-6 h-6 text-cyan" />
            </div>
            <p className="text-sm font-medium text-dark mb-1">Drop files here</p>
            <p className="text-xs text-gray-text">or click to browse</p>
          </div>

          {/* File List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="font-mono text-xs uppercase tracking-wider text-gray-text">Recent uploads</span>
            </div>
            <div className="space-y-2">
              {fileTypes.map((file, index) => {
                const Icon = file.icon;
                return (
                  <div
                    key={index}
                    className="flex items-center justify-between p-2 lg:p-3 bg-light rounded-xl"
                  >
                    <div className="flex items-center gap-2 lg:gap-3">
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
                        <Icon className="w-4 h-4 text-gray-text" />
                      </div>
                      <div>
                        <p className="text-xs lg:text-sm font-medium text-dark truncate max-w-[100px] lg:max-w-[160px]">{file.name}</p>
                        <p className="text-[10px] lg:text-xs text-gray-text">{file.size}</p>
                      </div>
                    </div>
                    <span className="font-mono text-[10px] lg:text-xs text-cyan">{file.tokens}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Connectors Card */}
        <div
          ref={rightCardRef}
          className="w-full lg:w-[48vw] lg:max-w-[600px] h-auto lg:h-[80vh] bg-white rounded-3xl border border-[rgba(11,12,16,0.08)] card-shadow p-6 lg:p-8 flex flex-col will-change-transform"
        >
          {/* Header */}
          <h2 className="font-heading text-2xl lg:text-3xl text-dark mb-2">
            Connect your stack.
          </h2>
          <p className="text-sm lg:text-base text-gray-text leading-relaxed mb-6">
            Sync docs, sheets, and conversations automatically.
          </p>

          {/* Connectors Grid */}
          <div className="flex-1">
            <div className="grid grid-cols-3 gap-3 lg:gap-4">
              {connectors.map((connector, index) => (
                <div
                  key={connector.name}
                  ref={(el) => { iconsRef.current[index] = el; }}
                  className="aspect-square bg-light rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-cyan/5 hover:border-cyan/20 border border-transparent transition-colors cursor-pointer will-change-transform"
                >
                  <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl ${connector.color} flex items-center justify-center`}>
                    <Cloud className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                  </div>
                  <span className="font-mono text-[10px] lg:text-xs text-gray-text">{connector.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="mt-6 pt-6 border-t border-[rgba(11,12,16,0.08)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-mono text-xs text-gray-text mb-1">CONNECTED SOURCES</p>
                <p className="font-heading text-2xl lg:text-3xl text-dark">12</p>
              </div>
              <div>
                <p className="font-mono text-xs text-gray-text mb-1">SYNCED FILES</p>
                <p className="font-heading text-2xl lg:text-3xl text-dark">2.4K</p>
              </div>
              <div>
                <p className="font-mono text-xs text-gray-text mb-1">LAST SYNC</p>
                <p className="font-heading text-2xl lg:text-3xl text-cyan">2m</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
