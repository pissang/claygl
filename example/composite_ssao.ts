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
  Texture2D,
  constants,
  textureUtil,
  AmbientCubemapLight,
  Skybox
} from 'claygl';
import { blendCompositeFragment } from 'claygl/shaders';
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
  // suzanneGeometry.generateTangents();

  const material = new StandardMaterial({
    uvRepeat: [3, 3],
    metalness: 1,
    roughness: 0.5
  });

  for (let i = 0; i < 1; i++) {
    for (let k = 0; k < 1; k++) {
      const mesh = new Mesh(suzanneGeometry, material);
      // mesh.position.set(Math.random() * 6 - 3, Math.random() * 6 - 3, Math.random() * 6 - 3);
      scene.add(mesh);
    }
  }

  (
    [
      ['diffuseMap', 'basecolor'],
      // ['normalMap', 'normal'],
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

  // const ambientLight = new AmbientSHLight({
  //   coefficients: [
  //     0.8412171602249146, 0.7048264741897583, 0.6798030138015747, 0.04188510403037071,
  //     -0.07789400964975357, -0.1612781137228012, 0.34389251470565796, 0.28684914112091064,
  //     0.2965990900993347, -0.0381232425570488, -0.018468767404556274, -0.0057519543915987015,
  //     0.001960072899237275, 0.03836826607584953, 0.05928690358996391, -0.01065240427851677,
  //     -0.006494533270597458, -0.003941791597753763, 0.03288273513317108, -0.03238937631249428,
  //     -0.080152228474617, -0.06250155717134476, -0.05114321783185005, -0.06220022961497307,
  //     0.04374731332063675, 0.0522356741130352, 0.04525957629084587
  //   ]
  // });
  // scene.add(ambientLight)

  textureUtil
    .loadTexture('assets/textures/hdr/pisa.hdr', {
      exposure: 2
    })
    .then((cubemap) => {
      cubemap.flipY = false;
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
  timeline: startTimeline()
});

const gbufferNode = new GBufferCompositeNode(scene, camera);
const ssaoNode = new SSAOCompositeNode(camera);
const sceneNode = new SceneCompositeNode(scene, camera);
const blendNode = new FilterCompositeNode(blendCompositeFragment);
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
ssaoNode.outputs = {
  color: {}
};
sceneNode.outputs = {
  color: {}
};
blendNode.inputs = {
  // Render scene node firstly
  texture1: sceneNode,
  texture2: ssaoNode
};

compositor.addNode(gbufferNode);
compositor.addNode(ssaoNode);
compositor.addNode(blendNode);
compositor.addNode(sceneNode);

ssaoNode.setKernelSize(64);

startTimeline(() => {
  ssaoNode.setEstimateRadius(0.2);
  blendNode.renderToScreen = true;
  blendNode.material.define('BLEND_METHOD', 1);
  blendNode.material.set('weight1', 1);
  blendNode.material.set('weight2', 1);
  compositor.render(renderer);
});
