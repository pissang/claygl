import {
  loadGLTF,
  Renderer,
  ShadowMapPass,
  DeferredRenderer,
  startTimeline,
  OrbitControl,
  SpotLight,
  PointLight,
  Camera
} from 'claygl';

const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement
});
renderer.resize(window.innerWidth, window.innerHeight);
const shadowMapPass = new ShadowMapPass();
const deferredRenderer = new DeferredRenderer();
deferredRenderer.shadowMapPass = shadowMapPass;

loadGLTF('assets/models/basic_scene/scene.gltf').then((res) => {
  const scene = res.scene!;
  scene.rotation.rotateX(-Math.PI / 2);
  const camera = new Camera('perspective', {
    aspect: renderer.getViewportAspect(),
    far: 500
  });

  camera.position.set(2, 2, 2);
  camera.lookAt(scene.position);
  camera.projection.aspect = renderer.canvas.width / renderer.canvas.height;

  const control = new OrbitControl({
    target: camera,
    domElement: renderer.canvas,
    panSensitivity: 0.4,
    zoomSensitivity: 0.4
  });

  const light = new SpotLight({
    color: [1, 0.3, 0.3],
    range: 30,
    umbraAngle: 10,
    penumbraAngle: 25,
    intensity: 1,
    shadowResolution: 512,
    shadowBias: 0.001,
    castShadow: true
  });
  light.position.set(-3, -4, 2);
  light.lookAt(scene.position);
  scene.add(light);

  const light2 = new SpotLight({
    color: [0.3, 1, 0.3],
    range: 50,
    umbraAngle: 10,
    penumbraAngle: 25,
    shadowResolution: 512,
    intensity: 1,
    shadowBias: 0.001,
    castShadow: true
  });
  light2.position.set(3, -4, 2);
  light2.lookAt(scene.position);
  scene.add(light2);

  const light3 = new PointLight({
    color: [0.3, 0.3, 1],
    range: 50,
    shadowResolution: 512,
    castShadow: true
  });
  light3.position.set(0, -4, 5);
  light3.lookAt(scene.position);
  scene.add(light3);

  startTimeline((deltaTime) => {
    control.update(deltaTime);
    // shadowMapPass.render(renderer, scene, camera);
    // renderer.render(scene, camera);
    deferredRenderer.render(renderer, scene, camera);
  });
});
