import {
  AmbientLight,
  EnvironmentMapPass,
  loadGLTF,
  Mesh,
  OrbitControl,
  PerspectiveCamera,
  Renderer,
  ShadowMapPass,
  DirectionalLight,
  Node as ClayNode,
  Timeline,
  Scene,
  startTimeline
} from 'claygl';
import dat from 'dat.gui';
import halton from './common/halton';

const pcfKernel: number[] = [];
for (let i = 0; i < 32; i++) {
  pcfKernel.push(halton(i, 2) * 2.0 - 1.0);
  pcfKernel.push(halton(i, 3) * 2.0 - 1.0);
}

const rootNode = new ClayNode();
const scene = new Scene();
loadGLTF('assets/models/basic_scene/scene.gltf', {
  rootNode
}).then((res) => {
  scene.add(res.rootNode!);
  rootNode.rotation.rotateX(-Math.PI / 2);

  const renderer = new Renderer({
    canvas: document.getElementById('main') as HTMLCanvasElement
  });
  renderer.resize(window.innerWidth, window.innerHeight);
  const shadowMapPass = new ShadowMapPass();
  shadowMapPass.kernelPCF = new Float32Array(pcfKernel);

  const camera = new PerspectiveCamera({
    aspect: renderer.getViewportAspect(),
    far: 100
  });

  camera.position.set(2, 2, 2);
  camera.lookAt(scene.position);
  camera.aspect = renderer.canvas.width / renderer.canvas.height;

  const control = new OrbitControl({
    target: camera,
    domElement: renderer.canvas,
    zoomSensitivity: 0.4
  });

  const light = new DirectionalLight({
    shadowResolution: 1024
  });
  light.position.set(-5, 10, 5);
  light.lookAt(scene.position);
  scene.add(light);

  scene.add(
    new AmbientLight({
      intensity: 0.4
    })
  );

  let elpasedTime = 0;
  startTimeline((deltaTime: number) => {
    control.update(deltaTime);
    shadowMapPass.PCSSLightSize = shadowMapConfig.PCSSLightSize;
    light.position.set(
      -7 * Math.cos(elpasedTime / 1000),
      3 * (Math.sin(elpasedTime / 1000) + 2),
      7 * Math.sin(elpasedTime / 1000)
    );
    light.lookAt(scene.position);
    elpasedTime += deltaTime;

    shadowMapPass.render(renderer, scene, camera);
    renderer.render(scene, camera);
  });

  const shadowMapConfig = {
    PCSSLightSize: 50
  };

  const gui = new dat.GUI();
  gui.add(shadowMapConfig, 'PCSSLightSize', 0, 100);
});
