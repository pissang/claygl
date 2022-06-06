import {
  AmbientLight,
  EnvironmentMapPass,
  loadGLTF,
  Mesh,
  OrbitControl,
  PerspectiveCamera,
  Renderer,
  ShadowMapPass,
  SpotLight,
  startTimeline,
  TextureCube,
  Timeline
} from 'claygl';

loadGLTF('assets/models/basic_scene/scene.gltf').then((res) => {
  const renderer = new Renderer({
    canvas: document.getElementById('main') as HTMLCanvasElement
  });
  renderer.resize(window.innerWidth, window.innerHeight);
  const shadowMapPass = new ShadowMapPass();
  const environmentMap = new TextureCube({
    width: 256,
    height: 256
  });
  const environmentMapPass = new EnvironmentMapPass({
    texture: environmentMap
  });

  const scene = res.scene!;
  scene.rotation.rotateX(-Math.PI / 2);
  const camera = new PerspectiveCamera({
    aspect: renderer.getViewportAspect(),
    far: 100
  });

  camera.position.set(2, 2, 2);
  camera.lookAt(scene.position);
  camera.aspect = renderer.canvas.width / renderer.canvas.height;

  const control = new OrbitControl({
    target: camera,
    domElement: renderer.canvas,
    rotateSensitivity: 0.4
  });

  const light = new SpotLight();
  light.range = 30;
  light.umbraAngle = 10;
  light.penumbraAngle = 25;
  light.shadowResolution = 2048;
  light.shadowBias = 0.0002;
  light.position.set(-5, -5, 5);
  light.lookAt(scene.position);
  scene.add(light);

  scene.add(
    new AmbientLight({
      intensity: 0.3
    })
  );

  const suzanne = scene.getDescendantByName('Suzanne') as Mesh;
  const suzanneMaterial = suzanne.material;
  environmentMapPass.position.set(0, 0.25, 1.5);
  suzanneMaterial.set('color', [1, 1, 1]);
  suzanneMaterial.set('metalness', 1);
  suzanneMaterial.set('roughness', 0.4);
  environmentMapPass.render(renderer, scene);

  suzanneMaterial.set('environmentMap', environmentMap);

  startTimeline((deltaTime: number) => {
    control.update(deltaTime);
    shadowMapPass.render(renderer, scene, camera);
    renderer.render(scene, camera);
    // shadowMapPass.renderDebug(renderer);
  });
});
