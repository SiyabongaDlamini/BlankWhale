import { useRef, useEffect, useState, useCallback } from 'react';
import { useEngine } from '../../hooks/useEngine';

interface Neuron {
  x: number;
  y: number;
  layer: number;
  index: number;
  activation: number;
  radius: number;
  targetRadius: number;
}

interface Connection {
  from: number;
  to: number;
  weight: number;
  signal: number;
  signalPos: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
}

export default function NetworkCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const neuronsRef = useRef<Neuron[]>([]);
  const connectionsRef = useRef<Connection[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  
  const { isConnected, isTraining, metrics } = useEngine();
  const [networkSize, setNetworkSize] = useState(1);
  const timeRef = useRef(0);
  
  const currentEpoch = metrics.length > 0 ? metrics[metrics.length - 1].epoch : 0;

  const MAX_LAYERS = 8;
  const NEURONS_PER_LAYER = [4, 8, 12, 16, 16, 12, 8, 4];
  const COLORS = {
    bg: '#f5f5f7',
    neuronIdle: '#d1d5db',
    neuronActive: '#0071e3',
    neuronGlow: 'rgba(0, 113, 227, 0.3)',
    connectionIdle: 'rgba(0, 0, 0, 0.06)',
    connectionActive: 'rgba(0, 113, 227, 0.4)',
    signal: '#0071e3',
    signalGlow: 'rgba(0, 113, 227, 0.6)',
    particleInput: '#28a745',
    particleOutput: '#6366f1',
    text: '#4a4a55',
    textMuted: '#8a8a99',
  };

  const buildNetwork = useCallback((numLayers: number, width: number, height: number) => {
    const neurons: Neuron[] = [];
    const connections: Connection[] = [];
    const layerSpacing = width / (numLayers + 1);

    for (let l = 0; l < numLayers; l++) {
      const count = NEURONS_PER_LAYER[l] || 8;
      const neuronSpacing = height / (count + 1);

      for (let i = 0; i < count; i++) {
        neurons.push({
          x: layerSpacing * (l + 1),
          y: neuronSpacing * (i + 1),
          layer: l,
          index: i,
          activation: 0,
          radius: 0,
          targetRadius: l === 0 || l === numLayers - 1 ? 5 : 4,
        });
      }
    }

    for (let l = 0; l < numLayers - 1; l++) {
      const layerNeurons = neurons.filter(n => n.layer === l);
      const nextLayerNeurons = neurons.filter(n => n.layer === l + 1);

      for (let i = 0; i < layerNeurons.length; i++) {
        for (let j = 0; j < nextLayerNeurons.length; j++) {
          const dist = Math.abs(i / layerNeurons.length - j / nextLayerNeurons.length);
          if (dist < 0.45 || Math.random() < 0.15) {
            const fromIdx = neurons.indexOf(layerNeurons[i]);
            const toIdx = neurons.indexOf(nextLayerNeurons[j]);
            connections.push({
              from: fromIdx,
              to: toIdx,
              weight: Math.random() * 0.8 + 0.2,
              signal: 0,
              signalPos: 0,
            });
          }
        }
      }
    }

    neuronsRef.current = neurons;
    connectionsRef.current = connections;
  }, []);

  const spawnParticles = useCallback(() => {
    const inputNeurons = neuronsRef.current.filter(n => n.layer === 0);
    if (inputNeurons.length === 0) return;
    const n = inputNeurons[Math.floor(Math.random() * inputNeurons.length)];
    for (let i = 0; i < 3; i++) {
      particlesRef.current.push({
        x: n.x - 30,
        y: n.y + (Math.random() - 0.5) * 10,
        vx: 1.5 + Math.random(),
        vy: (Math.random() - 0.5) * 0.5,
        life: 1,
        maxLife: 1,
        color: COLORS.particleInput,
      });
    }
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width * window.devicePixelRatio;
        canvas.height = rect.height * window.devicePixelRatio;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        buildNetwork(networkSize, rect.width, rect.height);
      }
    };

    resize();
    window.addEventListener('resize', resize);

    const animate = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      const w = rect.width;
      const h = rect.height;

      timeRef.current += 0.016;
      ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
      ctx.clearRect(0, 0, w, h);

      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(0, 0, 0, 0.03)';
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y);
        ctx.stroke();
      }

      const neurons = neuronsRef.current;
      const connections = connectionsRef.current;
      const particles = particlesRef.current;

      const layerNames = ['Input', 'Embed', 'Attention', 'FFN', 'Norm', 'Attention', 'FFN', 'Output'];
      for (let l = 0; l < networkSize; l++) {
        const layerNeurons = neurons.filter(n => n.layer === l);
        if (layerNeurons.length === 0) continue;
        const x = layerNeurons[0].x;
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(layerNames[l] || `L${l}`, x, 16);
      }

      for (const conn of connections) {
        const fromN = neurons[conn.from];
        const toN = neurons[conn.to];
        if (!fromN || !toN) continue;

        fromN.radius += (fromN.targetRadius - fromN.radius) * 0.08;
        toN.radius += (toN.targetRadius - toN.radius) * 0.08;

        let alpha = 0.04;
        let lineWidth = 0.5;

        if (isTraining) {
          conn.signalPos += 0.015 + Math.random() * 0.005;
          if (conn.signalPos > 1) {
            conn.signalPos = 0;
            conn.signal = Math.random() > 0.4 ? 1 : 0;
          }

          if (conn.signal > 0) {
            alpha = 0.15 * conn.weight;
            lineWidth = 1;
          }
        }

        ctx.strokeStyle = `rgba(0, 113, 227, ${alpha})`;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();
        ctx.moveTo(fromN.x, fromN.y);
        ctx.lineTo(toN.x, toN.y);
        ctx.stroke();

        if (isTraining && conn.signal > 0) {
          const px = fromN.x + (toN.x - fromN.x) * conn.signalPos;
          const py = fromN.y + (toN.y - fromN.y) * conn.signalPos;
          const grad = ctx.createRadialGradient(px, py, 0, px, py, 6);
          grad.addColorStop(0, COLORS.signalGlow);
          grad.addColorStop(1, 'rgba(0, 113, 227, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(px, py, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }

      for (const neuron of neurons) {
        if (isTraining) {
          neuron.activation = 0.3 + Math.sin(timeRef.current * 3 + neuron.layer * 0.5 + neuron.index * 0.3) * 0.35 + 0.35;
        } else {
          neuron.activation *= 0.97;
        }

        const r = neuron.radius;
        if (r < 0.5) continue;

        if (neuron.activation > 0.3) {
          const glowR = r + 8 * neuron.activation;
          const grad = ctx.createRadialGradient(neuron.x, neuron.y, r, neuron.x, neuron.y, glowR);
          grad.addColorStop(0, `rgba(0, 113, 227, ${0.15 * neuron.activation})`);
          grad.addColorStop(1, 'rgba(0, 113, 227, 0)');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(neuron.x, neuron.y, glowR, 0, Math.PI * 2);
          ctx.fill();
        }

        const fillColor = neuron.activation > 0.3
          ? `rgba(0, 113, 227, ${0.3 + neuron.activation * 0.7})`
          : COLORS.neuronIdle;
        ctx.fillStyle = fillColor;
        ctx.beginPath();
        ctx.arc(neuron.x, neuron.y, r, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = neuron.activation > 0.3
          ? `rgba(0, 113, 227, ${0.4 + neuron.activation * 0.4})`
          : 'rgba(0, 0, 0, 0.08)';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.008;

        if (p.life <= 0 || p.x > w + 10) {
          particles.splice(i, 1);
          continue;
        }

        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      if (isTraining) {
        ctx.fillStyle = COLORS.text;
        ctx.font = '600 11px Inter, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`Epoch ${currentEpoch.toFixed(2)}`, 12, h - 30);
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '10px IBM Plex Mono, monospace';
        ctx.fillText(`${networkSize} layers  |  ${neurons.length} neurons  |  ${connections.length} connections`, 12, h - 14);
      } else {
        ctx.fillStyle = COLORS.textMuted;
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(!isConnected ? 'Waiting for Engine Connection...' : 'Start Training to see the network come alive', w / 2, h - 14);
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [isTraining, networkSize, currentEpoch, buildNetwork, isConnected]);

  useEffect(() => {
    if (!isTraining) return;

    // Grow network progressively based on Epoch
    const targetLayers = Math.min(MAX_LAYERS, Math.floor(currentEpoch * 2) + 2);
    if (networkSize < targetLayers) {
       setNetworkSize(targetLayers);
       const canvas = canvasRef.current;
       if (canvas && canvas.parentElement) {
         const rect = canvas.parentElement.getBoundingClientRect();
         buildNetwork(targetLayers, rect.width, rect.height);
       }
    }

    const particleInterval = setInterval(() => {
      if (isTraining) spawnParticles();
    }, 200);

    return () => clearInterval(particleInterval);
  }, [isTraining, currentEpoch, networkSize, buildNetwork, spawnParticles]);

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex-1 relative overflow-hidden" style={{ background: COLORS.bg }}>
        <canvas ref={canvasRef} className="absolute inset-0" />
      </div>
    </div>
  );
}
