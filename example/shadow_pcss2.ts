import { App3D, OrbitControl } from 'claygl';
import dat from 'dat.gui';
// import halton from './common/halton';

const NUM_SAMPLES = 32;
const NUM_RINGS = 5;

const pcfKernel: number[] = [];
// github.com/mrdoob/three.js/blob/master/examples/webgl_shadowmap_pcss.html#L54
const ANGLE_STEP = (Math.PI * 2 * NUM_RINGS) / NUM_SAMPLES;
const INV_NUM_SAMPLES = 1.0 / NUM_SAMPLES;
let angle = 0;
let radius = INV_NUM_SAMPLES;
let radiusStep = radius;
for (let i = 0; i < NUM_SAMPLES; i++) {
  const r = Math.pow(radius, 0.75);
  pcfKernel.push(r * Math.cos(angle), r * Math.sin(angle));
  radius += radiusStep;
  angle += ANGLE_STEP;
}

const app = new App3D('#main', {
  graphic: {
    shadow: true
  }
});

app.loop(() => {
  app.getShadowMapPass()!.PCSSLightSize = shadowMapConfig.PCSSLightSize;
  app.getShadowMapPass()!.kernelPCF = new Float32Array(pcfKernel);
});

// Create camera
const camera = app.createCamera([0, 150, 200], [0, 100, 0]);

// Load boombox model.
app.loadModel('./assets/models/SambaDancing/SambaDancing.gltf').then((res) => {
  res.materials.forEach((mat) => {
    mat.set('roughness', 0.2);
  });
});
// Create light
const light = app.createDirectionalLight([-100, -100, -100]);

const plane = app.createPlane();
plane.scale.set(1000, 1000, 0);
plane.rotation.rotateX(-Math.PI / 2);
plane.castShadow = false;

// Use orbit control
const control = new OrbitControl({
  target: camera,
  domElement: app.container,
  timeline: app.timeline
});

window.onresize = function () {
  app.resize();
};

const shadowMapConfig = {
  PCSSLightSize: 50
};

const gui = new dat.GUI();
gui.add(shadowMapConfig, 'PCSSLightSize', 0, 100);
