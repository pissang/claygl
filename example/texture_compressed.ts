import {
  Shader,
  Renderer,
  Mesh,
  Material,
  PlaneGeometry,
  Scene,
  Texture2D,
  constants,
  VertexShader,
  glsl,
  Camera
} from 'claygl';
import { outputTextureFragment } from 'claygl/shaders';

import { parse as parseKTX } from '../src/util/ktx';

const vertexShader = new VertexShader({
  name: 'vertex',
  uniforms: {
    MVP: Shader.semanticUniform('mat4', 'WORLDVIEWPROJECTION')
  },
  attributes: {
    pos: Shader.attribute('vec3', 'POSITION'),
    uv: Shader.attribute('vec2', 'TEXCOORD_0')
  },
  varyings: {
    v_Texcoord: Shader.varying('vec2')
  },
  main: glsl`
void main() {
  v_Texcoord = uv;
  gl_Position = MVP * vec4(pos, 1.0);
}
`
});

const canvas = document.querySelector('canvas')!;
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

const shader = new Shader(vertexShader, outputTextureFragment);
const planeGeo = new PlaneGeometry();
function createRect(texture: Texture2D, x: number, y: number, width: number, height: number) {
  const mat = new Material(shader);
  mat.set('colorTex', texture);
  const mesh = new Mesh(planeGeo, mat, {
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
const camera = new Camera('orthographic');

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
        source: textCanvas,
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
    tex.load(url).then(() => {
      create(tex);
    });
  } else {
    fetch(url)
      .then((res) => res.arrayBuffer())
      .then((ab) => {
        const res = parseKTX(ab)!;
        create(
          new Texture2D({
            source: res.source,
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
