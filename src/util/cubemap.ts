// Cubemap prefilter utility
// https://blog.selfshadow.com/publications/s2013-shading-course/#course_content
import Texture2D from '../Texture2D';
import TextureCube, { cubeTargets, TextureCubeOpts } from '../TextureCube';
import FrameBuffer from '../FrameBuffer';
import FullscreenQuadPass from '../FullscreenQuadPass';
import Material from '../Material';
import Shader from '../Shader';
import Scene from '../Scene';
import EnvironmentMapPass from '../prePass/EnvironmentMap';
import * as constants from '../core/constants';
import { panoramaToCubeMap } from './texture';

import Renderer from '../Renderer';
import { CLAMP_TO_EDGE } from '../core/constants';
import { integrateBRDFFragment } from './shader/integrateBRDF.glsl';
import { skyboxVertex } from '../shader/source/skybox.glsl';
import { cubemapPrefilterFragment } from './shader/prefilter.glsl';
import Mesh from '../Mesh';
import CubeGeometry from '../geometry/Cube';

// TODO Downsample
// TODO ggx
export function prefilterEnvironmentMap(
  renderer: Renderer,
  envMap: TextureCube | Texture2D,
  textureOpts: Partial<TextureCubeOpts> & {
    encodeRGBM?: boolean;
    decodeRGBM?: boolean;
  },
  normalDistribution?: Texture2D,
  brdfLookup?: Texture2D
) {
  // Not create other renderer, it is easy having issue of cross reference of resources like framebuffer
  // PENDING preserveDrawingBuffer?
  let newCreatedNormalDistribution = false;
  if (!brdfLookup || !normalDistribution) {
    normalDistribution = generateNormalDistribution();
    brdfLookup = integrateBRDF(renderer, normalDistribution);
    newCreatedNormalDistribution = true;
  }
  textureOpts = textureOpts || {};

  const width = textureOpts.width || 64;
  const height = textureOpts.height || 64;

  let textureType = textureOpts.type || envMap.type;

  // Use same type with given envMap
  const prefilteredCubeMap = new TextureCube({
    width,
    height,
    // Must use CLAMP_TO_EDGE
    wrapS: CLAMP_TO_EDGE,
    wrapT: CLAMP_TO_EDGE,
    type: textureType,
    flipY: false
  });

  if (!prefilteredCubeMap.isPowerOfTwo()) {
    console.warn('Width and height must be power of two to enable mipmap.');
  }

  const size = Math.min(width, height);
  const mipmapNum = Math.log(size) / Math.log(2) + 1;

  const prefilterMaterial = new Material(new Shader(skyboxVertex, cubemapPrefilterFragment));
  prefilterMaterial.set('normalDistribution', normalDistribution);

  textureOpts.encodeRGBM && prefilterMaterial.define('fragment', 'RGBM_ENCODE');
  textureOpts.decodeRGBM && prefilterMaterial.define('fragment', 'RGBM_DECODE');

  const dummyScene = new Scene();
  let newCreatedCubemap = false;

  if (envMap.textureType === 'texture2D') {
    // Convert panorama to cubemap
    const envCubemap = new TextureCube({
      width,
      height,
      // FIXME FLOAT type will cause GL_FRAMEBUFFER_INCOMPLETE_ATTACHMENT error on iOS
      type: textureType === constants.FLOAT ? constants.HALF_FLOAT : textureType
    });
    panoramaToCubeMap(renderer, envMap, envCubemap, {
      // PENDING encodeRGBM so it can be decoded as RGBM
      encodeRGBM: textureOpts.decodeRGBM
    });
    envMap = envCubemap;
    newCreatedCubemap = true;
  }
  const mesh = new Mesh(
    new CubeGeometry({
      inside: true
    }),
    prefilterMaterial
  );
  dummyScene.add(mesh);
  prefilterMaterial.set('environmentMap', envMap);

  const envMapPass = new EnvironmentMapPass({
    texture: prefilteredCubeMap
  });

  // Force to be UNSIGNED_BYTE
  if (textureOpts.encodeRGBM) {
    textureType = prefilteredCubeMap.type = constants.UNSIGNED_BYTE;
  }

  const frameBuffer = new FrameBuffer({
    depthBuffer: false
  });
  frameBuffer.autoGenerateMipmap = false;
  for (let i = 0; i < mipmapNum; i++) {
    prefilterMaterial.set('roughness', i / (mipmapNum - 1));

    // Tweak fov. TODO It will cause leaking on the edge in the latest chrome
    // http://the-witness.net/news/2012/02/seamless-cube-map-filtering/
    // const n = renderTargetTmp.width;
    // const fov = ((2 * Math.atan(n / (n - 0.5))) / Math.PI) * 180;
    const fov = 90;

    for (let j = 0; j < cubeTargets.length; j++) {
      frameBuffer.clearTextures();
      frameBuffer.mipmapLevel = i;
      frameBuffer.attach(
        prefilteredCubeMap,
        constants.COLOR_ATTACHMENT0,
        constants.TEXTURE_CUBE_MAP_POSITIVE_X + j
      );

      const camera = envMapPass.getCamera(cubeTargets[j]);
      camera.fov = fov;
      renderer.render(dummyScene, camera, frameBuffer);
    }
  }
  renderer.disposeFrameBuffer(frameBuffer);

  // renderer.disposeTexture(renderTargetTmp);
  renderer.disposeGeometry(mesh.geometry);
  if (newCreatedCubemap) {
    // New created temporary cubemap should be disposed
    renderer.disposeTexture(envMap);
  }
  if (newCreatedNormalDistribution) {
    renderer.disposeTexture(normalDistribution);
  }

  return {
    environmentMap: prefilteredCubeMap,
    brdfLookup,
    normalDistribution,
    maxMipmapLevel: mipmapNum
  };
}

export function integrateBRDF(renderer: Renderer, normalDistribution: Texture2D) {
  normalDistribution = normalDistribution || generateNormalDistribution();
  const framebuffer = new FrameBuffer({
    depthBuffer: false
  });
  const quadPass = new FullscreenQuadPass(integrateBRDFFragment);

  const texture = new Texture2D({
    width: 512,
    height: 256,
    type: constants.HALF_FLOAT,
    wrapS: constants.CLAMP_TO_EDGE,
    wrapT: constants.CLAMP_TO_EDGE,
    minFilter: constants.NEAREST,
    magFilter: constants.NEAREST,
    useMipmap: false
  });
  framebuffer.attach(texture);
  quadPass.material.set('normalDistribution', normalDistribution);
  quadPass.material.set('viewportSize', [512, 256]);
  quadPass.render(renderer, framebuffer);

  renderer.disposeFrameBuffer(framebuffer);

  return texture;
}

export function generateNormalDistribution(roughnessLevels?: number, sampleSize?: number) {
  // http://holger.dammertz.org/stuff/notes_HammersleyOnHemisphere.html
  // GLSL not support bit operation, use lookup instead
  // V -> i / N, U -> roughness
  roughnessLevels = roughnessLevels || 256;
  sampleSize = sampleSize || 1024;

  const normalDistribution = new Texture2D({
    type: constants.FLOAT,
    minFilter: constants.NEAREST,
    magFilter: constants.NEAREST,
    wrapS: constants.CLAMP_TO_EDGE,
    wrapT: constants.CLAMP_TO_EDGE,
    useMipmap: false
  });
  const pixels = new Float32Array(sampleSize * roughnessLevels * 4);
  const tmp = [];

  for (let j = 0; j < roughnessLevels; j++) {
    const roughness = j / roughnessLevels;
    const a = roughness * roughness;

    for (let i = 0; i < sampleSize; i++) {
      // http://holger.dammertz.org/stuff/notes_HammersleyOnHemisphere.html
      // http://stackoverflow.com/questions/1908492/unsigned-integer-in-javascript
      let y = ((i << 16) | (i >>> 16)) >>> 0;
      y = (((y & 1431655765) << 1) | ((y & 2863311530) >>> 1)) >>> 0;
      y = (((y & 858993459) << 2) | ((y & 3435973836) >>> 2)) >>> 0;
      y = (((y & 252645135) << 4) | ((y & 4042322160) >>> 4)) >>> 0;
      y = ((((y & 16711935) << 8) | ((y & 4278255360) >>> 8)) >>> 0) / 4294967296;

      // CDF
      const cosTheta = Math.sqrt((1 - y) / (1 + (a * a - 1.0) * y));
      tmp[i] = cosTheta;
    }

    for (let i = 0; i < sampleSize; i++) {
      const offset = (i * roughnessLevels + j) * 4;
      const cosTheta = tmp[i];
      const sinTheta = Math.sqrt(1.0 - cosTheta * cosTheta);
      const x = i / sampleSize;
      const phi = 2.0 * Math.PI * x;
      pixels[offset] = sinTheta * Math.cos(phi);
      pixels[offset + 1] = cosTheta;
      pixels[offset + 2] = sinTheta * Math.sin(phi);
      pixels[offset + 3] = 1.0;
    }
  }
  normalDistribution.source = {
    data: pixels,
    width: roughnessLevels,
    height: sampleSize
  };

  return normalDistribution;
}
