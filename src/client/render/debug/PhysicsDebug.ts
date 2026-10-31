import type { World } from "@dimforge/rapier3d-compat";
import * as THREE from "three";

function rgbaToRgb(colors: Float32Array): Float32Array {
  const vertexCount = Math.floor(colors.length / 4);
  const rgb = new Float32Array(vertexCount * 3);

  for (let vertex = 0; vertex < vertexCount; vertex += 1) {
    const source = vertex * 4;
    const target = vertex * 3;
    rgb[target] = colors[source] ?? 0;
    rgb[target + 1] = colors[source + 1] ?? 0;
    rgb[target + 2] = colors[source + 2] ?? 0;
  }

  return rgb;
}

/**
 * Rapier's debug renderer is the source of truth here. The line buffers are
 * generated from the live world, so the overlay cannot drift away from the
 * simulation colliders the way a parallel hand-built mesh could.
 */
export class PhysicsDebugWireframes {
  readonly object: THREE.LineSegments<
    THREE.BufferGeometry,
    THREE.LineBasicMaterial
  >;
  private disposed = false;

  constructor() {
    const geometry = new THREE.BufferGeometry();
    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthTest: false,
      depthWrite: false,
      toneMapped: false,
    });

    this.object = new THREE.LineSegments(geometry, material);
    this.object.name = "physics-debug-wireframes";
    this.object.frustumCulled = false;
    this.object.renderOrder = 100;
    this.object.visible = false;
  }

  get visible(): boolean {
    return this.object.visible;
  }

  setVisible(visible: boolean): void {
    this.object.visible = visible;
  }

  update(world: World): void {
    if (this.disposed) {
      throw new Error("Physics debug wireframes have been disposed.");
    }

    const buffers = world.debugRender();
    const position = new THREE.BufferAttribute(
      new Float32Array(buffers.vertices),
      3,
    );
    const color = new THREE.BufferAttribute(
      rgbaToRgb(buffers.colors),
      3,
    );

    this.object.geometry.setAttribute("position", position);
    this.object.geometry.setAttribute("color", color);
    this.object.geometry.computeBoundingSphere();
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.object.geometry.dispose();
    this.object.material.dispose();
    this.object.removeFromParent();
  }
}
