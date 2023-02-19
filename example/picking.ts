import {
  Renderer,
  PerspectiveCamera,
  Scene,
  CubeGeometry,
  Material,
  createLambertShader,
  Mesh,
  DirectionalLight,
  AmbientLight,
  startTimeline,
  Vector3,
  Plane,
  pickByRay
} from 'claygl';
import ClayNode from '../src/Node';
const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement,
  pixelRatio: 1.0
});
renderer.resize(window.innerWidth, window.innerHeight);

const camera = new PerspectiveCamera();
camera.aspect = renderer.getViewportAspect();
camera.position.z = 10;

const scene = new Scene();

const cubeGeo = new CubeGeometry();
const shader = createLambertShader();
for (let i = 0; i < 5; i++) {
  for (let j = 0; j < 5; j++) {
    const material = new Material(shader);
    material.set('color', [Math.random(), Math.random(), Math.random()]);
    const mesh = new Mesh(cubeGeo, material);
    mesh.position.set(Math.random() * 10 - 5, Math.random() * 10 - 5, Math.random() * -10);
    scene.add(mesh);
  }
}
const light = new DirectionalLight();
light.position.set(4, 4, 0);
light.lookAt(Vector3.ZERO);
scene.add(light);
scene.add(
  new AmbientLight({
    intensity: 0.5
  })
);

startTimeline(() => {
  renderer.render(scene, camera);
});

let currentCube: ClayNode | undefined;
let point: Vector3 | undefined;
const offset = new Vector3();
const plane = new Plane();
renderer.canvas.addEventListener('mousedown', function (e) {
  const res = pickByRay(renderer, scene, camera, e.offsetX, e.offsetY);
  if (res) {
    currentCube = res.target;
    point = res.pointWorld;
    offset.copy(res.point);
  }
});
renderer.canvas.addEventListener('mousemove', function (e) {
  if (currentCube) {
    plane.normal.copy(camera.worldTransform.z);
    plane.distance = point!.dot(plane.normal);

    const ndc = renderer.screenToNDC(e.offsetX, e.offsetY);
    const ray = camera.castRay(ndc);
    ray.intersectPlane(plane, currentCube.position);
    currentCube.position.sub(offset);
  }
});
renderer.canvas.addEventListener('mouseup', function (e) {
  currentCube = undefined;
});
