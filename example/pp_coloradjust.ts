import {
  Renderer,
  Scene,
  PerspectiveCamera,
  Material,
  LambertShader,
  Shader,
  FilterCompositeNode,
  SceneCompositeNode,
  Compositor,
  CubeGeometry,
  Texture2D,
  Mesh,
  Vector3,
  DirectionalLight,
  startTimeline,
  registerBuiltinCompositeShaders
} from 'claygl';

registerBuiltinCompositeShaders(Shader);
const compositor = new Compositor();

const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement,
  devicePixelRatio: 1.0
});
//Create scene
const scene = new Scene();
const camera = new PerspectiveCamera({
  aspect: renderer.canvas.width / renderer.canvas.height,
  far: 500
});
const cube = new CubeGeometry();
const shader = new LambertShader();
const material = new Material({
  shader: shader
});
const texture = new Texture2D();
texture.load('assets/textures/crate.gif');
material.set('diffuseMap', texture);
const mesh = new Mesh({
  material: material,
  geometry: cube
});

scene.add(mesh);

camera.position.set(0, 2, 5);
camera.lookAt(new Vector3());

var light = new DirectionalLight({
  color: [1.5, 1.5, 1.5]
});
light.position.set(50, 50, 50);
light.lookAt(new Vector3());
scene.add(light);

const sceneCompositeNode = new SceneCompositeNode(scene, camera);
sceneCompositeNode.outputs = {
  color: {
    parameters: {
      width: 1024,
      height: 1024
    }
  }
};
compositor.addNode(sceneCompositeNode);

const colorAdjustNode = new FilterCompositeNode(Shader.source('clay.compositor.coloradjust'));
colorAdjustNode.inputs = {
  texture: {
    node: sceneCompositeNode,
    output: 'color'
  }
};
colorAdjustNode.setParameter('gamma', 1.2);
compositor.addNode(colorAdjustNode);

startTimeline(() => {
  compositor.render(renderer);
  mesh.rotation.rotateY(Math.PI / 500);
});
