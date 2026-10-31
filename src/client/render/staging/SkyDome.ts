import * as THREE from "three";

export interface SkyDomeOptions {
  horizonColor?: number;
  zenithColor?: number;
  sunColor?: number;
  sunDirection?: THREE.Vector3;
  radius?: number;
}

export interface SkyDome {
  mesh: THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;
  follow: (position: THREE.Vector3) => void;
  dispose: () => void;
}

const SKY_VERTEX_SHADER = /* glsl */ `
  varying vec3 vDirection;

  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAGMENT_SHADER = /* glsl */ `
  uniform vec3 uHorizon;
  uniform vec3 uZenith;
  uniform vec3 uSunColor;
  uniform vec3 uSunDirection;

  varying vec3 vDirection;

  void main() {
    vec3 direction = normalize(vDirection);
    float elevation = clamp(direction.y * 0.5 + 0.5, 0.0, 1.0);
    vec3 color = mix(uHorizon, uZenith, smoothstep(0.46, 0.92, elevation));

    float sunDot = max(dot(direction, normalize(uSunDirection)), 0.0);
    float sunDisc = smoothstep(0.9988, 0.99945, sunDot);
    float sunHalo = pow(sunDot, 11.0) * 0.12;
    color += uSunColor * (sunDisc * 0.9 + sunHalo);

    float horizonBand = exp(-abs(direction.y) * 18.0) * 0.075;
    color += uHorizon * horizonBand;

    gl_FragColor = vec4(color, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

/**
 * A camera-centred atmospheric shell. The shader is intentionally cheap:
 * a vertical gradient, horizon lift and a single sun disc/halo.
 */
export function createSkyDome({
  horizonColor = 0x17231a,
  zenithColor = 0x040606,
  sunColor = 0xffd6a2,
  sunDirection = new THREE.Vector3(24, 34, 14),
  radius = 320,
}: SkyDomeOptions = {}): SkyDome {
  const geometry = new THREE.SphereGeometry(radius, 32, 18);
  const uniforms = {
    uHorizon: { value: new THREE.Color(horizonColor) },
    uZenith: { value: new THREE.Color(zenithColor) },
    uSunColor: { value: new THREE.Color(sunColor) },
    uSunDirection: { value: sunDirection.clone().normalize() },
  };
  const material = new THREE.ShaderMaterial({
    name: "vanta-sky",
    uniforms,
    vertexShader: SKY_VERTEX_SHADER,
    fragmentShader: SKY_FRAGMENT_SHADER,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = "sky-dome";
  mesh.renderOrder = -100;
  mesh.frustumCulled = false;

  return {
    mesh,
    follow: (position) => {
      mesh.position.copy(position);
    },
    dispose: () => {
      geometry.dispose();
      material.dispose();
    },
  };
}
