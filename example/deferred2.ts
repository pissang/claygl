import {
  Renderer,
  DeferredRenderer,
  Scene,
  loadGLTF,
  Mesh,
  Texture2D,
  StandardMaterial,
  PointLight,
  Node as ClayNode,
  SphereGeometry,
  OrbitControl,
  startTimeline,
  constants,
  Camera
} from 'claygl';

import Stats from 'stats.js';
import dat from 'dat.gui';

const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement,
  pixelRatio: 1.0
});
renderer.resize(window.innerWidth, window.innerHeight);
const deferredRenderer = new DeferredRenderer();

const camera = new Camera('perspective', {
  far: 10000,
  aspect: renderer.getViewportAspect()
});

const scene = new Scene();

const material = new StandardMaterial({
  metalness: 0.5,
  uvRepeat: [3, 3],
  roughness: 0.5,
  linear: true
});
loadGLTF('assets/models/suzanne/suzanne_high.gltf').then((res) => {
  const suzanneGeometry = (res.scene!.getDescendantByName('Suzanne') as Mesh).geometry;

  const mesh = new Mesh(suzanneGeometry, material);
  mesh.geometry.generateTangents();

  (
    [
      ['diffuseMap', 'basecolor'],
      ['normalMap', 'normal'],
      ['metalnessMap', 'metalness'],
      ['roughnessMap', 'roughness']
    ] as const
  ).forEach(function (mapInfo) {
    const tex = new Texture2D({
      wrapS: constants.REPEAT,
      wrapT: constants.REPEAT
    });
    tex.load('assets/textures/iron-rusted4/iron-rusted4-' + mapInfo[1] + '.png');
    material[mapInfo[0]] = tex;
  });

  mesh.scale.set(1.4, 1.4, 1.4);
  scene.add(mesh);
});

const lights: ClayNode[] = [];
const sphereGeo = new SphereGeometry();
for (let i = 0; i < 100; i++) {
  const rootNode = new ClayNode();
  const pointLight = new PointLight({
    color: [Math.random(), Math.random(), Math.random()],
    range: 4 + Math.random() * 3,
    intensity: 0.4
  });
  pointLight.position.set(0, 0, 4);
  rootNode.add(pointLight);

  rootNode.rotation.rotateZ(Math.random() * 6.28).rotateY(Math.random() * 6.28);

  lights.push(rootNode);
  scene.add(rootNode);

  const debugMesh = new Mesh(
    sphereGeo,
    new StandardMaterial({
      color: [0, 0, 0],
      roughness: 1,
      emission: pointLight.color
    })
  );
  debugMesh.scale.set(0.02, 0.02, 0.02);
  pointLight.add(debugMesh);
}
camera.position.set(0, 0, 6);
camera.lookAt(scene.position);

const control = new OrbitControl({
  domElement: renderer.canvas,
  target: camera
});

startTimeline((deltaTime) => {
  lights.forEach(function (light) {
    light.rotation.rotateY(0.01);
  });
  material.metalness = config.metalness;
  material.roughness = config.roughness;

  control.update(deltaTime);
  deferredRenderer.render(renderer, scene, camera);

  stats.update();
});

const stats = new Stats();
stats.dom.style.position = 'absolute';
stats.dom.style.top = '0px';
stats.dom.style.left = '0px';
document.body.appendChild(stats.dom);

const config = {
  roughness: 0,
  metalness: 0
};
const gui = new dat.GUI();

gui.add(config, 'roughness', 0, 1);
gui.add(config, 'metalness', 0, 1);
