import {
  Renderer,
  DeferredGBuffer,
  loadGLTF,
  startTimeline,
  Scene,
  OrbitControl,
  Mesh,
  StandardMaterial,
  Texture2D,
  constants,
  Camera
} from 'claygl';
import * as dat from 'dat.gui';

const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement
});
const gbuffer = new DeferredGBuffer({
  enableTargetTexture4: true
});
const camera = new Camera('perspective', {
  aspect: renderer.getViewportAspect()
});
camera.position.set(0, 0, 6);

const scene = new Scene();

loadGLTF('assets/models/suzanne/suzanne_high.gltf').then((res) => {
  const suzanneGeometry = (res.scene!.getDescendantByName('Suzanne') as Mesh).geometry;

  const material = new StandardMaterial({
    metalness: 0.5,
    uvRepeat: [3, 3],
    roughness: 0.5
  });
  const mesh = new Mesh(suzanneGeometry, material);
  mesh.geometry.generateTangents();

  (
    [
      ['diffuseMap', 'basecolor'],
      ['normalMap', 'normal'],
      ['metalnessMap', 'metalness'],
      ['roughnessMap', 'roughness']
    ] as const
  ).forEach(function (mapInfo) {
    const tex = new Texture2D({
      wrapS: constants.REPEAT,
      wrapT: constants.REPEAT
    });
    tex.load('assets/textures/iron-rusted4/iron-rusted4-' + mapInfo[1] + '.png').then(() => {
      update();
    });
    material[mapInfo[0]] = tex;
  });

  mesh.scale.set(1.4, 1.4, 1.4);
  scene.add(mesh);

  update();
});

const control = new OrbitControl({
  target: camera,
  domElement: renderer.canvas,
  timeline: startTimeline()
});

control.on('update', update);

function update() {
  scene.update();
  camera.update();
  gbuffer.update(renderer, scene, camera);
  gbuffer.renderDebug(renderer, camera, config.debugType);
}

function resize() {
  renderer.resize(window.innerWidth, window.innerHeight);
  gbuffer.resize(
    renderer.getWidth() * renderer.getPixelRatio(),
    renderer.getHeight() * renderer.getPixelRatio()
  );
  camera.projection.aspect = renderer.getViewportAspect();
}

window.onresize = resize;
resize();

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
  debugType: (typeof availableDebugTypes)[number];
} = {
  debugType: 'normal'
};
const gui = new dat.GUI();

gui.add(config, 'debugType', availableDebugTypes).onChange(update);
