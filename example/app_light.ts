import { App3D, Vector3, BasicShader, OrbitControl } from 'claygl';

const app = new App3D('#main', {
  graphic: {
    shadow: true,
    tonemapping: true
  }
});

// Create camera
const camera = app.createCamera([0, 150, 200], [0, 100, 0]);

// Load boombox model.
app.loadModel('./assets/models/SambaDancing/SambaDancing.gltf');

// Create lights
app.createDirectionalLight([-1, -1, -1], '#fff', 0.7);
app.createAmbientLight('#fff', 0.3);

const pointLight1 = app.createPointLight([50, 100, 50], 500, '#00f', 5);
const pointLight2 = app.createPointLight([-80, 150, 70], 500, '#0f0', 5);
pointLight1.castShadow = true;
pointLight2.castShadow = true;

app.createSphere(
  {
    shader: new BasicShader(),
    color: [0, 0, 1]
  },
  pointLight1
);

app.createSphere(
  {
    shader: new BasicShader(),
    color: [0, 1, 0]
  },
  pointLight2
);

// Create a room.
const cube = app.createCubeInside({
  roughness: 1,
  color: [0.3, 0.3, 0.3]
});
// Cube not cast shadow to reduce the bounding box of scene and increse the shadow resolution.
cube.castShadow = false;
cube.scale.set(400, 400, 400);
cube.position.y = 400;

// Use orbit control
const control = new OrbitControl({
  target: camera,
  domElement: app.container
});

app.loop(function () {
  control.update(app.frameTime);
  pointLight1.rotateAround(new Vector3(0, 100, 0), new Vector3(0.1, 1, 0.1), 0.1);
  pointLight2.rotateAround(new Vector3(0, 120, 0), new Vector3(-0.1, 1, -0.2), 0.05);
});

window.onresize = function () {
  app.resize();
};
