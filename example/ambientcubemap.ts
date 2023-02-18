import {
  Renderer,
  PerspectiveCamera,
  Scene,
  loadGLTF,
  OrbitControl,
  Mesh,
  textureUtil,
  Geometry,
  AmbientCubemapLight,
  AmbientLight,
  StandardMaterial,
  Skybox,
  startTimeline
} from 'claygl';
const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement
});
renderer.resize(window.innerWidth, window.innerHeight);
const camera = new PerspectiveCamera({
  aspect: renderer.getViewportAspect()
});
camera.position.set(0, 0, 6);

const scene = new Scene();

function start() {}
let suzanneGeometry: Geometry;
loadGLTF('assets/models/suzanne/suzanne_high.gltf').then((res) => {
  suzanneGeometry = (res.scene!.getDescendantByName('Suzanne') as Mesh).geometry;

  textureUtil
    .loadTexture('assets/textures/hdr/pisa.hdr', {
      exposure: 2
    })
    .then((cubemap) => {
      cubemap.flipY = false;
      const ambientCubemapLight = new AmbientCubemapLight({
        cubemap
      });
      console.time('prefilter');
      ambientCubemapLight.prefilter(renderer, 256);
      console.timeEnd('prefilter');
      scene.add(ambientCubemapLight);

      const ambientLight = new AmbientLight({
        intensity: 0.5
      });
      scene.add(ambientLight);

      const skybox = new Skybox({
        environmentMap: ambientCubemapLight.cubemap
      });
      skybox.material.define('fragment', 'RGBM_DECODE');
      skybox.material.set('lod', 3.0);
      scene.skybox = skybox;

      for (let i = 0; i < 10; i++) {
        const material = new StandardMaterial({
          metalness: 1,
          roughness: i / 12
        });
        const mesh = new Mesh(suzanneGeometry, material);

        mesh.position.set((i - 5) * 2.1, 0, 0);
        scene.add(mesh);
      }

      renderer.render(scene, camera);
    });
});

const control = new OrbitControl({
  target: camera,
  domElement: renderer.canvas
});

startTimeline((deltaTime) => {
  control.update(deltaTime);
  renderer.render(scene, camera);
});

window.onresize = function () {
  renderer.resize(window.innerWidth, window.innerHeight);
  camera.aspect = renderer.getViewportAspect();
};
