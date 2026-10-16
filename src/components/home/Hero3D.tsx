'use client';

import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * Phase 4 (A10) — ambient hero canvas. Abstract "luxury particles" (~280 points
 * in orange/rose) + a slow wireframe torus, transparent over the `#0B1120` bg.
 *
 * Deliberately texture-free: no cross-origin image loads, no CORS risk, nothing
 * to break. Strict budget: capped pixelRatio, fixed particle count, paused when
 * the tab is hidden or the canvas leaves the viewport, full dispose on unmount.
 * Any WebGL failure leaves an empty transparent layer — content underneath is
 * untouched (fallback tier 3).
 */
export default function Hero3D() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer | null = null;
    let raf = 0;
    let visible = true;
    let disposed = false;

    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.setClearColor(0x000000, 0);
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(0, 0, 9);

    // Particle field: two brand-colored point clouds drifting upward.
    const COUNT = 280;
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const orange = new THREE.Color('#fb923c');
    const rose = new THREE.Color('#fb7185');
    for (let i = 0; i < COUNT; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 16;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 6;
      const c = Math.random() > 0.45 ? orange : rose;
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    const pointsGeo = new THREE.BufferGeometry();
    pointsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pointsGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const pointsMat = new THREE.PointsMaterial({
      size: 0.055,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });
    const points = new THREE.Points(pointsGeo, pointsMat);
    scene.add(points);

    // Wireframe torus, slow rotation, right side of frame.
    const torusGeo = new THREE.TorusGeometry(2.4, 0.5, 12, 42);
    const torusMat = new THREE.MeshBasicMaterial({ color: '#f97316', wireframe: true, transparent: true, opacity: 0.16 });
    const torus = new THREE.Mesh(torusGeo, torusMat);
    torus.position.set(3.4, 0.4, -1.5);
    torus.rotation.x = 0.5;
    scene.add(torus);

    const ringGeo = new THREE.TorusGeometry(3.4, 0.02, 8, 64);
    const ringMat = new THREE.MeshBasicMaterial({ color: '#fb7185', transparent: true, opacity: 0.22 });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.set(3.4, 0.4, -2);
    ring.rotation.x = Math.PI / 2.4;
    scene.add(ring);

    const resize = () => {
      if (!mount || !renderer) return;
      const w = mount.clientWidth || 1;
      const h = mount.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
      },
      { threshold: 0 },
    );
    io.observe(mount);

    const onVisibility = () => {
      visible = !document.hidden && visible;
    };
    document.addEventListener('visibilitychange', onVisibility);

    const clock = new THREE.Clock();
    // Mouse parallax: camera eases toward the cursor. Clicks spawn a short
    // particle burst at a random spot. Both are pointer-only niceties — the
    // scene is fully legible without them.
    const mouse = { x: 0, y: 0 };
    const onMouseMove = (e: MouseEvent) => {
      mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener('mousemove', onMouseMove);

    interface Burst { points: THREE.Points; life: number; velocities: Float32Array }
    const bursts: Burst[] = [];
    const BURST_COUNT = 60;
    const onClick = (e: MouseEvent) => {
      if (disposed || !renderer || bursts.length > 4) return;
      // Canvas is pointer-events-none so clicks land on content below; only
      // react to clicks inside the hero section.
      const target = e.target as HTMLElement | null;
      if (!target || !target.closest || !target.closest('#hero')) return;
      const rect = mount.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      // Unproject screen point onto the z=0 plane for the burst origin.
      const vec = new THREE.Vector3(nx, ny, 0.5).unproject(camera);
      const dir = vec.sub(camera.position).normalize();
      const origin = camera.position.clone().add(dir.multiplyScalar(8));
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(BURST_COUNT * 3);
      const vel = new Float32Array(BURST_COUNT * 3);
      for (let i = 0; i < BURST_COUNT; i += 1) {
        pos[i * 3] = origin.x;
        pos[i * 3 + 1] = origin.y;
        pos[i * 3 + 2] = origin.z;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const speed = 1.5 + Math.random() * 2.5;
        vel[i * 3] = Math.sin(phi) * Math.cos(theta) * speed;
        vel[i * 3 + 1] = Math.sin(phi) * Math.sin(theta) * speed;
        vel[i * 3 + 2] = Math.cos(phi) * speed;
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({
        color: Math.random() > 0.5 ? '#fdba74' : '#fda4af',
        size: 0.07,
        transparent: true,
        opacity: 1,
        depthWrite: false,
      });
      const points = new THREE.Points(geo, mat);
      scene.add(points);
      bursts.push({ points, life: 1, velocities: vel });
    };
    window.addEventListener('click', onClick);

    const tick = () => {
      if (disposed) return;
      raf = requestAnimationFrame(tick);
      if (!visible || document.hidden || !renderer) return;
      const t = clock.getElapsedTime();
      points.rotation.y = t * 0.03;
      // Parallax: ease camera toward the cursor, base position preserved.
      camera.position.x += (mouse.x * 1.2 - camera.position.x) * 0.04;
      camera.position.y += (mouse.y * 0.8 - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);
      torus.rotation.y = t * 0.08;
      torus.rotation.z = t * 0.05;
      ring.rotation.z = -t * 0.04;
      // Age bursts: expand, fade, dispose.
      for (let i = bursts.length - 1; i >= 0; i -= 1) {
        const burst = bursts[i];
        burst.life -= 0.016;
        const attr = burst.points.geometry.getAttribute('position') as THREE.BufferAttribute;
        const arr = attr.array as Float32Array;
        for (let j = 0; j < BURST_COUNT; j += 1) {
          arr[j * 3] += burst.velocities[j * 3] * 0.016;
          arr[j * 3 + 1] += burst.velocities[j * 3 + 1] * 0.016;
          arr[j * 3 + 2] += burst.velocities[j * 3 + 2] * 0.016;
        }
        attr.needsUpdate = true;
        (burst.points.material as THREE.PointsMaterial).opacity = Math.max(0, burst.life);
        if (burst.life <= 0) {
          scene.remove(burst.points);
          burst.points.geometry.dispose();
          (burst.points.material as THREE.Material).dispose();
          bursts.splice(i, 1);
        }
      }
      renderer.render(scene, camera);
    };
    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      io.disconnect();
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('click', onClick);
      document.removeEventListener('visibilitychange', onVisibility);
      pointsGeo.dispose();
      pointsMat.dispose();
      torusGeo.dispose();
      torusMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      renderer?.dispose();
      if (renderer && mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement);
      renderer = null;
    };
  }, []);

  return <div ref={mountRef} aria-hidden="true" className="absolute inset-0 pointer-events-none [&>canvas]:h-full [&>canvas]:w-full" />;
}
