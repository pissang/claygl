import {
  Renderer,
  DeferredGBuffer,
  Scene,
  Mesh,
  CubeGeometry,
  StandardMaterial,
  Camera
} from 'claygl';

const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement
});
const gbuffer = new DeferredGBuffer({
  enableTargetTexture4: true
});
const camera = new Camera('perspective', {
  aspect: renderer.getViewportAspect()
});
camera.position.set(0, 0, 6);
renderer.resize(window.innerWidth, window.innerHeight);
gbuffer.resize(window.innerWidth, window.innerHeight);

const scene = new Scene();

const cube = new Mesh(new CubeGeometry(), new StandardMaterial());
scene.add(cube);

function update() {
  scene.update();
  camera.update();
  gbuffer.update(renderer, scene, camera);
  gbuffer.renderDebug(renderer, camera, 'velocity');
}

// startTimelin(() => {
cube.position.x = -3;
update();
cube.position.x = 3;
update();
//     cube.position.y = 1;
//     update();
// });
