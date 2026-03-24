import { useState } from 'react';

/**
 * RewardEditor — Natural language + slider-based reward configuration.
 * Users describe what they want in plain English, and/or adjust
 * individual reward component weights with sliders.
 */

interface RewardComponent {
  id: string;
  name: string;
  description: string;
  value: number;
  min: number;
  max: number;
}

interface RewardEditorProps {
  components: RewardComponent[];
  onComponentChange: (id: string, value: number) => void;
  onTextSubmit: (text: string) => void;
  isTraining: boolean;
}

const QUICK_PRESETS = [
  { label: 'Gentle Pick', text: 'pick up fragile objects gently without dropping them' },
  { label: 'Fast Navigate', text: 'navigate to the target as fast as possible' },
  { label: 'Balance Walk', text: 'walk forward while maintaining balance and stability' },
  { label: 'Energy Saver', text: 'reach the goal with minimal energy consumption' },
];

export default function RewardEditor({
  components,
  onComponentChange,
  onTextSubmit,
  isTraining,
}: RewardEditorProps) {
  const [nlText, setNlText] = useState('');

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 20, background: '#0d0d14' }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: '#fff', margin: '0 0 4px' }}>
        Reward Editor
      </h2>
      <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', margin: '0 0 24px' }}>
        Describe what the robot should do, or fine-tune component weights.
      </p>

      {/* Natural Language Input */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Describe the behavior
        </label>
        <textarea
          value={nlText}
          onChange={(e) => setNlText(e.target.value)}
          placeholder='e.g. "make the robot pick up fragile objects gently"'
          rows={3}
          style={{
            width: '100%',
            marginTop: 8,
            padding: 12,
            borderRadius: 10,
            border: '1px solid rgba(255,255,255,0.1)',
            background: 'rgba(255,255,255,0.04)',
            color: '#fff',
            fontSize: 13,
            resize: 'vertical',
            outline: 'none',
            fontFamily: 'inherit',
          }}
        />
        <button
          onClick={() => onTextSubmit(nlText)}
          disabled={!nlText.trim() || isTraining}
          style={{
            marginTop: 8,
            padding: '8px 20px',
            borderRadius: 8,
            border: 'none',
            background: nlText.trim() ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : 'rgba(255,255,255,0.06)',
            color: '#fff',
            fontSize: 12,
            fontWeight: 600,
            cursor: nlText.trim() ? 'pointer' : 'not-allowed',
            opacity: nlText.trim() ? 1 : 0.5,
          }}
        >
          Apply Description
        </button>
      </div>

      {/* Quick Presets */}
      <div style={{ marginBottom: 24 }}>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Quick presets
        </label>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
          {QUICK_PRESETS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                setNlText(preset.text);
                onTextSubmit(preset.text);
              }}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.08)',
                background: 'rgba(255,255,255,0.04)',
                color: 'rgba(255,255,255,0.6)',
                fontSize: 11,
                cursor: 'pointer',
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Component Sliders */}
      <div>
        <label style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.8 }}>
          Reward Components
        </label>
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {components.map((comp) => (
            <div key={comp.id}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'rgba(255,255,255,0.7)' }}>
                  {comp.name}
                </span>
                <span style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: comp.value >= 0 ? '#22c55e' : '#ef4444',
                  padding: '2px 8px',
                  borderRadius: 4,
                  background: comp.value >= 0 ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                }}>
                  {comp.value >= 0 ? '+' : ''}{comp.value.toFixed(2)}
                </span>
              </div>
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', margin: '0 0 6px' }}>
                {comp.description}
              </p>
              <input
                type="range"
                min={comp.min}
                max={comp.max}
                step={0.05}
                value={comp.value}
                onChange={(e) => onComponentChange(comp.id, parseFloat(e.target.value))}
                disabled={isTraining}
                style={{ width: '100%', accentColor: comp.value >= 0 ? '#22c55e' : '#ef4444' }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
