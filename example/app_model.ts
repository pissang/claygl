import { App3D, OrbitControl } from 'claygl';
const app = new App3D('#main');
// Create camera
const camera = app.createCamera([0, 2, 5], [0, 0, 0]);

// Create light
app.createDirectionalLight([-1, -1, -1]);

// Use orbit control
const control = new OrbitControl({
  target: camera,
  domElement: app.container,
  timeline: app.timeline
});

// Load boombox model
app
  .loadModel('./assets/models/BoomBox/BoomBox.gltf', {
    waitTextureLoaded: true
  })
  .then(function (result) {
    result.rootNode!.scale.set(100, 100, 100);
  });

window.onresize = function () {
  app.resize();
};
