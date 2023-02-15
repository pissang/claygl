import {
  Renderer,
  PerspectiveCamera,
  DeferredRenderer,
  Scene,
  loadGLTF,
  TextureCube,
  textureUtil,
  AmbientCubemapLight,
  AmbientSHLight,
  Skybox,
  StandardMaterial,
  Mesh,
  OrbitControl,
  startTimeline,
  constants
} from 'claygl';
const renderer = new Renderer({
  canvas: document.getElementById('main') as HTMLCanvasElement
});
renderer.resize(window.innerWidth, window.innerHeight);
const camera = new PerspectiveCamera({
  aspect: renderer.getViewportAspect()
});
camera.position.set(0, 0, 6);

const deferredRenderer = new DeferredRenderer();

var scene = new Scene();

loadGLTF('assets/models/suzanne/suzanne_high.gltf').then((res) => {
  const suzanneGeometry = (res.scene!.getDescendantByName('Suzanne') as Mesh).geometry;

  const cubemap = new TextureCube({
    type: constants.HALF_FLOAT,
    width: 128,
    height: 128
  });
  textureUtil
    .loadPanorama(renderer, 'assets/textures/hdr/pisa.hdr', cubemap, {
      exposure: 1,
      flipY: false
    })
    .then(() => {
      const ambientCubemapLight = new AmbientCubemapLight({
        cubemap: cubemap
      });
      ambientCubemapLight.prefilter(renderer);
      scene.add(ambientCubemapLight);

      const ambientSHLight = new AmbientSHLight({
        coefficients: [
          0.8450393676757812, 0.7135089635848999, 0.6934053897857666, 0.02310405671596527,
          0.17135757207870483, 0.28332242369651794, 0.343019962310791, 0.2880895435810089,
          0.2998031973838806, 0.08001846075057983, 0.10719859600067139, 0.12824314832687378,
          0.003927173092961311, 0.04206192493438721, 0.06470289081335068, 0.036095526069402695,
          0.04928380250930786, 0.058642253279685974, -0.009344635531306267, 0.06963406503200531,
          0.1312279999256134, -0.05935414880514145, -0.04865729808807373, -0.060036804527044296,
          0.04625355824828148, 0.0563165508210659, 0.050963230431079865
        ],
        intensity: 0.5
      });
      scene.add(ambientSHLight);

      const skybox = new Skybox({
        environmentMap: ambientCubemapLight.cubemap
      });
      skybox.material.define('fragment', 'RGBM_DECODE');
      skybox.material.set('lod', 3.0);
      scene.skybox = skybox;

      for (var i = 0; i < 10; i++) {
        var material = new StandardMaterial({
          metalness: 0,
          // color: [0.7, 0.0, 0.0],
          roughness: i / 12
        });
        var mesh = new Mesh(suzanneGeometry, material);
        mesh.position.set((i - 5) * 2.5, 0, 0);
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
  deferredRenderer.render(renderer, scene, camera);
});

window.onresize = function () {
  renderer.resize(window.innerWidth, window.innerHeight);
  camera.aspect = renderer.getViewportAspect();
};
