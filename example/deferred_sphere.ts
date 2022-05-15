import {
  Renderer,
  DeferredRenderer,
  Scene,
  PerspectiveCamera,
  Texture2D,
  Mesh,
  StandardMaterial,
  PlaneGeometry,
  SphereGeometry,
  SphereLight,
  loadGLTF,
  OrbitControl,
  startTimeline,
  FullscreenQuadPass,
  Shader,
  constants
} from 'claygl';
import Stats from 'stats.js';
import { outputTextureFragment } from 'claygl/shaders';

const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement,
  devicePixelRatio: 1.0
});
renderer.resize(window.innerWidth, window.innerHeight);
const deferredRenderer = new DeferredRenderer();

const camera = new PerspectiveCamera({
  far: 5000,
  aspect: renderer.getViewportAspect()
});

const texture = new Texture2D({
  wrapS: constants.REPEAT,
  wrapT: constants.REPEAT,
  anisotropic: 32
});
texture.load('assets/textures/rockwall_n.jpg');

const scene = new Scene();

const plane = new Mesh(
  new PlaneGeometry(),
  new StandardMaterial({
    roughness: 0.5,
    uvRepeat: [100, 100],
    normalMap: texture
  })
);
plane.scale.set(10000, 10000, 1);
plane.rotation.rotateX(-Math.PI / 2);
plane.geometry.generateTangents();

scene.add(plane);

function randomInSquare(size: number) {
  return (Math.random() - 0.5) * size * 2;
}

const sphereGeo = new SphereGeometry();

const sphereLights: SphereLight[] = [];
const HEIGHT = 150;
for (let i = 0; i < 10; i++) {
  for (let j = 0; j < 10; j++) {
    const sphereLight = new SphereLight({
      color: [Math.random(), Math.random(), Math.random()],
      range: 600,
      intensity: 2.0,
      radius: 60
    });
    const x = (i - 5) * 400;
    const z = (j - 5) * 400;
    // const z =  0;
    const y = HEIGHT;
    sphereLight.position.set(x, y, z);
    scene.add(sphereLight);

    const lightMesh = new Mesh(
      sphereGeo,
      new StandardMaterial({
        color: [0, 0, 0],
        roughness: 1,
        emission: sphereLight.color
      })
    );
    const r = sphereLight.radius;
    lightMesh.scale.set(r, r, r);

    sphereLight.add(lightMesh);

    sphereLights.push(sphereLight);
  }
}

loadGLTF('assets/models/suzanne/suzanne.gltf').then((res) => {
  const suzanneGeometry = (res.scene!.getDescendantByName('Suzanne') as Mesh).geometry;
  const material = new StandardMaterial({
    // specularColor: [0.95, 0.64, 0.54],
    metalness: 0.2,
    roughness: 0.5
  });

  for (let i = 0; i < 5; i++) {
    for (let j = 0; j < 5; j++) {
      const mesh = new Mesh(suzanneGeometry, material);
      mesh.position.set((i - 2.5) * 500, 150, (j - 2.5) * 500);
      mesh.scale.set(100, 100, 100);
      scene.add(mesh);
    }
  }
});

camera.position.set(0, 1000, 100);
camera.lookAt(scene.position);

const control = new OrbitControl({
  domElement: renderer.canvas,
  target: camera
});

const debugPass = new FullscreenQuadPass(outputTextureFragment);
let elpasedTime = 0;
// debugPass.material.undefine('fragment', 'OUTPUT_ALPHA');
startTimeline((deltaTime) => {
  control.update(deltaTime);

  elpasedTime += deltaTime;

  sphereLights.forEach(function (sphereLight, idx) {
    sphereLight.position.y = HEIGHT + 200 * (Math.sin(elpasedTime / 3e2 + idx) + 1);
  });

  deferredRenderer.render(renderer, scene, camera);

  // renderer.gl.clear(renderer.gl.COLOR_BUFFER_BIT);
  // debugPass.setUniform('texture', deferredRenderer._depthTex);
  // debugPass.render(renderer);

  stats.update();
});

const stats = new Stats();
stats.dom.style.position = 'absolute';
stats.dom.style.top = '0px';
stats.dom.style.right = '0px';
document.body.appendChild(stats.dom);
