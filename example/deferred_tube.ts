import {
  Renderer,
  DeferredRenderer,
  PerspectiveCamera,
  Texture2D,
  Scene,
  Mesh,
  StandardMaterial,
  SphereGeometry,
  constants,
  PlaneGeometry,
  CylinderGeometry,
  Matrix4,
  TubeLight,
  OrbitControl,
  startTimeline,
  FullscreenQuadPass,
  Shader
} from 'claygl';
import { outputTextureFragment } from 'claygl/shaders';
import Stats from 'stats.js';

const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement,
  devicePixelRatio: 1.0
});
renderer.resize(window.innerWidth, window.innerHeight);
const deferredRenderer = new DeferredRenderer();

const camera = new PerspectiveCamera({
  far: 10000,
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

const cylinder = new CylinderGeometry();
cylinder.applyTransform(new Matrix4().rotateZ(Math.PI / 2));
for (let i = 0; i < 20; i++) {
  const tubeLight = new TubeLight({
    color: [1, 1, 1],
    range: 400,
    intensity: 2.0,
    length: 1000
  });
  // const x = (i - 10) * 400;
  const x = 0;
  const z = (i - 10) * 400;
  // const z = 0;
  const y = 100;
  tubeLight.position.set(x, y, z);
  scene.add(tubeLight);

  const lightMesh = new Mesh(
    cylinder,
    new StandardMaterial({
      color: [0, 0, 0],
      roughness: 1,
      metalness: 0,
      emission: tubeLight.color
    })
  );
  const r = 1;
  const l = tubeLight.length;
  lightMesh.scale.set(r + l / 2, r, r);

  tubeLight.add(lightMesh);
}

const sphereGeo = new SphereGeometry({
  widthSegments: 50,
  heightSegments: 50
});
for (let i = 0; i < 10; i++) {
  for (let j = 0; j < 10; j++) {
    const sphere = new Mesh(
      sphereGeo,
      new StandardMaterial({
        roughness: 0.6,
        color: [0, 0, 0]
      })
    );
    sphere.scale.set(40, 40, 40);
    sphere.position.set((i - 5) * 200, 200, (j - 5) * 200);
    scene.add(sphere);
  }
}

camera.position.set(0, 50, 100);
camera.lookAt(scene.position);

const control = new OrbitControl({
  domElement: renderer.canvas,
  target: camera
});

const debugPass = new FullscreenQuadPass(outputTextureFragment);
debugPass.material!.undefine('fragment', 'OUTPUT_ALPHA');
startTimeline((deltaTime) => {
  control.update(deltaTime);
  deferredRenderer.render(renderer, scene, camera);

  // TODO
  debugPass.material.set('texture', (deferredRenderer as any)._lightAccumTex);

  stats.update();
});

const stats = new Stats();
stats.dom.style.position = 'absolute';
stats.dom.style.top = '0px';
stats.dom.style.right = '0px';
document.body.appendChild(stats.dom);
