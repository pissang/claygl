import { BasicShader, Material, Mesh, OrthographicCamera, Renderer, Scene, Geometry } from 'claygl';

const TRIANGLE_POSITIONS = [
  [-0.5, -0.5, 0],
  [0.5, -0.5, 0],
  [0, 0.5, 0]
];
const VERTEX_COLORS = [
  [1, 0, 0, 1],
  [0, 1, 0, 1],
  [0, 0, 1, 1]
];

const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement
});
renderer.resize(400, 400);
const scene = new Scene();
const camera = new OrthographicCamera();
const geometry = new Geometry();

// Add triangle vertices to position attribute.
geometry.attributes.position.fromArray(TRIANGLE_POSITIONS);
geometry.attributes.color.fromArray(VERTEX_COLORS);

const mesh = new Mesh({
  geometry: geometry,
  material: new Material({
    shader: new BasicShader()
  })
});
mesh.material.define('both', 'VERTEX_COLOR');
mesh.material.set('color', [1, 1, 1]);
scene.add(mesh);

renderer.render(scene, camera);
