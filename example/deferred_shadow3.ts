import {
  Renderer,
  ShadowMapPass,
  PerspectiveCamera,
  DeferredRenderer,
  Scene,
  CubeGeometry,
  Mesh,
  StandardMaterial,
  PointLight,
  DirectionalLight,
  startTimeline,
  Vector3,
  OrbitControl
} from 'claygl';
import Stats from 'stats.js';

const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement,
  devicePixelRatio: 1.0
});
renderer.resize(window.innerWidth, window.innerHeight);
const shadowMapPass = new ShadowMapPass();
const deferredRenderer = new DeferredRenderer();
deferredRenderer.shadowMapPass = shadowMapPass;

const camera = new PerspectiveCamera({
  far: 1000,
  aspect: renderer.getViewportAspect()
});

const scene = new Scene();

const cubeGeo = new CubeGeometry();

const cubes: Mesh[] = [];

const CUBE_COUNT = 24;
for (let i = 0; i < CUBE_COUNT; i++) {
  for (let j = 0; j < CUBE_COUNT; j++) {
    const mesh = new Mesh(
      cubeGeo,
      new StandardMaterial({
        color: [i / CUBE_COUNT, j / CUBE_COUNT, 0.5]
      })
    );
    mesh.position.x = i - CUBE_COUNT / 2;
    mesh.position.z = j - CUBE_COUNT / 2;
    mesh.scale.set(0.5, 0, 0.5);

    cubes.push(mesh);

    scene.add(mesh);
  }
}
const directionalLight = new DirectionalLight({
  intensity: 1.2,
  shadowBias: 0.004,
  shadowResolution: 2048,
  shadowCascade: 2
});
directionalLight.position.set(10, 10, 10);
directionalLight.lookAt(scene.position);

scene.add(directionalLight);

scene.add(
  new PointLight({
    intensity: 0.4,
    range: 100,
    position: new Vector3(-10, CUBE_COUNT, 0)
  })
);

camera.position.set(10, 20, 20);
camera.lookAt(scene.position);

const control = new OrbitControl({
  domElement: renderer.canvas,
  target: camera
});

let elapsedTime = 0;

const stats = new Stats();
stats.dom.style.position = 'absolute';
stats.dom.style.top = '0px';
stats.dom.style.right = '0px';
document.body.appendChild(stats.dom);

startTimeline((deltaTime) => {
  control.update(deltaTime);

  elapsedTime += deltaTime;
  cubes.forEach(function (cube, idx) {
    const x = Math.round(idx / CUBE_COUNT);
    const y = idx % CUBE_COUNT;
    cube.scale.y =
      (Math.sin(x / 3 + elapsedTime / 1000) * Math.cos(y / 3 + elapsedTime / 1000) + 1) * 2;
  });
  // shadowMapPass.render(renderer, scene, camera);
  // renderer.render(scene, camera);
  deferredRenderer.render(renderer, scene, camera);

  shadowMapPass.renderDebug(renderer);

  stats.update();
});
