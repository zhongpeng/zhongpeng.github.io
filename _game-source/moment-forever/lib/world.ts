import * as THREE from 'three';
import {
  START,
  LIGHTHOUSE,
  TREE_POSITIONS,
  WORLD_OBSTACLES,
  findPath,
  heightAt,
  regionAt,
  stepPosition,
  type Point,
} from './island';
import { memories, NEEDS, resolveAnswer, type Answer } from './journey';
export type WorldStatus = {
  position: Point;
  nearest: string | null;
  region: number;
  age: number;
  moving: boolean;
  destination: boolean;
};
export type WorldOptions = {
  paused: boolean;
  moment: boolean;
  reduced: boolean;
  overview: boolean;
  answers: Answer[];
};
const C = {
  sea: 0x63959e,
  land: 0x9da986,
  sand: 0xd7c6a5,
  wood: 0x8b6e57,
  leaf: 0x839c88,
  pink: 0xcda99c,
  cream: 0xf1e9d7,
  dark: 0x334e54,
  gold: 0xf1d48b,
};
function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
const material = (
  color: THREE.ColorRepresentation,
  extra: THREE.MeshStandardMaterialParameters = {},
) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: 0.95,
    flatShading: true,
    ...extra,
  });
function mesh(
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  parent: THREE.Object3D,
  x = 0,
  y = 0,
  z = 0,
) {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function box(
  parent: THREE.Object3D,
  w: number,
  h: number,
  d: number,
  color: THREE.ColorRepresentation,
  x = 0,
  y = 0,
  z = 0,
) {
  return mesh(new THREE.BoxGeometry(w, h, d), material(color), parent, x, y, z);
}
function cylinder(
  parent: THREE.Object3D,
  r: number,
  h: number,
  color: THREE.ColorRepresentation,
  x = 0,
  y = 0,
  z = 0,
  top = r,
) {
  return mesh(
    new THREE.CylinderGeometry(top, r, h, 8),
    material(color),
    parent,
    x,
    y,
    z,
  );
}
function ellipsoid(
  parent: THREE.Object3D,
  x: number,
  y: number,
  z: number,
  sx: number,
  sy: number,
  sz: number,
  color: THREE.ColorRepresentation,
) {
  const o = mesh(
    new THREE.IcosahedronGeometry(1, 1),
    material(color),
    parent,
    x,
    y,
    z,
  );
  o.scale.set(sx, sy, sz);
  return o;
}
function line(
  points: THREE.Vector3[],
  color: THREE.ColorRepresentation,
  parent: THREE.Object3D,
) {
  const l = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(points),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.5 }),
  );
  parent.add(l);
  return l;
}
function character(ghost = false) {
  const group = new THREE.Group(),
    body = new THREE.Group();
  group.add(body);
  const coat = ghost ? 0xb4d9d0 : 0xe1cda5;
  cylinder(body, 0.29, 0.58, coat, 0, 0.78, 0, 0.24);
  const head = ellipsoid(
    body,
    0,
    1.33,
    0,
    0.28,
    0.3,
    0.26,
    ghost ? 0xc9ddd0 : 0xe8c6a5,
  );
  ellipsoid(
    body,
    0,
    1.48,
    -0.035,
    0.29,
    0.17,
    0.255,
    ghost ? 0xb4d9d0 : 0x4b4a42,
  );
  // Face points toward +Z; the body rotates to face its movement direction.
  box(body, 0.045, 0.045, 0.015, 0x384044, -0.09, 1.36, 0.242);
  box(body, 0.045, 0.045, 0.015, 0x384044, 0.09, 1.36, 0.242);
  const legs = [new THREE.Group(), new THREE.Group()];
  legs.forEach((leg, i) => {
    leg.position.set(i ? 0.14 : -0.14, 0.52, 0);
    body.add(leg);
    cylinder(leg, 0.1, 0.38, ghost ? 0xb4d9d0 : 0x667b74, 0, -0.16, 0);
    box(leg, 0.19, 0.1, 0.3, 0x495b58, 0, -0.37, 0.05);
  });
  const arms = [new THREE.Group(), new THREE.Group()];
  arms.forEach((arm, i) => {
    arm.position.set(i ? 0.3 : -0.3, 1, 0);
    body.add(arm);
    cylinder(arm, 0.08, 0.4, coat, 0, -0.17, 0);
    ellipsoid(arm, 0, -0.4, 0, 0.08, 0.09, 0.08, ghost ? 0xb4d9d0 : 0xe8c6a5);
  });
  const scarf = box(
    body,
    0.51,
    0.12,
    0.53,
    ghost ? 0xb4d9d0 : 0xb97060,
    0,
    1.12,
    0,
  );
  const tail = box(
    body,
    0.15,
    0.4,
    0.06,
    ghost ? 0xb4d9d0 : 0xb97060,
    0.16,
    0.9,
    -0.32,
  );
  const satchel = box(body, 0.3, 0.33, 0.14, 0x7e8570, 0, 0.82, -0.3);
  if (ghost)
    group.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        const m = o.material as THREE.MeshStandardMaterial;
        m.transparent = true;
        m.opacity = 0.18;
        m.depthWrite = false;
        o.castShadow = false;
      }
    });
  return { group, body, legs, arms, head, scarf, tail, satchel };
}
export class IslandWorld {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.OrthographicCamera;
  private player = character();
  private ghost = character(true);
  private position: Point = { ...START };
  private age = 0;
  private options: WorldOptions = {
    paused: false,
    moment: false,
    reduced: false,
    overview: true,
    answers: [],
  };
  private input: Point = { x: 0, z: 0 };
  private keys = new Set<string>();
  private path: Point[] = [];
  private previous = 0;
  private time = 0;
  private reportTime = 0;
  private onStatus: (s: WorldStatus) => void;
  private onInteract: (id: string) => void;
  private onError: () => void;
  private canvas: HTMLCanvasElement;
  private observer: ResizeObserver;
  private sea: THREE.Mesh;
  private seaBase: Float32Array;
  private trees: THREE.Group[] = [];
  private swings: THREE.Group[] = [];
  private windmills: THREE.Group[] = [];
  private clouds: THREE.Group[] = [];
  private beacons = new Map<
    string,
    {
      group: THREE.Group;
      orb: THREE.Mesh;
      ring: THREE.Mesh;
      flowers: THREE.Group;
    }
  >();
  private companions = new THREE.Group();
  private birds: THREE.Group[] = [];
  private beam: THREE.Mesh;
  private beaconLight: THREE.PointLight;
  private cursor: THREE.Mesh;
  private dust: THREE.Points;
  private ray = new THREE.Raycaster();
  private ground = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private cameraTarget = new THREE.Vector3(0, 0, 0);
  private sun: THREE.DirectionalLight;
  private disposed = false;
  private nearest: string | null = null;
  private pointerStart: Point | null = null;
  private pendingFormSignature = '';
  constructor(
    canvas: HTMLCanvasElement,
    onStatus: (s: WorldStatus) => void,
    onInteract: (id: string) => void,
    onError: () => void,
  ) {
    this.canvas = canvas;
    this.onStatus = onStatus;
    this.onInteract = onInteract;
    this.onError = onError;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'low-power',
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(0x93b6b7);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.16;
    this.scene.fog = new THREE.FogExp2(0x93b6b7, 0.007);
    this.camera = new THREE.OrthographicCamera(-20, 20, 15, -15, 0.1, 160);
    this.scene.add(new THREE.HemisphereLight(0xf9e9cf, 0x738a7c, 2));
    this.sun = new THREE.DirectionalLight(0xffdfac, 3);
    this.sun.position.set(-18, 30, 12);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    Object.assign(this.sun.shadow.camera, {
      left: -36,
      right: 36,
      top: 30,
      bottom: -30,
      near: 1,
      far: 80,
    });
    this.sun.shadow.normalBias = 0.05;
    this.scene.add(this.sun);
    this.makeIsland();
    const seaGeometry = new THREE.PlaneGeometry(190, 150, 90, 70);
    seaGeometry.rotateX(-Math.PI / 2);
    this.seaBase = new Float32Array(seaGeometry.attributes.position.array);
    this.sea = mesh(
      seaGeometry,
      material(C.sea, { metalness: 0.05, roughness: 0.48, flatShading: false }),
      this.scene,
      0,
      -0.65,
      0,
    );
    this.sea.castShadow = false;
    this.makePaths();
    this.makeScenery();
    this.makeMemories();
    this.makeLighthouse();
    this.scene.add(this.player.group, this.ghost.group, this.companions);
    this.ghost.group.visible = false;
    this.cursor = mesh(
      new THREE.RingGeometry(0.35, 0.4, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffe7b2,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      }),
      this.scene,
    );
    this.cursor.rotation.x = -Math.PI / 2;
    this.cursor.visible = false;
    const random = rng(87),
      points = [];
    for (let i = 0; i < 95; i++)
      points.push(
        (random() - 0.5) * 58,
        random() * 3 + 1,
        (random() - 0.5) * 36,
      );
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(points, 3),
    );
    this.dust = new THREE.Points(
      dustGeo,
      new THREE.PointsMaterial({
        color: 0xffe6b2,
        size: 0.055,
        transparent: true,
        opacity: 0.5,
      }),
    );
    this.scene.add(this.dust);
    this.beam = mesh(
      new THREE.ConeGeometry(4, 18, 24, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffebbb,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.025,
        depthWrite: false,
      }),
      this.scene,
    );
    this.beam.rotation.z = Math.PI / 2;
    this.beam.position.set(11, heightAt(19, -13) + 5.9, -13);
    this.beam.castShadow = false;
    this.beaconLight = new THREE.PointLight(0xffd38b, 3, 16);
    this.beaconLight.position.set(19, heightAt(19, -13) + 5.8, -13);
    this.scene.add(this.beaconLight);
    this.resize();
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    canvas.addEventListener('pointerdown', this.pointerDown);
    canvas.addEventListener('pointerup', this.pointerUp);
    canvas.addEventListener('webglcontextlost', this.contextLost);
    window.addEventListener('keydown', this.keyDown);
    window.addEventListener('keyup', this.keyUp);
    window.addEventListener('blur', this.releaseControls);
    document.addEventListener('visibilitychange', this.visibility);
    this.renderer.setAnimationLoop(this.frame);
  }
  private makeIsland() {
    const positions: number[] = [],
      colors: number[] = [],
      indices: number[] = [];
    const steps = 100,
      rings = 22;
    const sand = new THREE.Color(C.sand),
      grass = new THREE.Color(C.land);
    positions.push(0, heightAt(0, 0), 0);
    colors.push(grass.r, grass.g, grass.b);
    for (let ring = 1; ring <= rings; ring++)
      for (let i = 0; i <= steps; i++) {
        const angle = (i / steps) * Math.PI * 2,
          r = ring / rings;
        const ripple =
          1 + 0.016 * Math.sin(angle * 7) + 0.011 * Math.cos(angle * 13);
        const x = Math.cos(angle) * 29 * r * ripple,
          z = Math.sin(angle) * 21 * r * ripple,
          y = heightAt(x, z) - (r > 0.92 ? (r - 0.92) * 13 : 0);
        positions.push(x, y, z);
        const color = grass.clone().lerp(sand, Math.max(0, (r - 0.8) * 5));
        if (x > 8) color.lerp(new THREE.Color(0xb5ae85), 0.18);
        color.multiplyScalar(0.96 + Math.sin(x * 1.4 + z * 3) * 0.035);
        colors.push(color.r, color.g, color.b);
      }
    for (let i = 0; i < steps; i++) indices.push(0, 1 + i + 1, 1 + i);
    for (let ring = 1; ring < rings; ring++)
      for (let i = 0; i < steps; i++) {
        const a = 1 + (ring - 1) * (steps + 1) + i,
          b = a + steps + 1;
        indices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const land = mesh(
      geo,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 1,
        flatShading: true,
        side: THREE.DoubleSide,
      }),
      this.scene,
    );
    land.castShadow = false;
    const shore = [];
    for (let i = 0; i <= 160; i++) {
      const a = (i / 160) * Math.PI * 2;
      shore.push(
        new THREE.Vector3(Math.cos(a) * 29.6, -0.35, Math.sin(a) * 21.5),
      );
    }
    line(shore, 0xc0d4c8, this.scene);
  }
  private makePaths() {
    const routes: Point[][] = [
      [
        START,
        { x: -17, z: 3 },
        { x: -16, z: -5 },
        { x: -11, z: -8 },
        { x: -6, z: -3 },
        { x: 3, z: 1 },
        { x: 10, z: 1 },
        { x: 16, z: -4 },
        { x: 19, z: -11 },
      ],
      [
        { x: -17, z: 3 },
        { x: -7, z: 7 },
        { x: -4, z: 9 },
        { x: 5, z: 13 },
        { x: 10, z: 8 },
        { x: 13, z: 2 },
      ],
      [
        { x: -16, z: -5 },
        { x: -19, z: -6 },
      ],
      [
        { x: 10, z: 1 },
        { x: 11, z: -8 },
        { x: 13, z: -12 },
        { x: 19, z: -11 },
      ],
      [
        { x: 16, z: -4 },
        { x: 21, z: -2 },
      ],
    ];
    const pathMaterial = material(0xd8c9a7);
    for (const route of routes)
      for (let i = 1; i < route.length; i++) {
        const a = route[i - 1],
          b = route[i],
          length = Math.hypot(b.x - a.x, b.z - a.z),
          n = Math.ceil(length / 0.55);
        for (let k = 0; k <= n; k++) {
          const t = k / n,
            x = a.x + (b.x - a.x) * t,
            z = a.z + (b.z - a.z) * t;
          const p = mesh(
            new THREE.CircleGeometry(0.78, 10),
            pathMaterial,
            this.scene,
            x,
            heightAt(x, z) + 0.024,
            z,
          );
          p.rotation.x = -Math.PI / 2;
          p.castShadow = false;
        }
      }
    for (const p of [
      { x: -6, z: 2 },
      { x: 10, z: 1 },
    ]) {
      const g = new THREE.Group();
      g.position.set(p.x, heightAt(p.x, p.z), p.z);
      this.scene.add(g);
      box(g, 0.13, 1.2, 0.13, C.wood, 0, 0.6, 0);
      const a = box(g, 0.85, 0.18, 0.12, 0xe4d5b2, -0.18, 1.03, 0);
      a.rotation.z = 0.06;
      const b = box(g, 0.85, 0.18, 0.12, 0xe4d5b2, 0.18, 0.77, 0);
      b.rotation.z = -0.06;
    }
  }
  private makeScenery() {
    const random = rng(745);
    for (const [i, p] of TREE_POSITIONS.entries()) {
      const tree = new THREE.Group();
      tree.position.set(p.x, heightAt(p.x, p.z), p.z);
      this.scene.add(tree);
      cylinder(tree, 0.18, 2.2, C.wood, 0, 1.1, 0, 0.11);
      const color = p.x > 9 ? 0xbcb58c : i % 3 === 0 ? C.pink : C.leaf;
      ellipsoid(tree, 0, 2.5, 0, 1.2, 1.35, 1.15, color);
      ellipsoid(tree, -0.65, 2, 0, 0.85, 1, 0.9, color);
      ellipsoid(tree, 0.55, 2.15, 0.2, 0.8, 1.1, 0.9, color);
      this.trees.push(tree);
    }
    // Instanced ground cover reduces draw calls on phones.
    const count = 900,
      blades = new THREE.InstancedMesh(
        new THREE.ConeGeometry(0.035, 0.22, 3),
        material(0x718d77),
        count,
      ),
      matrix = new THREE.Object3D();
    let placed = 0;
    while (placed < count) {
      const x = (random() - 0.5) * 53,
        z = (random() - 0.5) * 37;
      if ((x / 27) ** 2 + (z / 19) ** 2 > 1) continue;
      matrix.position.set(x, heightAt(x, z) + 0.09, z);
      matrix.rotation.set(0, random() * Math.PI, random() * 0.2);
      matrix.scale.setScalar(0.5 + random());
      matrix.updateMatrix();
      blades.setMatrixAt(placed++, matrix.matrix);
    }
    this.scene.add(blades);
    for (let i = 0; i < 25; i++) {
      const a = random() * Math.PI * 2,
        x = Math.cos(a) * 27,
        z = Math.sin(a) * 19;
      const rock = ellipsoid(
        this.scene,
        x,
        heightAt(x, z) - 0.05,
        z,
        0.4 + random() * 0.7,
        0.3 + random() * 0.5,
        0.4 + random() * 0.6,
        0x939e91,
      );
      rock.rotation.y = random() * 6;
    }
    for (let i = 0; i < 7; i++) {
      const cloud = new THREE.Group();
      cloud.position.set((i - 3) * 14, 9 + (i % 3) * 1.4, -22 - (i % 2) * 5);
      for (let j = 0; j < 3; j++)
        ellipsoid(
          cloud,
          j * 1.2,
          Math.sin(j) * 0.2,
          0,
          1.6,
          0.55,
          0.75,
          0xe5e8df,
        );
      this.clouds.push(cloud);
      this.scene.add(cloud);
    }
    for (let i = 0; i < 6; i++) {
      const bird = new THREE.Group();
      const geo = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.3, 0, 0),
        new THREE.Vector3(0, 0.07, 0),
        new THREE.Vector3(0.3, 0, 0),
      ]);
      bird.add(
        new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xe7ece1 })),
      );
      this.birds.push(bird);
      this.scene.add(bird);
    }
  }
  private makeMemories() {
    for (const m of memories) {
      const base = new THREE.Group();
      base.position.set(
        m.position.x,
        heightAt(m.position.x, m.position.z),
        m.position.z,
      );
      this.scene.add(base);
      if (m.kind === 'marble') {
        cylinder(base, 0.52, 0.18, C.wood, 0, 0.09, 0);
        ellipsoid(base, 0, 0.32, 0, 0.16, 0.16, 0.16, 0x72b9cc);
        for (let i = 0; i < 4; i++)
          ellipsoid(
            base,
            -0.5 + i * 0.3,
            0.08,
            0.55,
            0.1,
            0.1,
            0.1,
            [0xd9b488, 0xb07e73, 0x87afba, 0xe1c997][i],
          );
      }
      if (m.kind === 'house') {
        const house = new THREE.Group();
        house.position.z = -1.9;
        base.add(house);
        box(house, 3.2, 2.4, 2.7, 0xd6c9ae, 0, 1.2, 0);
        const roof = mesh(
          new THREE.ConeGeometry(2.65, 1.45, 4),
          material(0x9f8473),
          house,
          0,
          3,
          0,
        );
        roof.rotation.y = Math.PI / 4;
        box(house, 0.7, 1.45, 0.08, C.wood, 0.55, 0.75, 1.39);
        box(house, 0.7, 0.7, 0.08, 0xefdca8, -0.72, 1.55, 1.4);
        box(house, 0.8, 0.07, 0.2, C.wood, -0.72, 1.16, 1.45);
        cylinder(base, 0.42, 0.16, C.wood, 0, 0.56, 0.45);
        for (const x of [-0.25, 0.25])
          for (const z of [0.2, 0.7])
            box(base, 0.1, 0.5, 0.1, C.wood, x, 0.26, z);
      }
      if (m.kind === 'swing') {
        for (const x of [-1, 1])
          for (const z of [-0.45, 0.45]) {
            const leg = box(base, 0.13, 2.35, 0.13, C.wood, x, 1.17, z);
            leg.rotation.x = z * 0.38;
          }
        box(base, 2.5, 0.16, 0.18, C.wood, 0, 2.35, 0);
        const swing = new THREE.Group();
        swing.position.y = 2.3;
        base.add(swing);
        for (const x of [-0.35, 0.35])
          cylinder(swing, 0.022, 1.65, 0xd8d0b7, x, -0.83, 0);
        box(swing, 0.95, 0.12, 0.43, C.wood, 0, -1.7, 0);
        this.swings.push(swing);
        box(base, 0.045, 1, 0.045, C.wood, 1.4, 0.5, 0.1);
        const blades = new THREE.Group();
        blades.position.set(1.4, 1.04, 0.1);
        for (let k = 0; k < 4; k++) {
          const blade = mesh(
            new THREE.ConeGeometry(0.2, 0.4, 3),
            material(k % 2 ? 0xdfbe89 : 0xbd8879),
            blades,
            0,
            0,
            0,
          );
          blade.rotation.z = (k * Math.PI) / 2;
          blade.position.set(
            Math.cos((k * Math.PI) / 2) * 0.2,
            Math.sin((k * Math.PI) / 2) * 0.2,
            0,
          );
        }
        this.windmills.push(blades);
        base.add(blades);
      }
      if (['bench', 'scarf'].includes(m.kind)) {
        for (const z of [-0.25, 0, 0.25])
          box(base, 1.9, 0.1, 0.18, C.wood, 0, 0.55, z);
        for (const x of [-0.7, 0.7])
          box(base, 0.11, 0.6, 0.6, C.dark, x, 0.25, 0);
        box(base, 1.9, 0.5, 0.1, C.wood, 0, 0.95, -0.28);
        if (m.kind === 'bench') {
          cylinder(base, 0.13, 0.24, C.cream, 0.35, 0.73, 0.03);
          const handle = mesh(
            new THREE.TorusGeometry(0.07, 0.018, 6, 12),
            material(C.cream),
            base,
            0.5,
            0.75,
            0.03,
          );
          handle.rotation.y = Math.PI / 2;
        } else box(base, 0.42, 0.04, 0.9, 0xb88d80, 0.25, 0.64, 0.08);
      }
      if (m.kind === 'bus') {
        box(base, 0.12, 2.5, 0.12, C.dark, 0, 1.25, -0.4);
        box(base, 0.9, 0.5, 0.12, 0x9dbaac, 0, 2.25, -0.4);
        box(base, 1.25, 0.09, 0.4, C.wood, 0.1, 0.55, 0.4);
        for (const x of [-0.4, 0.6])
          box(base, 0.1, 0.55, 0.1, C.dark, x, 0.28, 0.4);
        box(base, 0.22, 0.014, 0.34, 0xe7d6ad, 0.4, 0.61, 0.4);
      }
      if (m.kind === 'boat') {
        const pool = mesh(
          new THREE.CircleGeometry(1.45, 32),
          material(0x7bacb0, { metalness: 0.15, roughness: 0.3 }),
          base,
          0,
          0.045,
          0,
        );
        pool.rotation.x = -Math.PI / 2;
        const boat = mesh(
          new THREE.ConeGeometry(0.35, 0.22, 3),
          material(C.cream),
          base,
          0,
          0.2,
          0,
        );
        boat.rotation.z = Math.PI;
        boat.scale.set(1.7, 1, 1);
        box(base, 0.35, 0.02, 0.45, 0xe7d6ad, 1.3, 0.07, 0.1);
      }
      if (m.kind === 'desk') {
        box(base, 1.7, 0.14, 1.1, C.wood, 0, 0.8, 0);
        for (const x of [-0.65, 0.65])
          for (const z of [-0.4, 0.4])
            box(base, 0.12, 0.8, 0.12, C.wood, x, 0.4, z);
        const notebook = box(base, 0.6, 0.045, 0.4, C.cream, 0, 0.91, 0.08);
        notebook.rotation.y = 0.2;
        line(
          [new THREE.Vector3(0, 0.94, -0.13), new THREE.Vector3(0, 0.94, 0.28)],
          C.wood,
          base,
        );
      }
      if (m.kind === 'mailbox') {
        box(base, 0.15, 1.4, 0.15, C.wood, 0, 0.7, 0);
        box(base, 0.7, 0.55, 0.7, 0xa97864, 0, 1.55, 0);
        box(base, 0.38, 0.04, 0.02, C.dark, 0, 1.58, 0.36);
        cylinder(base, 0.09, 0.03, 0xe2cb8b, 0.4, 0.08, 0.6);
        box(base, 0.04, 0.035, 0.22, 0xe2cb8b, 0.4, 0.09, 0.74);
      }
      const beacon = new THREE.Group();
      beacon.position.set(
        m.position.x,
        heightAt(m.position.x, m.position.z),
        m.position.z,
      );
      this.scene.add(beacon);
      const orb = mesh(
        new THREE.IcosahedronGeometry(0.16, 1),
        new THREE.MeshBasicMaterial({
          color: C.gold,
          transparent: true,
          opacity: 0.85,
        }),
        beacon,
        0,
        1.9,
        0,
      );
      const ring = mesh(
        new THREE.RingGeometry(1.2, 1.25, 40),
        new THREE.MeshBasicMaterial({
          color: C.gold,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.18,
        }),
        beacon,
        0,
        0.04,
        0,
      );
      ring.rotation.x = -Math.PI / 2;
      const flowers = new THREE.Group();
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        const x = Math.cos(a) * 1.2,
          z = Math.sin(a) * 1.2;
        cylinder(flowers, 0.018, 0.28, 0x738e72, x, 0.14, z);
        ellipsoid(
          flowers,
          x,
          0.33,
          z,
          0.12,
          0.08,
          0.12,
          [0xe0bba1, 0xdfd8ab, 0xbcbdd5][m.region],
        );
      }
      flowers.visible = false;
      beacon.add(flowers);
      this.beacons.set(m.id, { group: beacon, orb, ring, flowers });
    }
  }
  private makeLighthouse() {
    const g = new THREE.Group();
    g.position.set(
      LIGHTHOUSE.x,
      heightAt(LIGHTHOUSE.x, LIGHTHOUSE.z),
      LIGHTHOUSE.z,
    );
    this.scene.add(g);
    cylinder(g, 1, 4.8, 0xe6ddc5, 0, 2.4, 0, 0.7);
    cylinder(g, 0.83, 0.13, C.dark, 0, 4.84, 0);
    cylinder(g, 0.6, 0.8, 0xffdfa0, 0, 5.3, 0);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      box(
        g,
        0.055,
        0.9,
        0.055,
        C.dark,
        Math.cos(a) * 0.65,
        5.3,
        Math.sin(a) * 0.65,
      );
    }
    mesh(new THREE.ConeGeometry(0.95, 0.65, 8), material(0x8f8f7b), g, 0, 6, 0);
    box(g, 0.4, 0.9, 0.06, C.wood, 0, 0.48, 1);
    for (let i = 0; i < 3; i++)
      box(g, 1.4, 0.13, 1.8 - i * 0.4, 0xc2b597, 0, 0.06 + i * 0.13, 1.2);
  }
  configure(options: WorldOptions) {
    this.options = options;
    if (options.paused) this.releaseControls();
    const signature = options.answers
      .map((a) => `${a.id}${a.choice}${a.form}`)
      .join();
    if (signature !== this.pendingFormSignature) {
      this.pendingFormSignature = signature;
      this.updateAnswers();
    }
  }
  private updateAnswers() {
    while (this.companions.children.length) {
      const child = this.companions.children[0];
      child.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
      this.companions.remove(child);
    }
    for (const m of memories) {
      const beacon = this.beacons.get(m.id)!;
      const answer = this.options.answers.find((a) => a.id === m.id),
        resolved = answer ? resolveAnswer(answer) : null;
      beacon.flowers.visible = !!resolved;
      const color = resolved ? NEEDS[resolved.choice.need].color : '#f1d48b';
      (beacon.orb.material as THREE.MeshBasicMaterial).color.set(color);
      beacon.orb.scale.setScalar(answer?.form === 'lantern' ? 1.5 : 1);
      if (answer?.form === 'star' && resolved) {
        const star = mesh(
          new THREE.OctahedronGeometry(0.095),
          new THREE.MeshBasicMaterial({ color }),
          this.companions,
        );
        star.castShadow = false;
      }
    }
  }
  move(vector: Point) {
    this.input = vector;
    if (Math.hypot(vector.x, vector.z) > 0.05) this.path = [];
  }
  travelTo(p: Point) {
    if (this.options.paused) return;
    this.path = findPath(this.position, p, WORLD_OBSTACLES);
    if (this.path.length) {
      this.cursor.position.set(
        this.path.at(-1)!.x,
        heightAt(this.path.at(-1)!.x, this.path.at(-1)!.z) + 0.06,
        this.path.at(-1)!.z,
      );
      this.cursor.visible = true;
    }
  }
  reset() {
    this.position = { ...START };
    this.age = 0;
    this.path = [];
    this.releaseControls();
  }
  restore(p: Point, age: number) {
    if (
      Number.isFinite(p.x) &&
      Number.isFinite(p.z) &&
      Math.abs(p.x) < 26 &&
      Math.abs(p.z) < 18
    ) {
      this.position = { ...p };
      this.age = Math.max(0, Math.min(2, age));
    }
  }
  interact() {
    if (this.nearest) this.onInteract(this.nearest);
  }
  private releaseControls = () => {
    this.input = { x: 0, z: 0 };
    this.keys.clear();
    this.path = [];
    if (this.cursor) this.cursor.visible = false;
  };
  private visibility = () => {
    if (document.hidden) this.releaseControls();
  };
  private contextLost = (event: Event) => {
    event.preventDefault();
    this.onError();
  };
  private keyDown = (event: KeyboardEvent) => {
    if (
      this.options.paused ||
      this.options.overview ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey
    )
      return;
    const target = event.target as HTMLElement;
    if (target.closest('button,input,textarea,[role="dialog"]')) return;
    const key = event.key.toLowerCase();
    if (
      [
        'w',
        'a',
        's',
        'd',
        'arrowup',
        'arrowdown',
        'arrowleft',
        'arrowright',
      ].includes(key)
    ) {
      event.preventDefault();
      this.keys.add(key);
      this.path = [];
    }
    if (key === 'e') {
      event.preventDefault();
      if (!event.repeat) this.interact();
    }
  };
  private keyUp = (event: KeyboardEvent) =>
    this.keys.delete(event.key.toLowerCase());
  private pointerDown = (event: PointerEvent) => {
    this.pointerStart = { x: event.clientX, z: event.clientY };
  };
  private pointerUp = (event: PointerEvent) => {
    if (
      this.options.paused ||
      this.options.overview ||
      !this.pointerStart ||
      Math.hypot(
        event.clientX - this.pointerStart.x,
        event.clientY - this.pointerStart.z,
      ) > 12
    )
      return;
    const rect = this.canvas.getBoundingClientRect();
    this.ray.setFromCamera(
      new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        (-(event.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      this.camera,
    );
    const hit = new THREE.Vector3();
    if (this.ray.ray.intersectPlane(this.ground, hit))
      this.travelTo({ x: hit.x, z: hit.z });
  };
  private resize() {
    const { width, height } = this.canvas.getBoundingClientRect();
    if (!width || !height) return;
    this.renderer.setSize(width, height, false);
  }
  private frame = (now: number) => {
    if (this.disposed) return;
    const dt = Math.min((now - this.previous) / 1000, 0.045) || 0.016;
    this.previous = now;
    if (document.hidden) return;
    this.time += dt;
    const time = this.time,
      free = !this.options.paused && !this.options.overview;
    let vx = this.input.x,
      vz = this.input.z;
    if (this.keys.has('a') || this.keys.has('arrowleft')) vx--;
    if (this.keys.has('d') || this.keys.has('arrowright')) vx++;
    if (this.keys.has('w') || this.keys.has('arrowup')) vz--;
    if (this.keys.has('s') || this.keys.has('arrowdown')) vz++;
    const direction = new THREE.Vector2(
      vx * 0.808 + vz * 0.589,
      -vx * 0.589 + vz * 0.808,
    );
    if (direction.length() > 1) direction.normalize();
    if (!direction.length() && this.path.length) {
      const goal = this.path[0];
      direction.set(goal.x - this.position.x, goal.z - this.position.z);
      if (direction.length() < 0.22) {
        this.path.shift();
        direction.set(0, 0);
      } else direction.normalize();
    }
    const moving = free && direction.length() > 0.01;
    if (moving) {
      const speed = this.options.moment ? 2.25 : 3.8;
      this.position = stepPosition(
        this.position,
        { x: direction.x * speed * dt, z: direction.y * speed * dt },
        WORLD_OBSTACLES,
      );
      const angle = Math.atan2(direction.x, direction.y);
      const current = this.player.group.rotation.y;
      this.player.group.rotation.y =
        current +
        Math.atan2(Math.sin(angle - current), Math.cos(angle - current)) *
          Math.min(1, dt * 14);
      this.age = Math.max(this.age, regionAt(this.position));
    }
    if (!this.path.length) this.cursor.visible = false;
    this.player.group.position.set(
      this.position.x,
      heightAt(this.position.x, this.position.z),
      this.position.z,
    );
    const scale = [0.78, 0.92, 1.04][this.age];
    this.player.group.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.03);
    this.player.body.position.y = moving
      ? Math.abs(Math.sin(time * 9)) * 0.055
      : Math.sin(time * 1.7) * 0.013;
    this.player.legs.forEach(
      (leg, i) =>
        (leg.rotation.x = moving ? Math.sin(time * 9 + i * Math.PI) * 0.45 : 0),
    );
    this.player.arms.forEach(
      (arm, i) =>
        (arm.rotation.x = moving
          ? Math.sin(time * 9 + i * Math.PI + Math.PI) * 0.35
          : 0),
    );
    this.player.tail.rotation.x = this.options.reduced
      ? 0
      : Math.sin(time * 3) * 0.15 - 0.18;
    const overview = this.options.overview;
    const wantedTarget = overview
      ? new THREE.Vector3(0, 0, 0)
      : new THREE.Vector3(
          this.position.x,
          heightAt(this.position.x, this.position.z),
          this.position.z,
        );
    this.cameraTarget.lerp(
      wantedTarget,
      overview ? 0.025 : this.options.reduced ? 1 : 1 - Math.exp(-dt * 5),
    );
    const aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    const view = overview ? (aspect < 1 ? 60 : 49) : aspect < 1 ? 25 : 21;
    this.camera.left = (-view * aspect) / 2;
    this.camera.right = (view * aspect) / 2;
    this.camera.top = view / 2;
    this.camera.bottom = -view / 2;
    this.camera.position
      .copy(this.cameraTarget)
      .add(new THREE.Vector3(19, 27, 26));
    this.camera.lookAt(this.cameraTarget);
    this.camera.updateProjectionMatrix();
    let closest: string | null = null,
      distance = 3.2;
    for (const m of memories) {
      const d = Math.hypot(
        m.position.x - this.position.x,
        m.position.z - this.position.z,
      );
      if (d < distance) {
        closest = m.id;
        distance = d;
      }
      const beacon = this.beacons.get(m.id)!;
      const answered = this.options.answers.find((a) => a.id === m.id);
      beacon.orb.position.y =
        1.9 +
        (this.options.reduced ? 0 : Math.sin(time * 1.8 + m.position.x) * 0.13);
      beacon.orb.rotation.y = time * 0.45;
      beacon.orb.visible = !!answered || this.options.moment || d < 4;
      (beacon.orb.material as THREE.MeshBasicMaterial).opacity =
        answered?.form === 'star' ? 0.28 : 0.85;
      (beacon.ring.material as THREE.MeshBasicMaterial).opacity =
        d < 3.2 ? 0.48 : this.options.moment ? 0.22 : 0.07;
    }
    if (
      Math.hypot(
        this.position.x - LIGHTHOUSE.x,
        this.position.z - LIGHTHOUSE.z,
      ) < 3.5
    )
      closest = 'lighthouse';
    this.nearest = closest;
    this.ghost.group.visible =
      this.options.moment && !!closest && closest !== 'lighthouse';
    if (this.ghost.group.visible) {
      const m = memories.find((m) => m.id === closest)!;
      this.ghost.group.position.set(
        m.position.x + 0.65,
        heightAt(m.position.x, m.position.z),
        m.position.z + 0.7,
      );
      this.ghost.group.scale.setScalar(m.region === 0 ? 0.68 : 0.86);
      this.ghost.body.position.y = Math.sin(time * 1.5) * 0.015;
    }
    this.sun.color.lerp(
      new THREE.Color(this.options.moment ? 0xf5cda3 : 0xffdfac),
      0.025,
    );
    if (!this.options.reduced) {
      const a = this.sea.geometry.attributes.position;
      for (let i = 0; i < a.count; i++) {
        const x = this.seaBase[i * 3],
          z = this.seaBase[i * 3 + 2];
        a.setY(
          i,
          Math.sin(x * 0.35 + time * 0.6) * 0.09 +
            Math.sin(z * 0.6 + time * 0.8) * 0.065,
        );
      }
      a.needsUpdate = true;
      this.sea.geometry.computeVertexNormals();
      this.trees.forEach(
        (tree, i) => (tree.rotation.z = Math.sin(time * 0.65 + i) * 0.011),
      );
      this.swings.forEach((s) => (s.rotation.x = Math.sin(time * 0.8) * 0.12));
      this.windmills.forEach((w) => (w.rotation.z = time * 0.8));
      this.clouds.forEach(
        (c, i) =>
          (c.position.x = (i - 3) * 14 + Math.sin(time * 0.045 + i) * 3),
      );
      this.birds.forEach((b, i) => {
        b.position.set(
          Math.cos(time * 0.12 + i) * 21,
          7 + Math.sin(time * 0.3 + i) * 0.7,
          Math.sin(time * 0.12 + i) * 18,
        );
        b.rotation.y = -time * 0.12 - i;
        b.scale.y = 0.4 + Math.abs(Math.sin(time * 3 + i)) * 0.8;
      });
      this.dust.rotation.y = Math.sin(time * 0.025) * 0.15;
      this.beam.rotation.y = Math.sin(time * 0.16) * 0.6;
    }
    this.companions.children.forEach((star, i) => {
      const a = time * 0.65 + i * 2.4;
      star.position.set(
        this.position.x + Math.cos(a) * (0.65 + i * 0.08),
        heightAt(this.position.x, this.position.z) +
          1.2 +
          Math.sin(a * 1.7) * 0.2,
        this.position.z + Math.sin(a) * (0.65 + i * 0.08),
      );
      star.rotation.y = time;
    });
    this.renderer.render(this.scene, this.camera);
    if (now - this.reportTime > 140) {
      this.reportTime = now;
      this.onStatus({
        position: { ...this.position },
        nearest: closest,
        region: regionAt(this.position),
        age: this.age,
        moving,
        destination: !!this.path.length,
      });
    }
  };
  dispose() {
    this.disposed = true;
    this.renderer.setAnimationLoop(null);
    this.observer.disconnect();
    this.canvas.removeEventListener('pointerdown', this.pointerDown);
    this.canvas.removeEventListener('pointerup', this.pointerUp);
    this.canvas.removeEventListener('webglcontextlost', this.contextLost);
    window.removeEventListener('keydown', this.keyDown);
    window.removeEventListener('keyup', this.keyUp);
    window.removeEventListener('blur', this.releaseControls);
    document.removeEventListener('visibilitychange', this.visibility);
    const geos = new Set<THREE.BufferGeometry>(),
      mats = new Set<THREE.Material>();
    this.scene.traverse((o) => {
      if (
        o instanceof THREE.Mesh ||
        o instanceof THREE.Line ||
        o instanceof THREE.Points
      ) {
        geos.add(o.geometry);
        for (const m of Array.isArray(o.material) ? o.material : [o.material])
          mats.add(m);
      }
    });
    geos.forEach((g) => g.dispose());
    mats.forEach((m) => m.dispose());
    this.renderer.dispose();
  }
}
