import { App3D, OrbitControl } from 'claygl';

const app = new App3D('#main', {
  graphic: {
    shadow: true
  }
});

// Create camera
const camera = app.createCamera([0, 150, 200], [0, 100, 0]);

// Load boombox model.
app.loadModel('./assets/models/SambaDancing/SambaDancing.gltf');

// Create light
app.createDirectionalLight([-1, -1, -1]);

// Use orbit control
const control = new OrbitControl({
  target: camera,
  domElement: app.container,
  timeline: app.timeline
});

window.onresize = function () {
  app.resize();
};
