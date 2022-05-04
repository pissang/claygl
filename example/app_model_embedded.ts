import { App3D, OrbitControl } from 'claygl';
const app = new App3D('#main');
// Create camera
const camera = app.createCamera([0, 2, 4], [0, 0, 0]);

// Create light
app.createDirectionalLight([-1, -1, -1]);

// Use orbit control
const control = new OrbitControl({
  target: camera,
  domElement: app.container,
  timeline: app.timeline
});

app.loadModel('./assets/models/Duck_Embedded.gltf');

window.onresize = function () {
  app.resize();
};
