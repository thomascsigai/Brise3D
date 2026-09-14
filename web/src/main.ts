import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { demos } from './demos';
import type { CameraView, Demo } from './demos/demo';
import { Engine } from './engine';
import { loadBrise } from './load-brise';
import { Loop } from './loop';
import { Overlay } from './overlay';
import { ParticleSpheres } from './render';

const DEFAULT_CAMERA: CameraView = { position: { x: 7, y: 5, z: 10 }, target: { x: 0, y: 2, z: 0 } };
/** A pointer that moves less than this (px) between down and up is a pick, not an orbit. */
const PICK_SLOP = 6;

async function main(): Promise<void> {
  const status = document.getElementById('status') as HTMLDivElement;
  status.hidden = false;
  const engine = new Engine(await loadBrise());
  status.hidden = true;

  const canvas = document.getElementById('view') as HTMLCanvasElement;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1b2027);
  scene.add(new THREE.HemisphereLight(0xdfe7f5, 0x2b3440, 1.2));
  const sun = new THREE.DirectionalLight(0xffffff, 2);
  sun.position.set(6, 12, 8);
  sun.castShadow = true;
  sun.shadow.camera.left = sun.shadow.camera.bottom = -15;
  sun.shadow.camera.right = sun.shadow.camera.top = 15;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);

  const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 500);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.maxPolarAngle = Math.PI / 2 - 0.02;

  const resize = () => {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  };
  window.addEventListener('resize', resize);
  resize();

  const loop = new Loop();
  let current: Demo | undefined;
  let spheres: ParticleSpheres | undefined;

  const disposeDemo = () => {
    current?.dispose();
    if (spheres) {
      scene.remove(spheres.mesh);
      spheres.dispose();
    }
    current = undefined;
    spheres = undefined;
  };

  // Reset is dispose + create: the demo makes a new world.
  const createDemo = (demo: Demo) => {
    disposeDemo();
    demo.create(engine, scene);
    spheres = new ParticleSpheres(engine.capacity());
    scene.add(spheres.mesh);
    current = demo;
  };

  const selectDemo = (index: number) => {
    const demo = demos[index];
    if (!demo || demo === current) return;
    createDemo(demo);
    overlay.showDemo(index, demo);
    const view = demo.camera ?? DEFAULT_CAMERA;
    camera.position.copy(view.position);
    controls.target.copy(view.target);
  };
  const overlay = new Overlay(demos, loop, {
    selectDemo,
    reset() {
      if (current) createDemo(current);
    },
  });

  // Tap or click (not drag) on the y = 0 plane
  const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const picked = new THREE.Vector3();
  let downAt: { x: number; y: number } | undefined;
  canvas.addEventListener('pointerdown', (event) => {
    downAt = { x: event.clientX, y: event.clientY };
  });
  canvas.addEventListener('pointerup', (event) => {
    if (!downAt || !current?.onGroundPick) return;
    const moved = Math.hypot(event.clientX - downAt.x, event.clientY - downAt.y);
    downAt = undefined;
    if (moved > PICK_SLOP) return;
    pointer.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    if (raycaster.ray.intersectPlane(groundPlane, picked)) current.onGroundPick(picked);
  });

  let last = performance.now();
  const frame = (now: number) => {
    const frameDt = (now - last) / 1000;
    last = now;
    if (current && spheres) {
      engine.update(loop.advance(frameDt));
      current.update?.();
      spheres.update(engine.positions(), engine.radii(), engine.particleCount());
    }
    controls.update();
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  };

  selectDemo(0);
  requestAnimationFrame(frame);
}

main().catch((error: unknown) => {
  const status = document.getElementById('status') as HTMLDivElement;
  status.hidden = false;
  status.textContent = `Failed to start: ${error instanceof Error ? error.message : String(error)}`;
  console.error(error);
});
