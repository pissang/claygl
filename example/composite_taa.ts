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
  Skybox,
  Node as ClayNode,
  color
} from 'claygl';
import { blendCompositeFragment, composeCompositeFragment } from 'claygl/shaders';
import { projectEnvironmentMap } from '../src/util/sh';
import GBufferCompositeNode from './common/HDComposite/GBufferNode';
import SSAOCompositeNode from './common/HDComposite/SSAONode';
import TAACameraJitter from './common/HDComposite/TAACameraJitter';
import TAACompositeNode from './common/HDComposite/TAANode';

const compositor = new Compositor();
const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement,
  devicePixelRatio: 1
});
renderer.resize(window.innerWidth, window.innerHeight);

const camera = new PerspectiveCamera({
  aspect: renderer.getViewportAspect()
});
camera.position.set(0, 0, 6);

const scene = new Scene();
const rootNode = new ClayNode();
scene.add(rootNode);

loadGLTF('assets/models/suzanne/suzanne_high.gltf', {
  // rootNode
}).then((res) => {
  const suzanneGeometry = (res.scene!.getDescendantByName('Suzanne') as Mesh).geometry;
  suzanneGeometry.generateTangents();

  for (let i = 0; i < 10; i++) {
    for (let k = 0; k < 10; k++) {
      const mesh = new Mesh(
        suzanneGeometry,
        new StandardMaterial({
          uvRepeat: [3, 3],
          metalness: 0,
          roughness: 0
        })
      );
      mesh.position.set(Math.random() * 6 - 3, Math.random() * 6 - 3, Math.random() * 6 - 3);
      // mesh.scale.set(2, 2, 2);
      scene.add(mesh);
    }
  }
  // material.diffuseMap = textureUtil.loadTextureSync('assets/textures/diffuse2.png');

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
      ambientCubemapLight.prefilter(renderer, 256);
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
  zoomSensitivity: 0.2,
  // autoRotate: true,
  timeline: startTimeline()
});
control.on('update', () => {
  taaCameraJitter.resetFrame();
});
// control.autoRotate = true;
// control.autoRotateSpeed = 100;

const taaCameraJitter = new TAACameraJitter(camera);

const gbufferNode = new GBufferCompositeNode(scene, camera);
gbufferNode.enableTexture4 = true;
const ssaoNode = new SSAOCompositeNode(camera, {
  TAAJitter: taaCameraJitter
});
const sceneNode = new SceneCompositeNode(scene, camera);
const blendNode = new FilterCompositeNode(blendCompositeFragment);
const tonemappingNode = new FilterCompositeNode(composeCompositeFragment);
const taaNode = new TAACompositeNode(camera, taaCameraJitter);
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
  colorTex1: sceneNode,
  colorTex2: ssaoNode
};
blendNode.material.define('BLEND_METHOD', 1);
blendNode.material.set('weight1', 1);
blendNode.material.set('weight2', 1);
taaNode.inputs = {
  colorTexture: blendNode,
  gBufferTexture2: {
    node: gbufferNode,
    output: 'texture2'
  },
  gBufferTexture3: {
    node: gbufferNode,
    output: 'texture4'
  }
};
tonemappingNode.inputs = {
  colorTex: taaNode
};
tonemappingNode.renderToScreen = true;
taaNode.setDynamic(false);

compositor.addNode(gbufferNode, ssaoNode, blendNode, sceneNode, tonemappingNode, taaNode);

ssaoNode.setKernelSize(32);

startTimeline(() => {
  ssaoNode.setEstimateRadius(0.2);

  compositor.render(renderer);
  taaCameraJitter.step();
});

const button = document.createElement('button');
button.innerHTML = 'Step';
button.onclick = () => {
  taaCameraJitter.step();
};
button.style.cssText = 'position:absolute;top:0;left:0;';
document.body.appendChild(button);
