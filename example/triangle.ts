import {
  createUnlitShader,
  Material,
  Mesh,
  OrthographicCamera,
  Renderer,
  Scene,
  Geometry
} from 'claygl';

const TRIANGLE_POSITIONS = [
  [-0.5, -0.5, 0],
  [0.5, -0.5, 0],
  [0, 0.5, 0]
];
const TRIANGLE_POSITIONS2 = [
  [-1, -1, 0],
  [1, -1, 0],
  [0, 1, 0]
];

const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement,
  width: 400,
  height: 400
});
const scene = new Scene();
const camera = new OrthographicCamera();
const geometry = new Geometry({
  dynamic: true
});
// Add triangle vertices to position attribute.
geometry.attributes.position.fromArray(TRIANGLE_POSITIONS);

const mesh = new Mesh(geometry, new Material(createUnlitShader()));
mesh.material.set('color', [0, 0, 1]);
scene.add(mesh);

renderer.render(scene, camera);

let i = 0;
setInterval(function () {
  i++;
  geometry.attributes.position.fromArray(i % 2 ? TRIANGLE_POSITIONS2 : TRIANGLE_POSITIONS);
  geometry.dirty();
  renderer.render(scene, camera);
}, 500);
