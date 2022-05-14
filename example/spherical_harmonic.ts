import {
  Renderer,
  PerspectiveCamera,
  SphereGeometry,
  Scene,
  loadGLTF,
  textureUtil,
  Skybox,
  Mesh,
  Material,
  createStandardShader,
  AmbientSHLight,
  OrbitControl,
  startTimeline
} from 'claygl';
import { projectEnvironmentMap } from '../src/util/sh';

const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement,
  devicePixelRatio: 1.0
});
renderer.resize(window.innerWidth, window.innerHeight);
const camera = new PerspectiveCamera({
  aspect: renderer.getViewportAspect()
});
camera.position.set(0, 0, 5);

const scene = new Scene();
const sphereGeo = new SphereGeometry({
  widthSegments: 50,
  heightSegments: 50
});

loadGLTF('assets/models/suzanne/suzanne.gltf').then((res) => {
  const suzanneGeometry = (res.scene!.getDescendantByName('Suzanne') as Mesh).geometry;

  const envMap = textureUtil.loadTextureSync(
    'assets/textures/hdr/pisa.hdr',
    {
      exposure: 2
    },
    function () {
      envMap.flipY = false;

      const coeff = projectEnvironmentMap(renderer, envMap);
      const light = new AmbientSHLight({
        coefficients: coeff
      });
      console.log(coeff);
      scene.add(light);

      const material = new Material(createStandardShader());
      const sphere = new Mesh(sphereGeo, material);

      const monkey = new Mesh(suzanneGeometry, material);

      sphere.position.x = -2;
      monkey.position.x = 2;

      scene.add(sphere);
      scene.add(monkey);

      new Skybox({
        scene: scene,
        environmentMap: envMap
      });
    }
  );
});

const control = new OrbitControl({
  target: camera,
  domElement: renderer.canvas
});

startTimeline((deltaTime) => {
  control.update(deltaTime);
  renderer.render(scene, camera);
});
