import { App3D, OrbitControl, PerspectiveCamera } from 'claygl';

const app = new App3D('#main', {
  lazyInit: true,
  graphic: {
    linear: true,
    tonemapping: true
  }
});

let camera: PerspectiveCamera;
let control: OrbitControl;
app.init(() => {
  // Create camera
  camera = app.createCamera([0, 10, 25], [0, 0, 0]);

  // Use orbit control
  control = new OrbitControl({
    target: camera,
    domElement: app.container
  });

  app.createAmbientCubemapLight('./assets/textures/hdr/pisa.hdr', 1, 0.5, 2);

  for (let i = 0; i < 10; i++) {
    app
      .createSphere({
        metalness: 1,
        roughness: i / 10
      })
      .position.set((i - 5) * 3, -2, 0);

    app
      .createSphere({
        metalness: 0,
        roughness: i / 10
      })
      .position.set((i - 5) * 3, -5, 0);
  }

  // Load boombox model. return a load promise to make sure the look will be start after model loaded.
  return app
    .loadModel('./assets/models/BoomBox/BoomBox.gltf', {
      waitTextureLoaded: true
    })
    .then(function (result) {
      result.rootNode!.position.y = 5;
      result.rootNode!.scale.set(300, 300, 300);
    });
});

app.loop(() => {
  control.update(app.frameTime);
});

window.onresize = function () {
  app.resize();
};
