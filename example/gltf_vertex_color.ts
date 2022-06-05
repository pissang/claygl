import { App3D, createUnlitShader } from 'claygl';
const app = new App3D('#main');

// Create camera
const camera = app.createCamera([2, 2, 2], [0, 0, 0]);
// Load boombox model.
app.loadModel('./assets/models/test/VertexColorTest.glb', {
  shader: createUnlitShader()
});

window.onresize = function () {
  app.resize();
};
