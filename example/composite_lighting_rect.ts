import {
  Renderer,
  Scene,
  Camera,
  Compositor,
  Texture2D,
  Mesh,
  startTimeline,
  StandardMaterial,
  loadGLTF,
  OrbitControl,
  Node as ClayNode,
  FilterCompositeNode,
  Skybox
} from 'claygl';
import LightingCompositeNode from './common/HDComposite/LightingNode';
import { composeCompositeFragment } from 'claygl/shaders';
import GBufferCompositeNode from './common/HDComposite/GBufferNode';
import * as dat from 'dat.gui';
import Stats from 'stats.js';
import RectAreaLight from './common/HDComposite/RectAreaLight';

const compositor = new Compositor();
const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement,
  pixelRatio: 1
});
renderer.resize(window.innerWidth, window.innerHeight);

const camera = new Camera('perspective', {
  aspect: renderer.getViewportAspect()
});
camera.position.set(0, 0, 6);

const scene = new Scene();
const material = new StandardMaterial({
  metalness: 0,
  uvRepeat: [3, 3],
  roughness: 0,
  linear: true
});

const texture = new Texture2D({
  flipY: false
});
// Sky texture
// http://www.hdri-hub.com/hdrishop/freesamples/freehdri/item/113-hdr-111-parking-space-free
texture.load('./assets/textures/Parking_Lot_Bg.jpg');
const skybox = new Skybox();
skybox.material.define('SRGB_DECODE');
scene.skybox = skybox;
skybox.setEnvironmentMap(texture);

const rectLightNode1 = new ClayNode();
const rectLight1 = new RectAreaLight();
rectLightNode1.add(rectLight1);
rectLight1.intensity = 2;
rectLight1.color = [0, 0, 1];
rectLight1.position.z = 3;
rectLight1.width = 2;
rectLight1.height = 2;
const rectLightNode2 = new ClayNode();
const rectLight2 = new RectAreaLight();
rectLightNode2.add(rectLight2);
rectLight2.color = [1, 0, 0];
rectLight2.intensity = 2;
rectLight2.position.z = 3;
rectLight2.width = 2;
rectLight2.height = 2;

scene.add(rectLightNode1);
scene.add(rectLightNode2);

loadGLTF('assets/models/suzanne/suzanne_high.gltf').then((res) => {
  const suzanneGeometry = (res.scene!.getDescendantByName('Suzanne') as Mesh).geometry;

  const mesh = new Mesh(suzanneGeometry, material);
  mesh.geometry.generateTangents();

  mesh.scale.set(1.4, 1.4, 1.4);
  scene.add(mesh);
});

const control = new OrbitControl({
  target: camera,
  domElement: renderer.canvas,
  timeline: startTimeline(),
  zoomSensitivity: 0.4
});

const gbufferNode = new GBufferCompositeNode(scene, camera);
gbufferNode.enableTexture4 = true;
const lightingNode = new LightingCompositeNode(scene, camera);
const tonemappingNode = new FilterCompositeNode(composeCompositeFragment);
tonemappingNode.inputs = {
  colorTex: lightingNode
};
lightingNode.fromGBufferNode(gbufferNode);
tonemappingNode.renderToScreen = true;

compositor.addNode(gbufferNode, lightingNode, tonemappingNode);

startTimeline(() => {
  // PENDING
  scene.update();
  material.metalness = config.metalness;
  material.roughness = config.roughness;

  rectLightNode1.rotation.rotateX(0.01);
  rectLightNode2.rotation.rotateY(0.02);
  compositor.render(renderer);
  stats.update();
});

const stats = new Stats();
stats.dom.style.cssText = 'position: absolute; top: 0px; left: 0px;';
document.body.appendChild(stats.dom);

const config = {
  roughness: 0,
  metalness: 0
};
const gui = new dat.GUI();
gui.add(config, 'roughness', 0, 1);
gui.add(config, 'metalness', 0, 1);
