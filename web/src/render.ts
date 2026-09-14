import * as THREE from 'three';
import type { Vec3Like } from './engine';

const UNIT_SPHERE = new THREE.SphereGeometry(1, 24, 16);

/** Every particle of the world drawn as a sphere scaled by its radius. */
export class ParticleSpheres {
  readonly mesh: THREE.InstancedMesh;
  private readonly matrix = new THREE.Matrix4();

  /** Sized by the world's capacity; only the first particleCount instances are drawn. */
  constructor(capacity: number) {
    const material = new THREE.MeshStandardMaterial({ color: 0xf2a541, roughness: 0.6, metalness: 0.05 });
    this.mesh = new THREE.InstancedMesh(UNIT_SPHERE, material, capacity);
    this.mesh.count = 0;
    this.mesh.castShadow = true;
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

/** Straight segments between particles, drawn for springs, bungees and links. */
export class SegmentLines {
  readonly lines: THREE.LineSegments;
  private readonly buffer: Float32Array;

  constructor(private readonly segments: [SegmentEnd, SegmentEnd][]) {
    this.buffer = new Float32Array(6 * segments.length);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.buffer, 3));
    this.lines = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: 0xdddddd }));
    this.lines.frustumCulled = false;
  }

  update(positions: Float32Array): void {
    this.segments.forEach(([from, to], segment) => {
      this.writeEnd(positions, from, 6 * segment);
      this.writeEnd(positions, to, 6 * segment + 3);
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
  const plane = new THREE.Mesh(
    new THREE.PlaneGeometry(size, size),
    new THREE.MeshStandardMaterial({ color: 0x2b3440, roughness: 0.9 }),
  );
  plane.rotation.x = -Math.PI / 2;
  plane.receiveShadow = true;
  group.add(plane);
  const grid = new THREE.GridHelper(size, size, 0x556270, 0x3c4855);
  grid.position.y = 0.002;
  group.add(grid);
  return group;
}

/** A small grey box marking a fixed point of the scenery (a muzzle, an anchor). */
export function makeMarker(width: number, height: number, depth: number, at: Vec3Like): THREE.Mesh {
  const marker = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    new THREE.MeshStandardMaterial({ color: 0x8899aa }),
  );
  marker.position.set(at.x, at.y, at.z);
  return marker;
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
