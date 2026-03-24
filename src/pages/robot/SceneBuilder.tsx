import { useState } from 'react';

/**
 * SceneBuilder — Visual 3D scene configuration panel.
 * Users add objects, set physics parameters, and configure the robot.
 */

interface SceneObject {
  id: string;
  shape: 'box' | 'sphere' | 'cylinder';
  position: [number, number, number];
  size: [number, number, number];
  mass: number;
  color: string;
}

export default function SceneBuilder() {
  const [gravity, setGravity] = useState(-9.81);
  const [friction, setFriction] = useState(0.5);
  const [objects, setObjects] = useState<SceneObject[]>([]);
  const [urdfPath, setUrdfPath] = useState('robots/arm_6dof.urdf');
  const [newShape, setNewShape] = useState<'box' | 'sphere' | 'cylinder'>('box');

  const addQuickObject = () => {
    setObjects([...objects, {
      id: `obj_${Date.now()}`,
      shape: newShape,
      position: [Math.random() * 2 - 1, 0, Math.random() * 2],
      size: [0.3, 0.3, 0.3],
      mass: 1.0,
      color: `hsl(${Math.random() * 360}, 70%, 50%)`,
    }]);
  };

  const removeObject = (id: string) => {
    setObjects(objects.filter(o => o.id !== id));
  };

  return (
    <div style={{ height: '100%', overflowY: 'auto', padding: 20, background: 'var(--bg-workspace)' }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 20px' }}>
        Scene Builder
      </h2>

      {/* Robot Selection */}
      <Section title="Robot">
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {['robots/arm_6dof.urdf', 'robots/wheeled_bot.urdf', 'robots/humanoid_basic.urdf'].map((path) => (
            <button
              key={path}
              onClick={() => setUrdfPath(path)}
              style={{
                ...chipStyle,
                background: urdfPath === path ? 'rgba(0,113,227,0.1)' : 'var(--bg-surface)',
                borderColor: urdfPath === path ? 'var(--accent)' : 'var(--border-panel)',
                color: urdfPath === path ? 'var(--accent)' : 'var(--text-secondary)',
              }}
            >
              {path.split('/')[1]?.replace('.urdf', '') || path}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '8px 0 0' }}>
          Or drag-and-drop a custom URDF file
        </p>
      </Section>

      {/* Physics */}
      <Section title="Physics">
        <SliderRow
          label="Gravity"
          value={gravity}
          min={-20}
          max={0}
          step={0.1}
          onChange={setGravity}
          unit="m/s²"
        />
        <SliderRow
          label="Friction"
          value={friction}
          min={0}
          max={2}
          step={0.05}
          onChange={setFriction}
          unit=""
        />
      </Section>

      {/* Objects */}
      <Section title="Scene Objects">
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          {(['box', 'sphere', 'cylinder'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setNewShape(s)}
              style={{
                ...chipStyle,
                background: newShape === s ? 'rgba(40, 167, 69, 0.1)' : 'var(--bg-surface)',
                borderColor: newShape === s ? 'var(--success)' : 'var(--border-panel)',
                color: newShape === s ? 'var(--success)' : 'var(--text-secondary)',
              }}
            >
              {s}
            </button>
          ))}
          <button onClick={addQuickObject} style={{ ...chipStyle, background: 'rgba(0,113,227,0.1)', borderColor: 'var(--accent)', color: 'var(--accent)' }}>
            + Add
          </button>
        </div>

        {objects.map((obj) => (
          <div
            key={obj.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '8px 12px',
              borderRadius: 8,
              background: 'var(--bg-panel)',
              border: '1px solid var(--border-panel)',
              marginBottom: 6,
              fontSize: 12,
              color: 'var(--text-secondary)',
            }}
          >
            <span>
              <span style={{ color: obj.color, marginRight: 8 }}>●</span>
              {obj.shape} ({obj.position.map((p) => p.toFixed(1)).join(', ')})
            </span>
            <button
              onClick={() => removeObject(obj.id)}
              style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', fontSize: 14 }}
            >
              ✕
            </button>
          </div>
        ))}

        {objects.length === 0 && (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>
            No objects yet. Click "+ Add" to place objects in the scene.
          </p>
        )}
      </Section>
    </div>
  );
}

// ============================================================
// Helper Components
// ============================================================

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, margin: '0 0 12px' }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function SliderRow({
  label, value, min, max, step, onChange, unit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  unit: string;
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
        <span>{label}</span>
        <span>{value.toFixed(2)} {unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%', accentColor: 'var(--accent)' }}
      />
    </div>
  );
}

const chipStyle: React.CSSProperties = {
  padding: '6px 12px',
  borderRadius: 8,
  border: '1px solid var(--border-panel)',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
};
