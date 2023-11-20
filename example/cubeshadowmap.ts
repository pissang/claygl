import {
  Renderer,
  startTimeline,
  Shader,
  Material,
  Mesh,
  Scene,
  CubeGeometry,
  ShadowMapPass,
  createLambertShader,
  Node as ClayNode,
  Vector3,
  PointLight,
  Camera
} from 'claygl';

const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement
});
renderer.resize(window.innerWidth, window.innerHeight);

const shadowMapPass = new ShadowMapPass();

const scene = new Scene();
const camera = new Camera('perspective', {
  aspect: renderer.getViewportAspect(),
  far: 500
});

const cube = new CubeGeometry();
const material = new Material(createLambertShader());

const root = new ClayNode();
for (let i = 0; i < 2; i++) {
  for (let j = 0; j < 2; j++) {
    for (let k = 0; k < 2; k++) {
      const mesh = new Mesh(cube, material);
      mesh.scale.set(0.5, 0.5, 0.5);
      mesh.position.set((i - 0.5) * 5, (j - 0.5) * 5, (k - 0.5) * 5);
      root.add(mesh);
    }
  }
}
scene.add(root);

const bigCube = new Mesh(new CubeGeometry({ inside: true }), new Material(createLambertShader()), {
  culling: false,
  scale: new Vector3(10, 10, 10)
});
root.add(bigCube);

camera.position.set(0, 2, 10);
camera.lookAt(new Vector3(0, 0, 0));

const light = new PointLight({
  color: [1.5, 1.5, 1.5],
  shadowResolution: 512,
  intensity: 0.5,
  range: 40,
  castShadow: true
});
light.position.set(0.2, 0.2, 0.2);
scene.add(light);

const light2 = new PointLight({
  color: [1.5, 1.5, 1.5],
  shadowResolution: 512,
  range: 40,
  intensity: 0.5,
  castShadow: true
});
light2.position.set(-0.2, -0.2, -0.2);
scene.add(light2);

startTimeline(function (deltaTime) {
  shadowMapPass.render(renderer, scene);
  renderer.render(scene, camera);
  root.rotation.rotateY(deltaTime / 4000);
});
