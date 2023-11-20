import {
  Renderer,
  Shader,
  Scene,
  Material,
  Mesh,
  CubeGeometry,
  Texture2D,
  Node as ClayNode,
  PointLight,
  startTimeline,
  AmbientLight,
  createStandardShader,
  Camera
} from 'claygl';
import Stats from 'stats.js';

const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement,
  pixelRatio: 1.0
});
renderer.resize(window.innerWidth, window.innerHeight);
const scene = new Scene();
const camera = new Camera('perspective', {
  aspect: renderer.getViewportAspect(),
  far: 500
});

const cube = new CubeGeometry();
cube.generateTangents();

const diffuse = new Texture2D();
diffuse.load('assets/textures/crate.gif');
const normal = new Texture2D();
normal.load('assets/textures/normal_map.jpg');

const material1 = new Material(createStandardShader());
material1.set('diffuseMap', diffuse);
material1.set('normalMap', normal);
const material2 = new Material(createStandardShader());
material2.set('diffuseMap', diffuse);
material2.set('normalMap', normal);

const root = new ClayNode({
  name: 'ROOT'
});
scene.add(root);
for (let i = 0; i < 20; i++) {
  for (let j = 0; j < 10; j++) {
    for (let k = 0; k < 50; k++) {
      const mesh = new Mesh(cube, i % 2 ? material1 : material2, {
        lightGroup: i % 2
      });
      mesh.position.set(
        50 - Math.random() * 100,
        50 - Math.random() * 100,
        50 - Math.random() * 100
      );
      root.add(mesh);
    }
  }
}
var light1 = new PointLight({
  range: 200,
  group: 0,
  color: [1, 0.5, 0]
});
var light2 = new PointLight({
  range: 200,
  group: 1,
  color: [0, 0.5, 1]
});
scene.add(light1);
scene.add(light2);
scene.add(
  new AmbientLight({
    intensity: 0.3
  })
);

camera.position.set(0, 0, 10);

startTimeline((deltaTime) => {
  renderer.render(scene, camera);
  root.rotation.rotateY(Math.PI / 500);

  stats.update();
});

var stats = new Stats();
stats.dom.style.position = 'absolute';
stats.dom.style.top = '0px';
stats.dom.style.right = '0px';
document.body.appendChild(stats.dom);
