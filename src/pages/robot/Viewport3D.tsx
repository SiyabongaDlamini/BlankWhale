import { useRef, useEffect, useState } from 'react';

/**
 * Viewport3D — Three.js-based robot visualizer.
 * 
 * Renders robot joint states received from the PyBullet engine
 * as a simplified 3D representation. Uses vanilla Three.js.
 */

interface Viewport3DProps {
  robotState: {
    position: [number, number, number];
    orientation: [number, number, number, number];
    jointPositions: number[];
  } | null;
  objects: Array<{
    id: number;
    position: [number, number, number];
    shape?: string;
    size?: [number, number, number];
    color?: string;
  }>;
  isSimulating: boolean;
  onPlay: () => void;
  onPause: () => void;
  onReset: () => void;
}

export default function Viewport3D({
  robotState,
  objects,
  isSimulating,
  onPlay,
  onPause,
  onReset,
}: Viewport3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fps, setFps] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animationId: number;
    let THREE: any;

    const init = async () => {
      try {
        THREE = await import('three');
      } catch {
        console.warn('Three.js not installed. Install: npm install three');
        return;
      }

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x0d0d1a);

      // Camera
      const camera = new THREE.PerspectiveCamera(
        60,
        canvas.clientWidth / canvas.clientHeight,
        0.1,
        1000
      );
      camera.position.set(3, 3, 3);
      camera.lookAt(0, 0, 0);

      // Renderer
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);

      // Lights
      const ambient = new THREE.AmbientLight(0x404060, 0.6);
      scene.add(ambient);
      const directional = new THREE.DirectionalLight(0xffffff, 0.8);
      directional.position.set(5, 10, 5);
      scene.add(directional);

      // Grid
      const grid = new THREE.GridHelper(10, 20, 0x333355, 0x222244);
      scene.add(grid);

      // Axes helper
      const axes = new THREE.AxesHelper(1);
      scene.add(axes);

      // Robot placeholder (simple linked boxes for joints)
      const robotGroup = new THREE.Group();
      scene.add(robotGroup);

      // Create joint segments
      const segments: any[] = [];
      const jointCount = robotState?.jointPositions?.length || 6;

      for (let i = 0; i < jointCount; i++) {
        const geo = new THREE.BoxGeometry(0.15, 0.4, 0.15);
        const mat = new THREE.MeshPhongMaterial({
          color: new THREE.Color().setHSL(i / jointCount, 0.7, 0.5),
          transparent: true,
          opacity: 0.85,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.y = i * 0.35;
        robotGroup.add(mesh);
        segments.push(mesh);
      }

      // Scene objects
      for (const obj of objects) {
        const size = obj.size || [0.3, 0.3, 0.3];
        const geo = new THREE.BoxGeometry(...size);
        const mat = new THREE.MeshPhongMaterial({
          color: obj.color || '#666688',
          transparent: true,
          opacity: 0.7,
        });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(...obj.position);
        scene.add(mesh);
      }

      // Mouse orbit
      let isDragging = false;
      let prevX = 0, prevY = 0;
      let theta = Math.PI / 4, phi = Math.PI / 4, radius = 5;

      canvas.addEventListener('mousedown', (e) => {
        isDragging = true;
        prevX = e.clientX;
        prevY = e.clientY;
      });
      canvas.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        theta -= (e.clientX - prevX) * 0.005;
        phi += (e.clientY - prevY) * 0.005;
        phi = Math.max(0.1, Math.min(Math.PI - 0.1, phi));
        prevX = e.clientX;
        prevY = e.clientY;
      });
      canvas.addEventListener('mouseup', () => { isDragging = false; });
      canvas.addEventListener('wheel', (e) => {
        radius += e.deltaY * 0.01;
        radius = Math.max(1, Math.min(20, radius));
      });

      // Animation loop
      let lastTime = performance.now();
      let frameCount = 0;

      const animate = () => {
        animationId = requestAnimationFrame(animate);

        // FPS
        frameCount++;
        const now = performance.now();
        if (now - lastTime >= 1000) {
          setFps(frameCount);
          frameCount = 0;
          lastTime = now;
        }

        // Camera orbit
        camera.position.x = radius * Math.sin(phi) * Math.cos(theta);
        camera.position.y = radius * Math.cos(phi);
        camera.position.z = radius * Math.sin(phi) * Math.sin(theta);
        camera.lookAt(0, 0.5, 0);

        // Update robot from state
        if (robotState) {
          robotGroup.position.set(...robotState.position);
          for (let i = 0; i < segments.length; i++) {
            if (robotState.jointPositions[i] !== undefined) {
              segments[i].rotation.z = robotState.jointPositions[i];
            }
          }
        }

        renderer.render(scene, camera);
      };

      animate();

      // Resize
      const onResize = () => {
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(canvas.clientWidth, canvas.clientHeight);
      };
      window.addEventListener('resize', onResize);

      return () => {
        cancelAnimationFrame(animationId);
        window.removeEventListener('resize', onResize);
        renderer.dispose();
      };
    };

    const cleanup = init();
    return () => {
      cleanup?.then((fn) => fn?.());
    };
  }, [objects]);

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', background: '#0a0a14' }}>
      {/* Toolbar */}
      <div
        style={{
          padding: '8px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        <button onClick={isSimulating ? onPause : onPlay} style={toolBtnStyle}>
          {isSimulating ? '⏸ Pause' : '▶ Play'}
        </button>
        <button onClick={onReset} style={toolBtnStyle}>
          🔄 Reset
        </button>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>{fps} FPS</span>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        style={{ flex: 1, width: '100%', outline: 'none' }}
      />
    </div>
  );
}

const toolBtnStyle: React.CSSProperties = {
  padding: '6px 14px',
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.1)',
  background: 'rgba(255,255,255,0.04)',
  color: '#fff',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
};
