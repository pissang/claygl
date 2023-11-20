import {
  Renderer,
  startTimeline,
  ShadowMapPass,
  DeferredRenderer,
  Scene,
  Mesh,
  StandardMaterial,
  CubeGeometry,
  SphereGeometry,
  OrbitControl,
  PointLight,
  Camera
} from 'claygl';

import Stats from 'stats.js';

const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement,
  pixelRatio: 1.0
});
const shadowMapPass = new ShadowMapPass();

renderer.resize(window.innerWidth, window.innerHeight);
const deferredRenderer = new DeferredRenderer();
deferredRenderer.shadowMapPass = shadowMapPass;

const camera = new Camera('perspective', {
  aspect: renderer.getViewportAspect()
});

const scene = new Scene();

const cube = new Mesh(
  new CubeGeometry({
    inside: true
  }),
  new StandardMaterial({ roughness: 0.9 }),
  {
    culling: false
  }
);
cube.scale.set(10, 10, 10);
scene.add(cube);

function randomInSquare(size: number) {
  return (Math.random() - 0.5) * size * 2;
}
const sphereGeo = new SphereGeometry();
for (let i = 0; i < 20; i++) {
  const sphere = new Mesh(
    sphereGeo,
    new StandardMaterial({
      roughness: 0.9
    })
  );
  sphere.scale.set(0.5, 0.5, 0.5);
  sphere.position.set(randomInSquare(8), randomInSquare(8), randomInSquare(8));
  scene.add(sphere);
}

// const spotLight = new clay.light.Spot({
//     color: [1, 0, 0],
//     range: 500,
//     intensity: 10
// });
// spotLight.position.set(0, 50, 0);
// spotLight.rotation.rotateX(-Math.PI / 4);
// scene.add(spotLight);

const pointLights = [];
for (let i = 0; i < 10; i++) {
  const pointLight = new PointLight({
    color: [Math.random(), Math.random(), Math.random()],
    range: 40,
    intensity: 0.15,
    castShadow: true,
    shadowResolution: 512
  });
  pointLights.push(pointLight);
  pointLight.position.set(randomInSquare(5), randomInSquare(5), randomInSquare(5));
  const debugMesh = new Mesh(
    sphereGeo,
    new StandardMaterial({
      color: [0, 0, 0],
      roughness: 1,
      emission: pointLight.color
    })
  );
  debugMesh.scale.set(0.1, 0.1, 0.1);
  pointLight.add(debugMesh);

  scene.add(pointLight);
}

camera.position.set(0, 0, 3);
camera.lookAt(scene.position);

const control = new OrbitControl({
  domElement: renderer.canvas,
  target: camera
});

const stats = new Stats();
stats.dom.style.position = 'absolute';
stats.dom.style.top = '0px';
stats.dom.style.right = '0px';
document.body.appendChild(stats.dom);

const timeline = startTimeline((deltaTime) => {
  control.update(deltaTime);
  // renderer.render(scene, camera);
  deferredRenderer.render(renderer, scene, camera);

  stats.update();
});

pointLights.forEach((pointLight, idx) => {
  const animator = timeline.animate(pointLight.position, { loop: true });
  for (let k = 0; k < 10; k++) {
    animator.when(k * 4000 + idx * 1000, {
      x: randomInSquare(5),
      y: randomInSquare(5),
      z: randomInSquare(5)
    });
  }
  animator.start();
});
