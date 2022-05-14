import {
  Renderer,
  ShadowMapPass,
  PerspectiveCamera,
  CubeGeometry,
  Scene,
  Mesh,
  Material,
  createStandardShader,
  SpotLight,
  Vector3,
  PlaneGeometry,
  startTimeline
} from 'claygl';

const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement,
  devicePixelRatio: 1.0
});

const shadowMapPass = new ShadowMapPass();

const scene = new Scene();
const camera = new PerspectiveCamera({
  aspect: renderer.getViewportAspect(),
  far: 100
});

const light = new SpotLight({
  position: new Vector3(0, 4, 4),
  intensity: 0.5,
  shadowBias: 0.001,
  shadowResolution: 512
});
scene.add(light);

const light2 = new SpotLight({
  position: new Vector3(0, 4, -4),
  intensity: 0.5,
  shadowBias: 0.001,
  shadowResolution: 512
});
scene.add(light2);

const plane = new PlaneGeometry({
  widthSegments: 1,
  heightSegments: 1
});

const material = new Material(createStandardShader());

const cube = new Mesh(new CubeGeometry(), material);

cube.position.y = 1;
scene.add(cube);

camera.position.set(0, 4, 5);
camera.lookAt(new Vector3(0, 1, 0));

const planeMesh = new Mesh(plane, material);
planeMesh.rotation.rotateX(-Math.PI / 2);
planeMesh.scale.set(10, 10, 10);

scene.add(planeMesh);

const zeroVector = new Vector3();
const upAxis = new Vector3(0, 1, 0);

startTimeline(() => {
  light.rotateAround(zeroVector, upAxis, 0.01);
  light2.rotateAround(zeroVector, upAxis, -0.01);
  light.lookAt(zeroVector);
  light2.lookAt(zeroVector);
  shadowMapPass.render(renderer, scene, camera);
  renderer.render(scene, camera);
});
