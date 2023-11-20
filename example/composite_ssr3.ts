import {
  Renderer,
  Vector3,
  Scene,
  PlaneGeometry,
  Mesh,
  createStandardShader,
  DirectionalLight,
  Material,
  Texture2D,
  OrbitControl,
  startTimeline,
  Compositor,
  SceneCompositeNode,
  FilterCompositeNode,
  SphereGeometry,
  createCompositeNodeInput,
  Camera
} from 'claygl';
import { blendCompositeFragment } from 'claygl/shaders';
import GBufferNode from './common/HDComposite/GBufferNode';
import SSRCompositeNode from './common/HDComposite/SSRNode';
import dat from 'dat.gui';

const config = {
  maxIteration: 32,
  maxBinarySearchIteration: 5,
  maxRayDistance: 10,
  pixelStride: 16,
  pixelStrideZCutoff: 50,
  screenEdgeFadeStart: 0.9,
  eyeFadeStart: 0.8,
  eyeFadeEnd: 1,

  glossiness: 1,
  minGlossiness: 0.55
};

const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement,
  pixelRatio: 1.0
});
const camera = new Camera('perspective', {
  aspect: renderer.getViewportAspect()
});
camera.position.set(0, 4, 4);
camera.lookAt(Vector3.ZERO);

const scene = new Scene();
const planeGeo = new PlaneGeometry();
const plane = new Mesh(planeGeo, new Material(createStandardShader()));
plane.geometry.generateTangents();

plane.scale.set(10, 10, 1);
plane.rotation.rotateX(-Math.PI / 2);

const diffuseTex = new Texture2D();
const normalTex = new Texture2D();
const roughnessTex = new Texture2D();
diffuseTex.load('assets/textures/oakfloor2/oakfloor2_basecolor.png');
normalTex.load('assets/textures/oakfloor2/oakfloor2_normal.png');
roughnessTex.load('assets/textures/oakfloor2/oakfloor2_roughness.png');

plane.material.set('diffuseMap', diffuseTex);
plane.material.set('normalMap', normalTex);
plane.material.set('roughnessMap', roughnessTex);
plane.material.set('uvRepeat', [5, 5]);
plane.material.set('glossiness', config.glossiness);

const pic = new Mesh(planeGeo, new Material(createStandardShader()), {
  culling: false
});
pic.material.set('color', [4, 4, 4]);
pic.material.set('glossiness', 0);
const picTex = new Texture2D();
picTex.load('assets/models/basic_scene/photo.jpg');
pic.material.set('diffuseMap', picTex);
scene.add(pic);
pic.position.y = 1;

const sphereGeo = new SphereGeometry({
  widthSegments: 50,
  heightSegments: 50
});
const sphere1 = new Mesh(sphereGeo, new Material(createStandardShader()));
sphere1.position.set(2, 1, 0);
scene.add(sphere1);
const sphere2 = new Mesh(sphereGeo, new Material(createStandardShader()));
sphere2.position.set(-2, 1, 0);
scene.add(sphere2);

sphere1.material.set('color', [2, 0, 0]);
sphere2.material.set('color', [0, 2, 0]);

scene.add(plane);
const mainLight = new DirectionalLight({
  intensity: 0.5
});
mainLight.position.set(10, 10, 10);
mainLight.lookAt(scene.position);
scene.add(mainLight);
const fillLight = new DirectionalLight({
  intensity: 0.3
});
fillLight.position.set(5, 5, -10);
fillLight.lookAt(scene.position);
scene.add(fillLight);

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
  gBufferTexture1: createCompositeNodeInput(gBufferNode, 'texture1'),
  gBufferTexture2: createCompositeNodeInput(gBufferNode, 'texture2'),
  colorTexture: sceneNode
};
blendNode.inputs = {
  colorTex1: sceneNode,
  colorTex2: ssrNode
};

blendNode.renderToScreen = true;

compositor.addNode(sceneNode, gBufferNode, ssrNode, blendNode);

startTimeline(function (deltaTime) {
  control.update(deltaTime);
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
gui.add(config, 'minGlossiness', 0, 1).onChange(updateConfig);
