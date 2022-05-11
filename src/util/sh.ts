// Spherical Harmonic Helpers
import Texture from '../Texture';
import FrameBuffer from '../FrameBuffer';
import Texture2D from '../Texture2D';
import Skybox from '../plugin/Skybox';
import EnvironmentMapPass from '../prePass/EnvironmentMap';
import Scene from '../Scene';
import * as vec3 from '../glmatrix/vec3';
import * as constants from '../core/constants';

import projectEnvMapShaderCode from './shader/projectEnvMap.glsl.js';
import FullscreenQuadPass from '../composite/Pass';
import type Renderer from '../Renderer';
import TextureCube, { CubeTarget, cubeTargets } from '../TextureCube';

// Project on gpu, but needs browser to support readPixels as Float32Array.
function projectEnvironmentMapGPU(renderer: Renderer, envMap: TextureCube) {
  const shTexture = new Texture2D({
    width: 9,
    height: 1,
    type: constants.FLOAT
  });
  const pass = new FullscreenQuadPass(projectEnvMapShaderCode);
  pass.material!.define('fragment', 'TEXTURE_SIZE', envMap.width);
  pass.setUniform('environmentMap', envMap);

  const framebuffer = new FrameBuffer();
  framebuffer.attach(shTexture);
  pass.render(renderer, framebuffer);

  framebuffer.bind(renderer);
  // TODO Only chrome and firefox support Float32Array
  const pixels = new Float32Array(9 * 4);
  renderer.gl.readPixels(0, 0, 9, 1, constants.RGBA, constants.FLOAT, pixels);

  const coeff = new Float32Array(9 * 3);
  for (let i = 0; i < 9; i++) {
    coeff[i * 3] = pixels[i * 4];
    coeff[i * 3 + 1] = pixels[i * 4 + 1];
    coeff[i * 3 + 2] = pixels[i * 4 + 2];
  }
  framebuffer.unbind(renderer);

  framebuffer.dispose(renderer);
  pass.dispose(renderer);
  return coeff;
}

function harmonics(normal: vec3.Vec3Array, index: number) {
  const x = normal[0];
  const y = normal[1];
  const z = normal[2];

  switch (index) {
    case 0:
      return 1.0;
    case 1:
      return x;
    case 2:
      return y;
    case 3:
      return z;
    case 4:
      return x * z;
    case 5:
      return y * z;
    case 6:
      return x * y;
    case 7:
      return 3.0 * z * z - 1.0;
    default:
      return x * x - y * y;
  }
}

const normalTransform = {
  px: [2, 1, 0, -1, -1, 1],
  nx: [2, 1, 0, 1, -1, -1],
  py: [0, 2, 1, 1, -1, -1],
  ny: [0, 2, 1, 1, 1, 1],
  pz: [0, 1, 2, -1, -1, -1],
  nz: [0, 1, 2, 1, -1, 1]
};

// Project on cpu.
function projectEnvironmentMapCPU(
  renderer: Renderer,
  cubePixels: Record<CubeTarget, Uint8Array>,
  width: number,
  height: number
) {
  const coeff = new Float32Array(9 * 3);
  const normal = vec3.create();
  const texel = vec3.create();
  const fetchNormal = vec3.create();
  for (let m = 0; m < 9; m++) {
    const result = vec3.create();
    for (let k = 0; k < cubeTargets.length; k++) {
      const pixels = cubePixels[cubeTargets[k]];

      const sideResult = vec3.create();
      let divider = 0;
      let i = 0;
      const transform = normalTransform[cubeTargets[k]];
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          normal[0] = (x / (width - 1.0)) * 2.0 - 1.0;
          // TODO Flip y?
          normal[1] = (y / (height - 1.0)) * 2.0 - 1.0;
          normal[2] = -1.0;
          vec3.normalize(normal, normal);

          fetchNormal[0] = normal[transform[0]] * transform[3];
          fetchNormal[1] = normal[transform[1]] * transform[4];
          fetchNormal[2] = normal[transform[2]] * transform[5];

          texel[0] = pixels[i++] / 255;
          texel[1] = pixels[i++] / 255;
          texel[2] = pixels[i++] / 255;
          // RGBM Decode
          const scale = (pixels[i++] / 255) * 8.12;
          texel[0] *= scale;
          texel[1] *= scale;
          texel[2] *= scale;

          vec3.scaleAndAdd(sideResult, sideResult, texel, harmonics(fetchNormal, m) * -normal[2]);
          // -normal.z equals cos(theta) of Lambertian
          divider += -normal[2];
        }
      }
      vec3.scaleAndAdd(result, result, sideResult, 1 / divider);
    }

    coeff[m * 3] = result[0] / 6.0;
    coeff[m * 3 + 1] = result[1] / 6.0;
    coeff[m * 3 + 2] = result[2] / 6.0;
  }
  return coeff;
}

export function projectEnvironmentMap(
  renderer: Renderer,
  envMap: Texture2D | TextureCube,
  opts?: {
    decodeRGBM?: boolean;
    lod?: number;
  }
) {
  // TODO sRGB

  opts = opts || {};
  opts.lod = opts.lod || 0;

  let skybox;
  const dummyScene = new Scene();
  let size = 64;
  if (envMap.textureType === 'texture2D') {
    skybox = new Skybox({
      scene: dummyScene,
      environmentMap: envMap
    });
  } else {
    size = envMap.image && envMap.image.px ? envMap.image.px.width : envMap.width;
    skybox = new Skybox({
      scene: dummyScene,
      environmentMap: envMap
    });
  }
  // Convert to rgbm
  const width = Math.ceil(size / Math.pow(2, opts.lod));
  const height = Math.ceil(size / Math.pow(2, opts.lod));
  const rgbmTexture = new Texture2D({
    width: width,
    height: height
  });
  const framebuffer = new FrameBuffer();
  skybox.material.define('fragment', 'RGBM_ENCODE');
  if (opts.decodeRGBM) {
    skybox.material.define('fragment', 'RGBM_DECODE');
  }
  skybox.material.set('lod', opts.lod);
  const envMapPass = new EnvironmentMapPass();
  const cubePixels = {} as Record<CubeTarget, Uint8Array>;
  for (let i = 0; i < cubeTargets.length; i++) {
    cubePixels[cubeTargets[i]] = new Uint8Array(width * height * 4);
    const camera = envMapPass.getCamera(cubeTargets[i]);
    camera.fov = 90;
    framebuffer.attach(rgbmTexture);
    framebuffer.bind(renderer);
    renderer.render(dummyScene, camera);
    renderer.gl.readPixels(
      0,
      0,
      width,
      height,
      constants.RGBA,
      constants.UNSIGNED_BYTE,
      cubePixels[cubeTargets[i]]
    );
    framebuffer.unbind(renderer);
  }

  skybox.dispose(renderer);
  framebuffer.dispose(renderer);
  rgbmTexture.dispose(renderer);

  return projectEnvironmentMapCPU(renderer, cubePixels, width, height);
}
