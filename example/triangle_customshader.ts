import {
  Renderer,
  Scene,
  PerspectiveCamera,
  StaticGeometry,
  Material,
  Shader,
  Mesh
} from './claygl';

const TRIANGLE_POSITIONS = [
  [-0.5, -0.5, 0],
  [0.5, -0.5, 0],
  [0, 0.5, 0]
];
const renderer = new Renderer({ canvas: document.getElementById('main') as HTMLCanvasElement });
renderer.resize(400, 400);

const scene = new Scene();
const dummyCamera = new PerspectiveCamera();
const geometry = new StaticGeometry();
geometry.attributes.position.fromArray(TRIANGLE_POSITIONS);

const vs = `attribute vec3 position: POSITION;
void main() {
  gl_Position = vec4(position, 1.0);
}`;
const fs = `void main() {
  gl_FragColor = vec4(0.0, 0.0, 1.0, 1.0);
}`;

const mesh = new Mesh({
  geometry: geometry,
  material: new Material({
    shader: new Shader(vs, fs)
  })
});
scene.add(mesh);

renderer.render(scene, dummyCamera);
