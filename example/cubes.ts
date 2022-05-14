import {
  CubeGeometry,
  Material,
  PerspectiveCamera,
  Renderer,
  Scene,
  createStandardShader,
  Texture2D,
  Node as ClayNode,
  Mesh,
  PointLight,
  AmbientLight,
  startTimeline
} from 'claygl';

import Stats from 'stats.js';

const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement,
  devicePixelRatio: 1.0
});
renderer.resize(window.innerWidth, window.innerHeight);
const scene = new Scene();
const camera = new PerspectiveCamera({
  aspect: renderer.getViewportAspect(),
  far: 500
});

const cube = new CubeGeometry();
cube.generateTangents();
const material = new Material(createStandardShader());
material.set('glossiness', 0.4);
const diffuse = new Texture2D();
diffuse.load('assets/textures/crate.gif');
const normal = new Texture2D();
normal.load('assets/textures/normal_map.jpg');
material.set('diffuseMap', diffuse);
material.set('normalMap', normal);
material.enableTexture('diffuseMap');
material.enableTexture('normalMap');

const root = new ClayNode({
  name: 'ROOT'
});
scene.add(root);
for (let i = 0; i < 20; i++) {
  for (let j = 0; j < 10; j++) {
    for (let k = 0; k < 50; k++) {
      const mesh = new Mesh(cube, material);
      mesh.position.set(
        50 - Math.random() * 100,
        50 - Math.random() * 100,
        50 - Math.random() * 100
      );
      root.add(mesh);
    }
  }
}
const light = new PointLight({
  range: 200
});
scene.add(light);
scene.add(
  new AmbientLight({
    intensity: 0.4
  })
);

camera.position.set(0, 0, 10);

startTimeline((deltaTime: number) => {
  const start = new Date().getTime();
  renderer.render(scene, camera);
  const renderTime = new Date().getTime() - start;
  document.getElementById('time')!.innerHTML =
    Math.round(1000 / deltaTime) + '<br />' + renderTime + '<br />';
  root.rotation.rotateY(Math.PI / 500);

  stats.update();
});

const stats = new Stats();
stats.dom.style.position = 'absolute';
stats.dom.style.top = '0px';
stats.dom.style.right = '0px';
document.body.appendChild(stats.dom);
