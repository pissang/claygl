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
  FilterCompositeNode,
  Skybox,
  textureUtil,
  createCompositeNodeInput
} from 'claygl';
import { blendCompositeFragment, composeCompositeFragment } from 'claygl/shaders';
import GBufferNode from './common/HDComposite/GBufferNode';
import SSRCompositeNode from './common/HDComposite/SSRNode';
import dat from 'dat.gui';
import { prefilterEnvironmentMap } from '../src/util/cubemap';

const config = {
  maxIteration: 16,
  maxBinarySearchIteration: 5,
  maxRayDistance: 4,
  pixelStride: 16,
  pixelStrideZCutoff: 50,
  screenEdgeFadeStart: 0.9,
  eyeFadeStart: 0.4,
  eyeFadeEnd: 0.8,

  roughness: 0.5
};

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

plane.scale.set(10, 10, 1);
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
plane.material.define('SRGB_DECODE');

scene.add(plane);
const mainLight = new DirectionalLight({
  intensity: 1
});
mainLight.position.set(10, 10, 10);
mainLight.lookAt(scene.position);
scene.add(mainLight);

loadGLTF('assets/models/suzanne/suzanne.gltf').then((res) => {
  const suzanneGeometry = (res.scene!.getDescendantByName('Suzanne') as Mesh).geometry;

  const envMap = textureUtil.loadTextureSync(
    'assets/textures/hdr/pisa.hdr',
    {
      exposure: 3
    },
    function () {
      envMap.flipY = false;

      const prefilterResult = prefilterEnvironmentMap(renderer, envMap, {
        width: 128,
        height: 128
      });

      const skybox = new Skybox();
      skybox.setEnvironmentMap(prefilterResult.environmentMap);
      scene.skybox = skybox;

      const material = new Material(createStandardShader());
      const mesh = new Mesh(suzanneGeometry, material);
      mesh.geometry.generateTangents();

      material.set('maxMipmapLevel', prefilterResult.maxMipmapLevel);
      material.set('brdfLookup', prefilterResult.brdfLookup);
      material.set('environmentMap', prefilterResult.environmentMap);
      material.set('roughness', 0.4);
      material.set('metalness', 0.5);
      material.set('uvRepeat', [2, 2]);
      material.define('SRGB_DECODE');

      (
        [
          ['diffuseMap', 'basecolor'],
          ['normalMap', 'normal'],
          ['metalnessMap', 'metalness'],
          ['roughnessMap', 'roughness']
        ] as const
      ).forEach(function (mapInfo) {
        const tex = new Texture2D();
        tex.load('assets/textures/iron-rusted4/iron-rusted4-' + mapInfo[1] + '.png');
        material.set(mapInfo[0], tex);
      });

      mesh.scale.set(1, 1, 1);
      mesh.position.y = 1;
      scene.add(mesh);
    }
  );
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
const tonemappingNode = new FilterCompositeNode(composeCompositeFragment);
ssrNode.inputs = {
  gBufferTexture1: createCompositeNodeInput(gBufferNode, 'texture1'),
  gBufferTexture2: createCompositeNodeInput(gBufferNode, 'texture2'),
  colorTexture: sceneNode
};
blendNode.inputs = {
  colorTex1: sceneNode,
  colorTex2: ssrNode
};
tonemappingNode.inputs = {
  colorTex: blendNode
};

tonemappingNode.renderToScreen = true;
compositor.addNode(sceneNode, gBufferNode, ssrNode, blendNode, tonemappingNode);

startTimeline((deltaTime) => {
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
gui.add(config, 'roughness', 0, 1).onChange(function (val) {
  plane.material.set('roughness', val);
});
