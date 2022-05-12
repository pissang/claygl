import {
  Renderer,
  PerspectiveCamera,
  Scene,
  Material,
  SphereGeometry,
  StandardShader,
  BasicShader,
  Mesh,
  DirectionalLight,
  AmbientLight,
  startTimeline,
  Vector3,
  OrbitControl,
  loadGLTF,
  pickByRay
} from 'claygl';

const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement,
  devicePixelRatio: 1.0
});
renderer.resize(window.innerWidth, window.innerHeight);
const camera = new PerspectiveCamera();
camera.aspect = renderer.getViewportAspect();
camera.position.z = 3;

const control = new OrbitControl({
  domElement: renderer.canvas,
  target: camera
});

const scene = new Scene();

loadGLTF('assets/models/suzanne/suzanne.gltf').then((res) => {
  const geo = (res.scene!.getDescendantByName('Suzanne') as Mesh).geometry;
  const mesh = new Mesh({
    material: new Material({
      shader: new StandardShader()
    }),
    geometry: geo
  });

  scene.add(mesh);
});

const light = new DirectionalLight();
light.position.set(1, 1, 1);
light.lookAt(Vector3.ZERO);
scene.add(light);
scene.add(
  new AmbientLight({
    intensity: 0.5
  })
);

startTimeline((dTime) => {
  control.update(dTime);
  renderer.render(scene, camera);
});

const sphere = new Mesh({
  material: new Material({
    shader: new BasicShader()
  }),
  geometry: new SphereGeometry()
});
sphere.scale.set(0.02, 0.02, 0.02);
sphere.material.set('color', [1, 0, 0]);
scene.add(sphere);

renderer.canvas.addEventListener('mousemove', function (e) {
  const res = pickByRay(renderer, scene, camera, e.offsetX, e.offsetY);
  if (res) {
    sphere.position.copy(res.pointWorld);
  } else {
    sphere.position.set(1000, 1000, 1000);
  }
});
