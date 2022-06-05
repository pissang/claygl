import {
  Renderer,
  Scene,
  PerspectiveCamera,
  createUnlitShader,
  Material,
  Texture2D,
  Node as ClayNode,
  Vector3,
  PlaneGeometry,
  Mesh,
  startTimeline,
  constants
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

const material = new Material(createUnlitShader());
const image = new Image();
image.src = 'assets/textures/ground_tile.jpg';
const texture = new Texture2D({
  image: image,
  wrapS: constants.REPEAT,
  wrapT: constants.REPEAT,
  anisotropic: 16
});
image.onload = function () {
  texture.dirty();
};
material.set('diffuseMap', texture);
material.set('uvRepeat', [10, 10]);

const root = new ClayNode();

camera.position.set(0, 4, 14);
camera.lookAt(new Vector3(0, 1, 0));

scene.add(root);
// Add Plane
const plane = new PlaneGeometry({
  widthSegments: 1,
  heightSegments: 1
});
const planeMesh = new Mesh(plane, material, {
  scale: new Vector3(60, 60, 60)
});
planeMesh.position.y = -0.8;
planeMesh.rotation.rotateX(-Math.PI / 2);
root.add(planeMesh);

startTimeline(() => {
  renderer.render(scene, camera);
});
