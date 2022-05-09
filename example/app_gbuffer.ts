import { App3D, DeferredGBuffer, OrbitControl } from 'claygl';
import * as dat from 'dat.gui';

const availableDebugTypes = [
  'normal',
  'depth',
  'position',
  'glossiness',
  'metalness',
  'albedo',
  'velocity'
] as const;
const config: {
  debugType: typeof availableDebugTypes[number];
} = {
  debugType: 'normal'
};
const gui = new dat.GUI();

gui.add(config, 'debugType', availableDebugTypes);

const app = new App3D('#main', {
  autoRender: false
});

const gbuffer = new DeferredGBuffer({
  enableTargetTexture4: true
});

// Create camera
const camera = app.createCamera([0, 150, 200], [0, 100, 0]);

// Load boombox model.
app.loadModel('./assets/models/SambaDancing/SambaDancing.gltf').then(function (result) {
  result.materials.forEach(function (mat) {
    mat.set('metalness', 1);
  });
});

// Create light
app.createDirectionalLight([-1, -1, -1]);

// Use orbit control
const control = new OrbitControl({
  target: camera,
  domElement: app.container,
  timeline: app.timeline
});

app.loop(() => {
  app.scene.update();
  gbuffer.resize(app.width, app.height);
  gbuffer.update(app.renderer, app.scene, camera);
  gbuffer.renderDebug(app.renderer, camera, config.debugType);
});

window.onresize = function () {
  app.resize();
};
