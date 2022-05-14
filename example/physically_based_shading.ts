import {
  Renderer,
  PerspectiveCamera,
  Scene,
  loadGLTF,
  OrbitControl,
  Material,
  Mesh,
  DirectionalLight,
  Vector3,
  createStandardShader,
  startTimeline
} from 'claygl';
const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement
});
renderer.resize(window.innerWidth, window.innerHeight);
const camera = new PerspectiveCamera({
  aspect: renderer.getViewportAspect()
});
camera.position.set(0, 0, 10);

const scene = new Scene();
scene.add(camera);

const control = new OrbitControl({
  target: camera,
  domElement: renderer.canvas
});

loadGLTF('assets/models/suzanne/suzanne.gltf').then((res) => {
  const suzanneGeometry = (res.scene!.getDescendantByName('Suzanne') as Mesh).geometry;
  for (let i = 0; i < 10; i++) {
    const material = new Material(createStandardShader());
    material.set('color', [0.7, 0.0, 0.0]);
    material.set('specularColor', [0.1, 0.1, 0.1]);
    material.set('glossiness', (i + 1) / 12);
    const mesh = new Mesh(suzanneGeometry, material);
    mesh.position.set((i - 5) * 2.1, 0, 0);
    scene.add(mesh);
  }

  const light = new DirectionalLight();
  light.position.set(1, 4, 4);
  light.lookAt(Vector3.ZERO);
  scene.add(light);

  startTimeline(() => {
    control.update();
    renderer.render(scene, camera);
  });
});
