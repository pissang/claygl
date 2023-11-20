import { App3D, Camera, OrbitControl } from 'claygl';
const app = new App3D('#main', {
  lazyInit: true,
  graphic: {
    linear: true,
    tonemapping: true
  }
});

let camera: Camera;
let control: OrbitControl;

app.init(() => {
  // Create camera
  camera = app.createCamera([0, 2, 5], [0, 0, 0]);

  app.createAmbientCubemapLight('./assets/textures/hdr/pisa.hdr', 1, 0.5, 2);

  // Create light
  app.createDirectionalLight([-1, -1, -1]);

  // Use orbit control
  control = new OrbitControl({
    target: camera,
    domElement: app.container,
    timeline: app.timeline
  });

  // Load boombox model.
  return app.loadModel('./assets/models/busterDrone/busterDrone.gltf', {
    waitTextureLoaded: true
  });
});

window.onresize = function () {
  app.resize();
};
