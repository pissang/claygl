import {
  Renderer,
  Scene,
  PerspectiveCamera,
  Compositor,
  Texture2D,
  Mesh,
  startTimeline,
  StandardMaterial,
  loadGLTF,
  constants,
  OrbitControl,
  FilterCompositeNode
} from 'claygl';
import GBufferCompositeNode from './common/HDComposite/GBufferNode';
import { outputTextureFragment } from 'claygl/shaders';
import * as dat from 'dat.gui';

const compositor = new Compositor();
const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement
});
renderer.resize(window.innerWidth, window.innerHeight);

const camera = new PerspectiveCamera({
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
    tex.load('assets/textures/iron-rusted4/iron-rusted4-' + mapInfo[1] + '.png');
    material[mapInfo[0]] = tex;
  });

  mesh.scale.set(1.4, 1.4, 1.4);
  scene.add(mesh);
});

const control = new OrbitControl({
  target: camera,
  domElement: renderer.canvas,
  timeline: startTimeline()
});

const availableDebugTypes = ['texture1', 'texture2', 'texture3', 'texture4'] as const;
const config: {
  debugType: typeof availableDebugTypes[number];
} = {
  debugType: 'texture1'
};
const gui = new dat.GUI();
gui.add(config, 'debugType', availableDebugTypes);

const gbufferNode = new GBufferCompositeNode(scene, camera);
gbufferNode.enableTexture4 = true;
const outputNode = new FilterCompositeNode(outputTextureFragment);

compositor.addNode(gbufferNode);
compositor.addNode(outputNode);

startTimeline(() => {
  outputNode.inputs = {
    texture: {
      node: gbufferNode,
      output: config.debugType
    }
  };
  compositor.render(renderer);
});
