// Cubemap prefilter utility
// http://www.unrealengine.com/files/downloads/2013SiggraphPresentationsNotes.pdf
// http://http.developer.nvidia.com/GPUGems3/gpugems3_ch20.html
import Texture2D from '../Texture2D';
import TextureCube, { TextureCubeOpts } from '../TextureCube';
import Texture from '../Texture';
import FrameBuffer from '../FrameBuffer';
import CompositorFullscreenQuadPass from '../compositor/Pass';
import Material from '../Material';
import Shader from '../Shader';
import Skybox from '../plugin/Skybox';
import Scene from '../Scene';
import EnvironmentMapPass from '../prePass/EnvironmentMap';
import { panoramaToCubeMap } from './texture';

import integrateBRDFShaderCode from './shader/integrateBRDF.glsl.js';
import prefilterFragCode from './shader/prefilter.glsl.js';
import Renderer from '../Renderer';

const targets = ['px', 'nx', 'py', 'ny', 'pz', 'nz'] as const;

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
  if (!brdfLookup || !normalDistribution) {
    normalDistribution = generateNormalDistribution();
    brdfLookup = integrateBRDF(renderer, normalDistribution);
  }
  textureOpts = textureOpts || {};

  const width = textureOpts.width || 64;
  const height = textureOpts.height || 64;

  let textureType = textureOpts.type || envMap.type;

  // Use same type with given envMap
  const prefilteredCubeMap = new TextureCube({
    width,
    height,
    type: textureType,
    flipY: false
  });
  prefilteredCubeMap.mipmaps = [];

  if (!prefilteredCubeMap.isPowerOfTwo()) {
    console.warn('Width and height must be power of two to enable mipmap.');
  }

  const size = Math.min(width, height);
  const mipmapNum = Math.log(size) / Math.log(2) + 1;

  const prefilterMaterial = new Material({
    shader: new Shader({
      vertex: Shader.source('clay.skybox.vertex'),
      fragment: prefilterFragCode
    })
  });
  prefilterMaterial.set('normalDistribution', normalDistribution);

  textureOpts.encodeRGBM && prefilterMaterial.define('fragment', 'RGBM_ENCODE');
  textureOpts.decodeRGBM && prefilterMaterial.define('fragment', 'RGBM_DECODE');

  const dummyScene = new Scene();

  if (envMap.textureType === 'texture2D') {
    // Convert panorama to cubemap
    const envCubemap = new TextureCube({
      width,
      height,
      // FIXME FLOAT type will cause GL_FRAMEBUFFER_INCOMPLETE_ATTACHMENT error on iOS
      type: textureType === Texture.FLOAT ? Texture.HALF_FLOAT : textureType
    });
    panoramaToCubeMap(renderer, envMap, envCubemap, {
      // PENDING encodeRGBM so it can be decoded as RGBM
      encodeRGBM: textureOpts.decodeRGBM
    });
    envMap = envCubemap;
  }
  const skyEnv = new Skybox({
    scene: dummyScene,
    material: prefilterMaterial
  });
  skyEnv.material.set('environmentMap', envMap);

  const envMapPass = new EnvironmentMapPass({
    texture: prefilteredCubeMap
  });

  // Force to be UNSIGNED_BYTE
  if (textureOpts.encodeRGBM) {
    textureType = prefilteredCubeMap.type = Texture.UNSIGNED_BYTE;
  }

  const renderTargetTmp = new Texture2D({
    width,
    height,
    type: textureType
  });
  const frameBuffer = new FrameBuffer({
    depthBuffer: false
  });
  const ArrayCtor = textureType === Texture.UNSIGNED_BYTE ? Uint8Array : Float32Array;

  // const container = document.createElement('div');
  // document.body.appendChild(container);
  // container.style.cssText = 'position: absolute; left: 0; top: 0;';

  for (let i = 0; i < mipmapNum; i++) {
    prefilteredCubeMap.mipmaps[i] = {
      pixels: {} as TextureCubeOpts['pixels']
    };
    skyEnv.material.set('roughness', i / (mipmapNum - 1));

    // Tweak fov
    // http://the-witness.net/news/2012/02/seamless-cube-map-filtering/
    const n = renderTargetTmp.width;
    const fov = ((2 * Math.atan(n / (n - 0.5))) / Math.PI) * 180;

    for (let j = 0; j < targets.length; j++) {
      const pixels = new ArrayCtor(renderTargetTmp.width * renderTargetTmp.height * 4);
      frameBuffer.attach(renderTargetTmp);
      frameBuffer.bind(renderer);

      const camera = envMapPass.getCamera(targets[j]);
      camera.fov = fov;
      renderer.render(dummyScene, camera);
      renderer.gl.readPixels(
        0,
        0,
        renderTargetTmp.width,
        renderTargetTmp.height,
        Texture.RGBA,
        textureType,
        pixels
      );

      // const canvas = document.createElement('canvas');
      // const ctx = canvas.getContext('2d')!;
      // canvas.width = renderTargetTmp.width;
      // canvas.height = renderTargetTmp.height;
      // const imageData = ctx.createImageData(renderTargetTmp.width, renderTargetTmp.height);
      // for (let k = 0; k < pixels.length; k++) {
      //   imageData.data[k] = pixels[k];
      // }
      // ctx.putImageData(imageData, 0, 0);
      // container.appendChild(canvas);

      frameBuffer.unbind(renderer);
      prefilteredCubeMap.mipmaps[i].pixels![targets[j]] = pixels;
    }

    renderTargetTmp.width /= 2;
    renderTargetTmp.height /= 2;
    renderTargetTmp.dirty();
  }

  frameBuffer.dispose(renderer);
  renderTargetTmp.dispose(renderer);
  skyEnv.dispose(renderer);
  // Remove gpu resource allucated in renderer
  normalDistribution.dispose(renderer);

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
  const quadPass = new CompositorFullscreenQuadPass(integrateBRDFShaderCode);

  const texture = new Texture2D({
    width: 512,
    height: 256,
    type: Texture.HALF_FLOAT,
    wrapS: Texture.CLAMP_TO_EDGE,
    wrapT: Texture.CLAMP_TO_EDGE,
    minFilter: Texture.NEAREST,
    magFilter: Texture.NEAREST,
    useMipmap: false
  });
  quadPass.setUniform('normalDistribution', normalDistribution);
  quadPass.setUniform('viewportSize', [512, 256]);
  quadPass.attachOutput(texture);
  quadPass.render(renderer, framebuffer);

  // FIXME Only chrome and firefox can readPixels with float type.
  // framebuffer.bind(renderer);
  // const pixels = new Float32Array(512 * 256 * 4);
  // renderer.gl.readPixels(
  //     0, 0, texture.width, texture.height,
  //     Texture.RGBA, Texture.FLOAT, pixels
  // );
  // texture.pixels = pixels;
  // texture.flipY = false;
  // texture.dirty();
  // framebuffer.unbind(renderer);

  framebuffer.dispose(renderer);

  return texture;
}

export function generateNormalDistribution(roughnessLevels?: number, sampleSize?: number) {
  // http://holger.dammertz.org/stuff/notes_HammersleyOnHemisphere.html
  // GLSL not support bit operation, use lookup instead
  // V -> i / N, U -> roughness
  roughnessLevels = roughnessLevels || 256;
  sampleSize = sampleSize || 1024;

  const normalDistribution = new Texture2D({
    width: roughnessLevels,
    height: sampleSize,
    type: Texture.FLOAT,
    minFilter: Texture.NEAREST,
    magFilter: Texture.NEAREST,
    wrapS: Texture.CLAMP_TO_EDGE,
    wrapT: Texture.CLAMP_TO_EDGE,
    useMipmap: false
  });
  const pixels = new Float32Array(sampleSize * roughnessLevels * 4);
  const tmp = [];

  // function sortFunc(a, b) {
  //     return Math.abs(b) - Math.abs(a);
  // }
  for (let j = 0; j < roughnessLevels; j++) {
    const roughness = j / roughnessLevels;
    const a = roughness * roughness;

    for (let i = 0; i < sampleSize; i++) {
      // http://holger.dammertz.org/stuff/notes_HammersleyOnHemisphere.html
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Bitwise_Operators
      // http://stackoverflow.com/questions/1908492/unsigned-integer-in-javascript
      // http://stackoverflow.com/questions/1822350/what-is-the-javascript-operator-and-how-do-you-use-it
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
  normalDistribution.pixels = pixels;

  return normalDistribution;
}
