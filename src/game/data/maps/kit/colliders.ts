/**
 * Serializable collision layout shared by map data and the physics compiler.
 * Positions use world units (metres), matching the renderer.
 */

export interface ColliderVector3 {
  x: number;
  y: number;
  z: number;
}

export interface StaticColliderBase {
  id: string;
  /**
   * Box/cylinder: centre of the shape.
   * Ramp/stairs: centre of the footprint at the floor height.
   */
  position: ColliderVector3;
  /** Rotation around the world Y axis, in radians. */
  yaw?: number;
  friction?: number;
  restitution?: number;
}

export interface BoxColliderSpec extends StaticColliderBase {
  kind: "box";
  /** Full extents, not half extents. */
  size: ColliderVector3;
}

export interface RampColliderSpec extends StaticColliderBase {
  kind: "ramp";
  width: number;
  /** Horizontal run along local +Z, from the low edge to the high edge. */
  length: number;
  height: number;
}

export interface CylinderColliderSpec extends StaticColliderBase {
  kind: "cylinder";
  radius: number;
  height: number;
}

export interface StairsColliderSpec extends StaticColliderBase {
  kind: "stairs";
  width: number;
  steps: number;
  rise: number;
  run: number;
}

export type StaticColliderSpec =
  | BoxColliderSpec
  | RampColliderSpec
  | CylinderColliderSpec
  | StairsColliderSpec;

export interface StaticCourseLayout {
  id: string;
  name: string;
  /** Optional world-space origin applied to every collider in the layout. */
  origin?: ColliderVector3;
  colliders: readonly StaticColliderSpec[];
}
