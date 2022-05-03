import { App3D } from 'claygl';

const app = new App3D('#main');

// Create camera
const camera = app.createCamera([0, 2, 5], [0, 0, 0]);

// Create cube
const cube = app.createCube({
  color: '#f00'
});
// Create light
const mainLight = app.createDirectionalLight([-1, -1, -1]);

app.loop(() => {
  cube.rotation.rotateY(app.frameTime / 1000);
});

window.onresize = function () {
  app.resize();
};
