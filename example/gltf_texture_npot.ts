import { App3D, BasicShader } from 'claygl';
const app = new App3D('#main');

// Create camera
const camera = app.createCamera([2, 2, 2], [0, 0, 0]);
// Load boombox model.
app.loadModel('./assets/models/test/BoxTextured.glb', {
  shader: new BasicShader(),
  waitTextureLoaded: true,
  textureConvertToPOT: true
});

window.onresize = function () {
  app.resize();
};
