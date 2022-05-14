import {
  Shader,
  Renderer,
  Mesh,
  Material,
  PlaneGeometry,
  Scene,
  OrthographicCamera,
  Texture2D,
  constants
} from 'claygl';

import { parse as parseKTX } from '../src/util/ktx';

const canvas = document.querySelector('canvas')!;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const shader = new Shader(
  Shader.source('clay.compositor.vertex'),
  Shader.source('clay.compositor.output')
);
const planeGeo = new PlaneGeometry();
function createRect(texture: Texture2D, x: number, y: number, width: number, height: number) {
  const mat = new Material({ shader });
  mat.set('texture', texture);
  const mesh = new Mesh({
    geometry: planeGeo,
    material: mat,
    culling: false
  });
  const sx = width / canvas.width;
  const sy = height / canvas.height;
  mesh.position.set((x / canvas.width) * 2.0 - 1.0 + sx, 1.0 - (y / canvas.height) * 2.0 - sy, 0);
  mesh.scale.set(sx, -sy, 1);

  return mesh;
}

const renderer = new Renderer({ canvas });
const scene = new Scene();
const camera = new OrthographicCamera();

let x = 0;
let y = 10;
let size = 128;
let marginX = 50;
let marginY = 50;
[
  ['test.png', 'Reference(PNG)'],
  ['test-pvr.ktx', 'pvrtc'],
  ['test-etc.ktx', 'etc1'],
  ['test-s3tc.ktx', 's3tc']
].forEach((obj) => {
  const isReference = obj[0].match(/png$/);
  const url = 'assets/textures/compressed/' + obj[0];
  const localX = x;
  const localY = y;
  x += size + marginX;
  if (x + size > canvas.width || isReference) {
    x = 0;
    y += size + marginY;
  }
  function create(tex: Texture2D) {
    const textCanvas = document.createElement('canvas');
    const ctx = textCanvas.getContext('2d')!;
    ctx.font = '30px sans-serif';
    let width = ctx.measureText(obj[1]).width;
    textCanvas.width = width;
    textCanvas.height = 40;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = '30px sans-serif';
    ctx.fillText(obj[1], 0, 0);

    const textMesh = createRect(
      new Texture2D({
        image: textCanvas,
        flipY: false
      }),
      localX,
      localY,
      textCanvas.width,
      textCanvas.height
    );

    const mesh = createRect(tex, localX, localY + textCanvas.height, size, size);
    scene.add(textMesh);
    scene.add(mesh);
  }
  if (isReference) {
    const tex = new Texture2D({
      minFilter: constants.LINEAR,
      magFilter: constants.LINEAR,
      useMipmap: false,
      flipY: false
    });
    tex.load(url).onload(() => {
      create(tex);
    });
  } else {
    fetch(url)
      .then((res) => res.arrayBuffer())
      .then((ab) => {
        const res = parseKTX(ab)!;
        create(
          new Texture2D({
            pixels: res.pixels,
            width: res.width,
            height: res.height,
            format: res.format,
            minFilter: constants.LINEAR,
            magFilter: constants.LINEAR,
            useMipmap: false
          })
        );
      });
  }
});
function update() {
  renderer.render(scene, camera);
  requestAnimationFrame(update);
}
update();
