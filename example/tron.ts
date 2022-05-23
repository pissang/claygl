import {
  Shader,
  Renderer,
  Scene,
  PerspectiveCamera,
  CubeGeometry,
  Material,
  Mesh,
  createStandardShader,
  DirectionalLight,
  OrbitControl,
  startTimeline,
  Compositor,
  SceneCompositeNode,
  FilterCompositeNode
} from 'claygl';
import { basicVertex, composeCompositeFragment } from 'claygl/shaders';
import { tronFragment } from './shader/tron.glsl';
import * as dat from 'dat.gui';
import BloomNode from './common/HDComposite/BloomNode';

const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement
  // devicePixelRatio: 1
});
renderer.resize(window.innerWidth, window.innerHeight);
const scene = new Scene();
const camera = new PerspectiveCamera({
  aspect: renderer.getViewportAspect(),
  far: 500
});

const cube = new CubeGeometry({
  widthSegments: 1,
  heightSegments: 1,
  depthSegments: 1
});

const tronMaterial = new Material(new Shader(basicVertex, tronFragment));

camera.position.set(0, 0, 7);

const cubeMeshTronOutline = new Mesh(cube, tronMaterial, {
  culling: false
});
// const cubeMesh = new Mesh(cube, new Material(createStandardShader()));
// cubeMeshTronOutline.scale.set(1.5, 1.5, 1.5);
// cubeMesh.scale.set(1.5, 1.5, 1.5);
// scene.add(cubeMesh);
scene.add(cubeMeshTronOutline);

const light = new DirectionalLight({
  intensity: 0.5
});
light.position.set(4, 5, 2);
light.lookAt(scene.position);
scene.add(light);

const control = new OrbitControl({
  domElement: renderer.canvas,
  target: camera
});

const compositor = new Compositor();
const sceneNode = new SceneCompositeNode(scene, camera);
const bloomNode = new BloomNode();
const tonemappingNode = new FilterCompositeNode(composeCompositeFragment);

sceneNode.outputs = { color: {} };
bloomNode.inputs = {
  texture: sceneNode
};
bloomNode.outputs = {
  color: {}
};
tonemappingNode.inputs = {
  texture: sceneNode,
  bloom: bloomNode
};
bloomNode.setBrightThreshold(0.6);

compositor.addNode(sceneNode, bloomNode, tonemappingNode);

startTimeline((dTime) => {
  // renderer.render(scene, camera);
  control.update(dTime);
  compositor.render(renderer);
});

const gui = new dat.GUI();
const config = {
  sharpness: 10.0,
  substraction: 0.2,
  strength: 50.0,
  bloomIntensity: 0.25
};
function updateTronMat() {
  tronMaterial.set('sharpness', config.sharpness);
  tronMaterial.set('substraction', config.substraction);
  tronMaterial.set('strength', config.strength);
}
function updateGlowMat() {}
gui.add(config, 'sharpness', 0, 100).onChange(updateTronMat);
gui.add(config, 'substraction', 0, 1).onChange(updateTronMat);
gui.add(config, 'strength', 0, 200).onChange(updateTronMat);
gui.add(config, 'bloomIntensity', 0, 1).onChange(updateGlowMat);
