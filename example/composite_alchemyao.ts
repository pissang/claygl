import {
  Renderer,
  PerspectiveCamera,
  Scene,
  Mesh,
  Compositor,
  startTimeline,
  OrbitControl,
  loadGLTF,
  StandardMaterial,
  textureUtil,
  AmbientSHLight,
  AmbientCubemapLight,
  Skybox,
  SceneCompositeNode,
  FilterCompositeNode
} from 'claygl';
import { blendCompositeFragment, composeCompositeFragment } from 'claygl/shaders';
import AlchemyAOCompositeNode from './common/HDComposite/AlchemyAOCompositeNode';
import GBufferNode from './common/HDComposite/GBufferNode';
import { projectEnvironmentMap } from '../src/util/sh';
import dat from 'dat.gui';

const config = {
  kernelSize: 12,
  bias: 0.05,
  radius: 4,
  scale: 1,
  power: 1,
  epsilon: 0.0001
};

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
  suzanneGeometry.generateTangents();

  const material = new StandardMaterial({
    uvRepeat: [3, 3],
    metalness: 0,
    roughness: 0.5
  });

  for (let i = 0; i < 10; i++) {
    for (let k = 0; k < 10; k++) {
      const mesh = new Mesh(suzanneGeometry, material);
      mesh.position.set(Math.random() * 6 - 3, Math.random() * 6 - 3, Math.random() * 6 - 3);
      scene.add(mesh);
    }
  }

  material.diffuseMap = textureUtil.loadTextureSync('assets/textures/diffuse2.png');

  textureUtil
    .loadTexture('assets/textures/hdr/pisa.hdr', {
      exposure: 1
    })
    .then((cubemap) => {
      cubemap.flipY = false;

      const coeff = projectEnvironmentMap(renderer, cubemap);
      const ambientLight = new AmbientSHLight({
        coefficients: coeff
      });
      scene.add(ambientLight);

      const ambientCubemapLight = new AmbientCubemapLight({
        cubemap
      });
      ambientCubemapLight.prefilter(renderer, 64);
      scene.add(ambientCubemapLight);

      const skybox = new Skybox({
        environmentMap: ambientCubemapLight.cubemap
      });
      skybox.material.define('fragment', 'RGBM_DECODE');
      skybox.material.set('lod', 3.0);
      scene.skybox = skybox;
    });
});

const control = new OrbitControl({
  target: camera,
  domElement: renderer.canvas,
  timeline: startTimeline()
});

const compositor = new Compositor();
const gBufferNode = new GBufferNode(scene, camera);
const alchemyAONode = new AlchemyAOCompositeNode(camera);
const sceneNode = new SceneCompositeNode(scene, camera);
const blendNode = new FilterCompositeNode(blendCompositeFragment);
const tonemappingNode = new FilterCompositeNode(composeCompositeFragment);
alchemyAONode.inputs = {
  gBufferTexture1: {
    node: gBufferNode,
    output: 'texture1'
  },
  gBufferTexture2: {
    node: gBufferNode,
    output: 'texture2'
  }
};
alchemyAONode.outputs = {
  color: {}
};
sceneNode.outputs = {
  color: {}
};
blendNode.inputs = {
  // Render scene node firstly
  texture1: sceneNode,
  texture2: alchemyAONode
};
blendNode.outputs = {
  color: {}
};
tonemappingNode.inputs = {
  texture: blendNode
};
blendNode.material.define('BLEND_METHOD', 1);
blendNode.material.set('weight1', 1);
blendNode.material.set('weight2', 1);
compositor.addNode(gBufferNode, alchemyAONode, sceneNode, blendNode, tonemappingNode);

startTimeline((deltaTime) => {
  control.update(deltaTime);
  scene.update();
  camera.update();

  compositor.render(renderer);
});

const gui = new dat.GUI();

function updateConfig() {
  alchemyAONode.setParams(config);
}

gui.add(config, 'kernelSize', 4, 128).step(1).onChange(updateConfig);
gui.add(config, 'radius', 0, 10).onChange(updateConfig);
gui.add(config, 'scale', 0, 2).onChange(updateConfig);
gui.add(config, 'power', 0.1, 6).onChange(updateConfig);
gui.add(config, 'bias').onChange(updateConfig);
gui.add(config, 'epsilon').onChange(updateConfig);

updateConfig();
