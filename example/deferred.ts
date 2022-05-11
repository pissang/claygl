import Stats from 'stats.js';
import {
  Renderer,
  DeferredRenderer,
  Scene,
  PerspectiveCamera,
  Mesh,
  StandardMaterial,
  SphereGeometry,
  PlaneGeometry,
  SpotLight,
  PointLight,
  AmbientLight,
  OrbitControl,
  DirectionalLight,
  startTimeline
} from 'claygl';

const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement
});
renderer.resize(window.innerWidth, window.innerHeight);
const deferredRenderer = new DeferredRenderer();

const camera = new PerspectiveCamera({
  far: 10000,
  aspect: renderer.getViewportAspect()
});

const scene = new Scene();

const plane = new Mesh({
  material: new StandardMaterial({
    roughness: 0.9
  }),
  geometry: new PlaneGeometry()
});
plane.scale.set(10000, 10000, 1);
plane.rotation.rotateX(-Math.PI / 2);

const sphereGeo = new SphereGeometry();
for (let i = 0; i < 100; i++) {
  const sphere = new Mesh({
    material: new StandardMaterial({
      roughness: 0.9
    }),
    geometry: sphereGeo
  });
  sphere.scale.set(40, 40, 40);
  sphere.position.set(randomInSquare(1000), 40, randomInSquare(1000));
  scene.add(sphere);
}

scene.add(plane);

function randomInSquare(size: number) {
  return (Math.random() - 0.5) * size * 2;
}

var spotLight = new SpotLight({
  color: [1, 0, 0],
  range: 500,
  intensity: 10
});
spotLight.position.set(0, 50, 0);
spotLight.rotation.rotateX(-Math.PI / 4);
scene.add(spotLight);

for (let i = 0; i < 100; i++) {
  const pointLight = new PointLight({
    color: [Math.random(), Math.random(), Math.random()],
    range: 100 + Math.random() * 100
  });
  const x = randomInSquare(1000);
  const z = randomInSquare(1000);
  const y = Math.random() * 30 + 30;
  pointLight.position.set(x, y, z);
  scene.add(pointLight);
}
const directionalLight = new DirectionalLight({
  intensity: 0.5
});
directionalLight.position.set(10, 10, 10);
directionalLight.lookAt(scene.position);

scene.add(directionalLight);

scene.add(
  new AmbientLight({
    intensity: 0.2
  })
);

camera.position.set(0, 50, 100);
camera.lookAt(scene.position);

const control = new OrbitControl({
  domElement: renderer.canvas,
  target: camera
});

startTimeline((deltaTime) => {
  control.update(deltaTime);
  deferredRenderer.render(renderer, scene, camera);

  stats.update();
});

var stats = new Stats();
stats.dom.style.position = 'absolute';
stats.dom.style.top = '0px';
stats.dom.style.right = '0px';
document.body.appendChild(stats.dom);
