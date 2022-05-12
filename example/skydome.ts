import {
  Renderer,
  PerspectiveCamera,
  Scene,
  startTimeline,
  Texture2D,
  Skybox,
  OrbitControl
} from 'claygl';

const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement
});
renderer.resize(window.innerWidth, window.innerHeight);

const scene = new Scene();
const camera = new PerspectiveCamera({
  aspect: renderer.getViewportAspect(),
  far: 500
});

const texture = new Texture2D({
  flipY: false
});
// Sky texture
// http://www.hdri-hub.com/hdrishop/freesamples/freehdri/item/113-hdr-111-parking-space-free
texture.load('./assets/textures/Parking_Lot_Bg.jpg');
const skybox = new Skybox({
  scene: scene
});
skybox.setEnvironmentMap(texture);

camera.position.set(0, 1, 2);

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
