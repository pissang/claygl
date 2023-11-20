import {
  createUnlitShader,
  Renderer,
  startTimeline,
  Vector3,
  Scene,
  Mesh,
  Material,
  CubeGeometry,
  Camera
} from 'claygl';
import Stats from 'stats.js';

const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement,
  pixelRatio: 1
});
const width = window.innerWidth;
const height = window.innerHeight;
renderer.resize(width, height);

const stats = new Stats();
document.body.appendChild(stats.dom);

const cubeGeo = new CubeGeometry();

const scene = new Scene();
const camera = new Camera('orthographic', {
  left: -width / 2,
  right: width / 2,
  top: height / 2,
  bottom: -height / 2,
  near: 0,
  far: 10000
});
camera.position.set(500, 500, 500);
camera.lookAt(new Vector3(0, 0, 0));
const cnt = 100;
const distance = 20;
const size = 10 / 2;
const shader = createUnlitShader();
for (let i = 0; i < cnt; ++i) {
  for (let j = 0; j < cnt; ++j) {
    const material = new Material(shader);
    material.set('color', [1, 0, 0]);
    const cube = new Mesh(cubeGeo, material);
    cube.position.set((i - cnt / 2) * distance, (j - cnt / 2) * distance, 0);
    cube.scale.set(size, size, size);
    scene.add(cube);
  }
}

startTimeline(() => {
  stats.begin();
  renderer.render(scene, camera);
  stats.end();
});
