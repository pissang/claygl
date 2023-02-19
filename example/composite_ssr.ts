import {
  Renderer,
  PerspectiveCamera,
  Vector3,
  Scene,
  PlaneGeometry,
  Mesh,
  createStandardShader,
  DirectionalLight,
  Material,
  Texture2D,
  loadGLTF,
  OrbitControl,
  startTimeline,
  Compositor,
  SceneCompositeNode,
  FilterCompositeNode
} from 'claygl';
import { blendCompositeFragment } from 'claygl/shaders';
import GBufferNode from './common/HDComposite/GBufferNode';
import SSRCompositeNode from './common/HDComposite/SSRNode';
import dat from 'dat.gui';

const config = {
  maxIteration: 20,
  maxBinarySearchIteration: 5,
  maxRayDistance: 7.5,
  pixelStride: 16,
  pixelStrideZCutoff: 50,
  screenEdgeFadeStart: 0.9,
  eyeFadeStart: 0.4,
  eyeFadeEnd: 0.8,

  roughness: 0.5
} as const;

const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement,
  pixelRatio: 1.0
});
const camera = new PerspectiveCamera({
  aspect: renderer.getViewportAspect()
});
camera.position.set(0, 4, 4);
camera.lookAt(Vector3.ZERO);

const scene = new Scene();
const planeGeo = new PlaneGeometry();
const plane = new Mesh(planeGeo, new Material(createStandardShader()));
plane.scale.set(14, 14, 1);
plane.rotation.rotateX(-Math.PI / 2);
// plane.material.set('color', [0.2, 0.2, 0.2]);

const diffuseTex = new Texture2D();
const normalTex = new Texture2D();
diffuseTex.load('assets/textures/oakfloor2/oakfloor2_basecolor.png');
normalTex.load('assets/textures/oakfloor2/oakfloor2_normal.png');
plane.geometry.generateTangents();
plane.material.set('diffuseMap', diffuseTex);
plane.material.set('normalMap', normalTex);
plane.material.set('uvRepeat', [5, 5]);

scene.add(plane);
const mainLight = new DirectionalLight({
  intensity: 2
});
mainLight.position.set(12, 12, 12);
mainLight.lookAt(scene.position);
scene.add(mainLight);

const monkeys: Mesh[] = [];

loadGLTF('assets/models/suzanne/suzanne.gltf').then((res) => {
  const suzanneGeometry = (res.scene!.getDescendantByName('Suzanne') as Mesh).geometry;

  for (let i = 0; i < 8; i++) {
    for (let j = 0; j < 8; j++) {
      const mesh = new Mesh(suzanneGeometry, new Material(createStandardShader()));
      mesh.position.set((i - 4) * 3, 1, (j - 4) * 3);
      scene.add(mesh);
      mesh.material.set('roughness', 0.5);
      mesh.material.set('color', [0, 0, 0]);
      mesh.material.set('emission', [Math.random(), Math.random(), Math.random()]);
      monkeys.push(mesh);
    }
  }
});

const control = new OrbitControl({
  target: camera,
  domElement: renderer.canvas
});

const compositor = new Compositor();
const sceneNode = new SceneCompositeNode(scene, camera);
const gBufferNode = new GBufferNode(scene, camera);
const ssrNode = new SSRCompositeNode(camera);
const blendNode = new FilterCompositeNode(blendCompositeFragment);
ssrNode.inputs = {
  gBufferTexture1: {
    node: gBufferNode,
    output: 'texture1'
  },
  gBufferTexture2: {
    node: gBufferNode,
    output: 'texture2'
  },
  colorTexture: sceneNode
};
blendNode.inputs = {
  colorTex1: sceneNode,
  colorTex2: ssrNode
};

blendNode.renderToScreen = true;

compositor.addNode(sceneNode, gBufferNode, ssrNode, blendNode);

let elpasedTime = 0;
startTimeline((deltaTime) => {
  elpasedTime += deltaTime;
  control.update(deltaTime);

  monkeys.forEach(function (monkey, idx) {
    monkey.position.y = 1 + 0.5 * (Math.sin(elpasedTime / 3e2 + idx) + 1);
  });

  compositor.render(renderer);
});

function resize() {
  renderer.resize(window.innerWidth, window.innerHeight);
  camera.aspect = renderer.getViewportAspect();
}

window.onresize = resize;
resize();

function updateConfig() {
  ssrNode.setParams(config);
}
updateConfig();

const gui = new dat.GUI();
gui.add(config, 'maxIteration', 0, 200).step(1).onChange(updateConfig);
gui.add(config, 'maxBinarySearchIteration', 0, 20).step(1).onChange(updateConfig);
gui.add(config, 'maxRayDistance', 0, 10).onChange(updateConfig);
gui.add(config, 'pixelStride', 0, 32).onChange(updateConfig);
gui.add(config, 'pixelStrideZCutoff', 0, 50).onChange(updateConfig);
gui.add(config, 'screenEdgeFadeStart', 0, 1).onChange(updateConfig);
gui.add(config, 'eyeFadeStart', 0, 1).onChange(updateConfig);
gui.add(config, 'eyeFadeEnd', 0, 1).onChange(updateConfig);
gui.add(config, 'roughness', 0, 1).onChange(function (val) {
  plane.material.set('roughness', val);
});
