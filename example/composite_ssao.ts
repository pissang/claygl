import {
  Renderer,
  Scene,
  PerspectiveCamera,
  Compositor,
  Mesh,
  startTimeline,
  StandardMaterial,
  loadGLTF,
  OrbitControl,
  FilterCompositeNode,
  SceneCompositeNode,
  AmbientSHLight,
  textureUtil,
  AmbientCubemapLight,
  Skybox
} from 'claygl';
import { blendCompositeFragment, composeCompositeFragment } from 'claygl/shaders';
import { projectEnvironmentMap } from '../src/util/sh';
import GBufferCompositeNode from './common/HDComposite/GBufferNode';
import SSAOCompositeNode from './common/HDComposite/SSAONode';

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

const gbufferNode = new GBufferCompositeNode(scene, camera);
const ssaoNode = new SSAOCompositeNode(camera);
const sceneNode = new SceneCompositeNode(scene, camera);
const blendNode = new FilterCompositeNode(blendCompositeFragment);
const tonemappingNode = new FilterCompositeNode(composeCompositeFragment);
ssaoNode.inputs = {
  gBufferTex: {
    node: gbufferNode,
    output: 'texture1'
  },
  depthTex: {
    node: gbufferNode,
    output: 'texture2'
  }
};
blendNode.inputs = {
  // Render scene node firstly
  texture1: sceneNode,
  texture2: ssaoNode
};
tonemappingNode.inputs = {
  texture: blendNode
};
tonemappingNode.renderToScreen = true;

compositor.addNode(gbufferNode, ssaoNode, blendNode, sceneNode, tonemappingNode);

ssaoNode.setKernelSize(64);

startTimeline(() => {
  ssaoNode.setEstimateRadius(0.2);
  tonemappingNode.renderToScreen = true;
  blendNode.material.define('BLEND_METHOD', 1);
  blendNode.material.set('weight1', 1);
  blendNode.material.set('weight2', 1);
  compositor.render(renderer);
});
