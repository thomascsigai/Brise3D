import * as THREE from 'three';
import type { Vec3Like } from './engine';

const UNIT_SPHERE = new THREE.SphereGeometry(1, 24, 16);

/** Every particle of the world drawn as a sphere scaled by its radius. */
export class ParticleSpheres {
  readonly mesh: THREE.InstancedMesh;
  private readonly matrix = new THREE.Matrix4();
  private readonly defaultColor = new THREE.Color(0xf2a541);

  /** Sized by the world's capacity; only the first particleCount instances are drawn. */
  constructor(capacity: number) {
    const material = new THREE.MeshStandardMaterial({ roughness: 0.6, metalness: 0.05 });
    this.mesh = new THREE.InstancedMesh(UNIT_SPHERE, material, capacity);
    this.mesh.count = 0;
    this.mesh.castShadow = true;
    for (let i = 0; i < capacity; i++) this.mesh.setColorAt(i, this.defaultColor);
  }

  setColor(index: number, color: THREE.ColorRepresentation): void {
    this.mesh.setColorAt(index, new THREE.Color(color));
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  update(positions: Float32Array, radii: Float32Array, count: number): void {
    for (let i = 0; i < count; i++) {
      const r = radii[i];
      this.matrix.makeScale(r, r, r);
      this.matrix.setPosition(positions[3 * i], positions[3 * i + 1], positions[3 * i + 2]);
      this.mesh.setMatrixAt(i, this.matrix);
    }
    this.mesh.count = count;
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose(): void {
    (this.mesh.material as THREE.Material).dispose();
    this.mesh.dispose();
  }
}

/** One end of a drawn segment: a particle index, or a fixed point (an anchor). */
export type SegmentEnd = number | Vec3Like;

/** Straight segments between particles (links, springs, bungees). */
export class LinkLines {
  readonly lines: THREE.LineSegments;
  private readonly buffer: Float32Array;

  constructor(
    private readonly segments: [SegmentEnd, SegmentEnd][],
    color: THREE.ColorRepresentation = 0xdddddd,
  ) {
    this.buffer = new Float32Array(6 * segments.length);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.buffer, 3));
    this.lines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color }));
    this.lines.frustumCulled = false;
  }

  update(positions: Float32Array): void {
    this.segments.forEach(([a, b], s) => {
      this.writeEnd(positions, a, 6 * s);
      this.writeEnd(positions, b, 6 * s + 3);
    });
    this.lines.geometry.getAttribute('position').needsUpdate = true;
  }

  private writeEnd(positions: Float32Array, end: SegmentEnd, at: number): void {
    if (typeof end === 'number') {
      this.buffer[at] = positions[3 * end];
      this.buffer[at + 1] = positions[3 * end + 1];
      this.buffer[at + 2] = positions[3 * end + 2];
    } else {
      this.buffer[at] = end.x;
      this.buffer[at + 1] = end.y;
      this.buffer[at + 2] = end.z;
    }
  }

  dispose(): void {
    this.lines.geometry.dispose();
    (this.lines.material as THREE.Material).dispose();
  }
}

/** A flat ground at y = 0 with a grid, for demos that add a ground plane. */
export function makeGround(size: number): THREE.Group {
  const group = new THREE.Group();
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshStandardMaterial({ color: 0x2b3440, roughness: 0.9 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);
  const grid = new THREE.GridHelper(size, size, 0x556270, 0x3c4855);
  grid.position.y = 0.002;
  group.add(grid);
  return group;
}

/** Disposes the geometries and materials of everything under an object. */
export function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.LineSegments || child instanceof THREE.Line) {
      child.geometry.dispose();
      const material = child.material as THREE.Material | THREE.Material[];
      (Array.isArray(material) ? material : [material]).forEach((m) => m.dispose());
    }
  });
}
