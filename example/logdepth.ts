import { App3D, OrbitControl } from 'claygl';
import dat from 'dat.gui';
const app = new App3D('#main');

app.renderer.logDepthBuffer = true;
// Create camera
const camera = app.createCamera([0, 3, 8], [0, 1, 0]);
camera.projection.far = 10;

// Create lights
app.createDirectionalLight([-2, -1, -1], '#fff', 0.7);
app.createAmbientLight('#fff', 0.3);

// Create geometries.
for (let i = 0; i < 10; i++) {
  const cube = app.createCube({
    color: [Math.random(), Math.random(), Math.random()]
  });
  const x = Math.random() * 1e-3;
  const y = Math.random() * 1e-3;
  const z = Math.random() * 1e-3;
  cube.position.set(x, y, z);
}

const control = new OrbitControl({
  target: camera,
  domElement: app.container,
  timeline: app.timeline
});

window.onresize = function () {
  app.resize();
};

const config = {
  logDepthBuffer: true
};
const gui = new dat.GUI();
gui.add(config, 'logDepthBuffer').onChange(function () {
  app.renderer.logDepthBuffer = config.logDepthBuffer;
});
