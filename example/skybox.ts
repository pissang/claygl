import {
  Renderer,
  PerspectiveCamera,
  Scene,
  startTimeline,
  TextureCube,
  Skybox,
  OrbitControl,
  Vector3
} from 'claygl';

const renderer = new Renderer({
  canvas: document.getElementById('Main') as HTMLCanvasElement
});
const scene = new Scene();
const camera = new PerspectiveCamera({
  aspect: renderer.getViewportAspect(),
  far: 500
});

const texture = new TextureCube({
  flipY: false
});
texture.load({
  px: 'assets/textures/cube/skybox/px.jpg',
  nx: 'assets/textures/cube/skybox/nx.jpg',
  py: 'assets/textures/cube/skybox/py.jpg',
  ny: 'assets/textures/cube/skybox/ny.jpg',
  pz: 'assets/textures/cube/skybox/pz.jpg',
  nz: 'assets/textures/cube/skybox/nz.jpg'
});

const skybox = new Skybox();
skybox.setEnvironmentMap(texture);
scene.skybox = skybox;

camera.scale.set(10, 10, 10);
camera.position.set(5, 12, 10);
camera.lookAt(new Vector3(0, 8, 0));

const control = new OrbitControl({
  target: camera,
  domElement: renderer.canvas,
  panSensitivity: 0.4,
  zoomSensitivity: 0.4
});

renderer.render(scene, camera);
startTimeline((deltaTime) => {
  control.update(deltaTime);
  renderer.render(scene, camera);
});
