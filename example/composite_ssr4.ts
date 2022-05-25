import {
  Renderer,
  PerspectiveCamera,
  Vector3,
  Mesh,
  OrbitControl,
  startTimeline,
  Compositor,
  SceneCompositeNode,
  FilterCompositeNode,
  loadGLTF,
  SpotLight,
  AmbientLight
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
  minGlossiness: 0.1,

  zThicknessThreshold: 0.1
};

const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement,
  devicePixelRatio: 1.0
});
const camera = new PerspectiveCamera({
  aspect: renderer.getViewportAspect(),
  far: 100
});
camera.position.set(2, 2, 2);
camera.lookAt(Vector3.ZERO);

camera.lookAt(Vector3.ZERO);

const control = new OrbitControl({
  target: camera,
  domElement: renderer.canvas
});

loadGLTF('assets/models/basic_scene/scene.gltf').then((res) => {
  const scene = res.scene!;
  scene!.rotation.rotateX(-Math.PI / 2);

  const light = new SpotLight();
  light.range = 30;
  light.umbraAngle = 10;
  light.penumbraAngle = 25;
  light.position.set(-5, -5, 5);
  light.lookAt(scene.position);
  scene.add(light);

  scene.add(
    new AmbientLight({
      intensity: 0.3
    })
  );

  // scene.traverse(function (node) {
  //     if (node.material) {
  //         node.material.set('glossiness', 0.8);
  //     }
  // });
  (scene.getDescendantByName('Plane') as Mesh).culling = false;
  (scene.getDescendantByName('Plane_001') as Mesh).culling = false;

  (scene.getDescendantByName('Plane') as Mesh).material.set('glossiness', 0.8);
  (scene.getDescendantByName('Plane') as Mesh).material.set('color', [0.4, 0.4, 0.4]);

  const compositor = new Compositor();
  const sceneNode = new SceneCompositeNode(scene, camera);
  const gBufferNode = new GBufferNode(scene, camera);
  const ssrNode = new SSRCompositeNode(camera);
  const blendNode = new FilterCompositeNode(blendCompositeFragment);
  ssrNode.inputs = {
    gBufferTexture1: {
      node: gBufferNode,
      output: 'texture1'
    },
    gBufferTexture2: {
      node: gBufferNode,
      output: 'texture2'
    },
    colorTexture: sceneNode
  };
  blendNode.inputs = {
    texture1: sceneNode,
    texture2: ssrNode
  };
  blendNode.renderToScreen = true;
  compositor.addNode(sceneNode, gBufferNode, ssrNode, blendNode);

  startTimeline((deltaTime) => {
    control.update(deltaTime);
    compositor.render(renderer);
  });

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
  gui.add(config, 'zThicknessThreshold', 0, 2).onChange(updateConfig);
});

function resize() {
  renderer.resize(window.innerWidth, window.innerHeight);
  camera.aspect = renderer.getViewportAspect();
}

window.onresize = resize;
resize();
