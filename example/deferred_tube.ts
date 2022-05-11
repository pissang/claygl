import {
  Renderer,
  DeferredRenderer,
  PerspectiveCamera,
  Texture2D,
  Scene,
  Mesh,
  StandardMaterial,
  SphereGeometry,
  constants
} from 'claygl';

const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement,
  devicePixelRatio: 1.0
});
renderer.resize(window.innerWidth, window.innerHeight);
const deferredRenderer = new DeferredRenderer();

const camera = new clay.camera.Perspective({
  far: 10000,
  aspect: renderer.getViewportAspect()
});

const texture = new Texture2D({
  wrapS: constants.REPEAT,
  wrapT: constants.REPEAT,
  anisotropic: 32
});
texture.load('assets/textures/rockwall_n.jpg');

const scene = new clay.Scene();

const plane = new clay.Mesh({
  material: new clay.StandardMaterial({
    glossiness: 0.5,
    uvRepeat: [100, 100],
    normalMap: texture
  }),
  geometry: new clay.geometry.Plane()
});
plane.scale.set(10000, 10000, 1);
plane.rotation.rotateX(-Math.PI / 2);
plane.geometry.generateTangents();

scene.add(plane);

function randomInSquare(size) {
  return (Math.random() - 0.5) * size * 2;
}

const cylinder = new clay.geometry.Cylinder();
cylinder.applyTransform(new clay.Matrix4().rotateZ(Math.PI / 2));
for (const i = 0; i < 20; i++) {
  const tubeLight = new clay.light.Tube({
    color: [1, 1, 1],
    range: 400,
    intensity: 2.0,
    length: 1000
  });
  // const x = (i - 10) * 400;
  const x = 0;
  const z = (i - 10) * 400;
  // const z = 0;
  const y = 100;
  tubeLight.position.set(x, y, z);
  scene.add(tubeLight);

  const lightMesh = new clay.Mesh({
    material: new clay.StandardMaterial({
      color: [0, 0, 0],
      specularColor: [0, 0, 0],
      glossiness: 0.0,
      emission: tubeLight.color
    }),
    geometry: cylinder
  });
  const r = 1;
  const l = tubeLight.length;
  lightMesh.scale.set(r + l / 2, r, r);

  tubeLight.add(lightMesh);
}

const sphereGeo = new clay.geometry.Sphere({
  widthSegments: 50,
  heightSegments: 50
});
for (let i = 0; i < 10; i++) {
  for (let j = 0; j < 10; j++) {
    const sphere = new clay.Mesh({
      material: new clay.StandardMaterial({
        glossiness: 0.4,
        color: [0, 0, 0]
      }),
      geometry: sphereGeo
    });
    sphere.scale.set(40, 40, 40);
    sphere.position.set((i - 5) * 200, 200, (j - 5) * 200);
    scene.add(sphere);
  }
}

camera.position.set(0, 50, 100);
camera.lookAt(scene.position);

const control = new clay.plugin.OrbitControl({
  domElement: renderer.canvas,
  target: camera
});

const timeline = new clay.Timeline();

const debugPass = new clay.compositor.Pass({
  fragment: clay.Shader.source('clay.compositor.output')
});
debugPass.material.undefine('fragment', 'OUTPUT_ALPHA');
timeline.on('frame', function (deltaTime) {
  control.update(deltaTime);
  deferredRenderer.render(renderer, scene, camera);

  debugPass.setUniform('texture', deferredRenderer._lightAccumTex);
  // debugPass.render(renderer);

  stats.update();
});
timeline.start();

const stats = new Stats();
stats.dom.style.position = 'absolute';
stats.dom.style.top = '0px';
stats.dom.style.right = '0px';
document.body.appendChild(stats.dom);
