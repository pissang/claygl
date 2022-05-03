import { App3D, ConeGeometry, CylinderGeometry, OrbitControl } from 'claygl';

var app = new App3D('#main', {
  event: true,

  graphic: {
    shadow: true
  }
});

// Create camera
const camera = app.createCamera([0, 3, 8], [0, 1, 0]);

// Create lights
app.createDirectionalLight([-1, -1, -1], '#fff', 0.7);
app.createAmbientLight('#fff', 0.3);

// Create geometries.
app.createCube();
app.createSphere().position.set(2, 0, 0);
app.createPlane().position.set(-2, 0, 0);
// More geometries can be found under clay.geometry namespace
app.createMesh(new ConeGeometry()).position.set(4, 0, 0);
app.createMesh(new CylinderGeometry()).position.set(-4, 0, 0);

// Create a room
var roomCube = app.createCubeInside({
  roughness: 1,
  color: [0.3, 0.3, 0.3]
});
roomCube.silent = true;
// Cube not cast shadow to reduce the bounding box of scene and increse the shadow resolution.
roomCube.castShadow = false;
roomCube.scale.set(10, 10, 10);
roomCube.position.y = 9;

// Use orbit control
const control = new OrbitControl({
  target: camera,
  domElement: app.container
});

app.scene
  // TODO Event type
  .on('mouseover', function (e: any) {
    e.target.material.set('color', '#f00');
  })
  .on('mouseout', function (e: any) {
    e.target.material.set('color', '#fff');
  });

app.loop(function (frameTime) {
  control.update(frameTime);
});

window.onresize = function () {
  app.resize();
};
