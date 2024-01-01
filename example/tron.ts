import {
  Shader,
  Renderer,
  Scene,
  CubeGeometry,
  Material,
  Mesh,
  OrbitControl,
  startTimeline,
  Compositor,
  SceneCompositeNode,
  FilterCompositeNode,
  Camera
} from 'claygl';
import { unlitVertex, composeCompositeFragment } from 'claygl/shaders';
import { tronFragment } from './shader/tron.glsl';
import * as dat from 'dat.gui';
import BloomNode from './common/HDComposite/BloomNode';
import TAACameraJitter from './common/HDComposite/TAACameraJitter';
import TAACompositeNode from './common/HDComposite/TAANode';

const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement
});
renderer.resize(window.innerWidth, window.innerHeight);
const scene = new Scene();
const camera = new Camera('perspective', {
  aspect: renderer.getViewportAspect(),
  far: 500
});

const cube = new CubeGeometry({
  widthSegments: 1,
  heightSegments: 1,
  depthSegments: 1
});

const tronMaterial = new Material(new Shader(unlitVertex, tronFragment));

camera.position.set(0, 0, 7);

const cubeMeshTronOutline = new Mesh(cube, tronMaterial, {
  culling: false
});
// const cubeMesh = new Mesh(cube, new Material(createStandardShader()));
// cubeMeshTronOutline.scale.set(1.5, 1.5, 1.5);
// cubeMesh.scale.set(1.5, 1.5, 1.5);
// scene.add(cubeMesh);
scene.add(cubeMeshTronOutline);

const control = new OrbitControl({
  domElement: renderer.canvas,
  target: camera
});
control.on('update', () => {
  taaCameraJitter.resetFrame();
});

const taaCameraJitter = new TAACameraJitter(camera);
const compositor = new Compositor();
const sceneNode = new SceneCompositeNode(scene, camera);
const bloomNode = new BloomNode();
const tonemappingNode = new FilterCompositeNode(composeCompositeFragment);
const taaNode = new TAACompositeNode(camera, taaCameraJitter);

bloomNode.inputs = {
  colorTex: taaNode
};
bloomNode.setBrightThreshold(0.6);
taaNode.inputs = {
  colorTex: sceneNode
};
taaNode.setDynamic(false);
tonemappingNode.inputs = {
  colorTex: taaNode,
  bloomTex: bloomNode
};
tonemappingNode.renderToScreen = true;
compositor.addNode(sceneNode, bloomNode, tonemappingNode, taaNode);

startTimeline((dTime) => {
  control.update(dTime);
  compositor.render(renderer);
  taaCameraJitter.step();
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
