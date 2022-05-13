import Texture2D from '../Texture2D';
import Texture from '../Texture';
import Material from '../Material';
import FrameBuffer from '../FrameBuffer';
import Shader from '../Shader';
import FullscreenQuadPass from '../composite/Pass';
import Matrix4 from '../math/Matrix4';
import * as mat4 from '../glmatrix/mat4';
import * as constants from '../core/constants';

import gbufferEssl from '../shader/source/deferred/gbuffer.glsl.js';
import chunkEssl from '../shader/source/deferred/chunk.glsl.js';
import Renderer, { RenderableObject, RendererViewport } from '../Renderer';
import Camera from '../Camera';
import Scene from '../Scene';
import { assign, optional } from '../core/util';
import { importSharedShader } from '../shader/shared';

importSharedShader();

Shader.import(gbufferEssl);
Shader.import(chunkEssl);

const renderableGBufferData = new WeakMap<
  RenderableObject,
  {
    prevSkinMatricesTexture?: Texture2D;
    prevSkinMatricesArray?: Float32Array;
    prevWorldViewProjection?: mat4.Mat4Array;
  }
>();

function createFillCanvas(color: string) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 1;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = color || '#000';
  ctx.fillRect(0, 0, 1, 1);

  return canvas;
}

// TODO specularColor
// TODO Performance improvement
function getGetUniformHook1(
  defaultNormalMap: Texture2D,
  defaultRoughnessMap: Texture2D,
  defaultDiffuseMap: Texture2D
) {
  return function (renderable: RenderableObject, gBufferMat: Material, symbol: string) {
    const standardMaterial = renderable.material;
    if (symbol === 'doubleSided') {
      return standardMaterial.isDefined('fragment', 'DOUBLE_SIDED');
    } else if (symbol === 'uvRepeat' || symbol === 'uvOffset' || symbol === 'alpha') {
      return standardMaterial.get(symbol);
    } else if (symbol === 'normalMap') {
      return standardMaterial.get(symbol) || defaultNormalMap;
    } else if (symbol === 'diffuseMap') {
      return standardMaterial.get(symbol) || defaultDiffuseMap;
    } else if (symbol === 'alphaCutoff') {
      // TODO DIFFUSEMAP_ALPHA_ALPHA
      if (standardMaterial.isDefined('fragment', 'ALPHA_TEST')) {
        const alphaCutoff = standardMaterial.get('alphaCutoff');
        return alphaCutoff || 0;
      }
      return 0;
    } else {
      const useRoughnessWorkflow = standardMaterial.isDefined('fragment', 'USE_ROUGHNESS');
      const roughGlossMap = useRoughnessWorkflow
        ? standardMaterial.get('roughnessMap')
        : standardMaterial.get('glossinessMap');
      switch (symbol) {
        case 'glossiness':
          return useRoughnessWorkflow
            ? 1.0 - standardMaterial.get('roughness')
            : standardMaterial.get('glossiness');
        case 'roughGlossMap':
          return roughGlossMap;
        case 'useRoughGlossMap':
          return !!roughGlossMap;
        case 'useRoughness':
          return useRoughnessWorkflow;
        case 'roughGlossChannel':
          return useRoughnessWorkflow
            ? standardMaterial.getDefine('fragment', 'ROUGHNESS_CHANNEL')
            : standardMaterial.getDefine('fragment', 'GLOSSINESS_CHANNEL');
      }
    }
  };
}

function getGetUniformHook2(defaultDiffuseMap: Texture2D, defaultMetalnessMap: Texture2D) {
  return function (renderable: RenderableObject, gBufferMat: Material, symbol: string) {
    const standardMaterial = renderable.material;
    switch (symbol) {
      case 'color':
      case 'uvRepeat':
      case 'uvOffset':
      case 'alpha':
        return standardMaterial.get(symbol);
      case 'metalness':
        return standardMaterial.get('metalness') || 0;
      case 'diffuseMap':
        return standardMaterial.get(symbol) || defaultDiffuseMap;
      case 'metalnessMap':
        return standardMaterial.get(symbol) || defaultMetalnessMap;
      case 'useMetalnessMap':
        return !!standardMaterial.get('metalnessMap');
      case 'linear':
        return standardMaterial.isDefined('fragment', 'SRGB_DECODE');
      case 'alphaCutoff':
        // TODO DIFFUSEMAP_ALPHA_ALPHA
        if (standardMaterial.isDefined('fragment', 'ALPHA_TEST')) {
          const alphaCutoff = standardMaterial.get('alphaCutoff');
          return alphaCutoff || 0.0;
        }
        return 0.0;
    }
  };
}

const commonTextureOpts = {
  minFilter: constants.NEAREST,
  magFilter: constants.NEAREST,
  wrapS: constants.CLAMP_TO_EDGE,
  wrapT: constants.CLAMP_TO_EDGE
} as const;

export interface DeferredGBufferOpts {
  /**
   * If enable gbuffer texture 1.
   */
  enableTargetTexture1: boolean;

  /**
   * If enable gbuffer texture 2.
   */
  enableTargetTexture2: boolean;

  /**
   * If enable gbuffer texture 3.
   */
  enableTargetTexture3: boolean;

  /**
   * If enable gbuffer texture 4.
   */
  enableTargetTexture4: boolean;

  renderTransparent: boolean;
}

interface DeferredGBuffer extends DeferredGBufferOpts {}
/**
 * GBuffer is provided for deferred rendering and SSAO, SSR pass.
 * It will do three passes rendering to four target textures. See
 * + {@link clay.DeferredGBuffer#getTargetTexture1}
 * + {@link clay.DeferredGBuffer#getTargetTexture2}
 * + {@link clay.DeferredGBuffer#getTargetTexture3}
 * + {@link clay.DeferredGBuffer#getTargetTexture4}
 * @constructor
 * @alias clay.deferred.GBuffer
 * @extends clay.core.Base
 */
class DeferredGBuffer {
  private _gBufferRenderList: RenderableObject[] = [];
  // - R: normal.x
  // - G: normal.y
  // - B: normal.z
  // - A: glossiness
  private _gBufferTex1 = new Texture2D(
    assign(
      {
        // PENDING
        type: constants.HALF_FLOAT_OES
      },
      commonTextureOpts
    )
  );

  // - R: depth
  private _gBufferTex2 = new Texture2D(
    assign(
      {
        // format: constants.DEPTH_COMPONENT,
        // type: constants.UNSIGNED_INT

        format: constants.DEPTH_STENCIL,
        type: constants.UNSIGNED_INT_24_8_WEBGL
      },
      commonTextureOpts
    )
  );

  // - R: albedo.r
  // - G: albedo.g
  // - B: albedo.b
  // - A: metalness
  private _gBufferTex3 = new Texture2D(commonTextureOpts);

  private _gBufferTex4 = new Texture2D(
    assign(
      {
        // FLOAT Texture has bug on iOS. is HALF_FLOAT enough?
        type: constants.HALF_FLOAT_OES
      },
      commonTextureOpts
    )
  );

  private _defaultNormalMap = new Texture2D({
    image: createFillCanvas('#000')
  });
  private _defaultRoughnessMap = new Texture2D({
    image: createFillCanvas('#fff')
  });
  private _defaultMetalnessMap = new Texture2D({
    image: createFillCanvas('#fff')
  });
  private _defaultDiffuseMap = new Texture2D({
    image: createFillCanvas('#fff')
  });

  private _frameBuffer = new FrameBuffer();

  private _gBufferMaterial1 = new Material({
    shader: new Shader(
      Shader.source('clay.deferred.gbuffer.vertex'),
      Shader.source('clay.deferred.gbuffer1.fragment')
    ),
    vertexDefines: {
      FIRST_PASS: null
    },
    fragmentDefines: {
      FIRST_PASS: null
    }
  });
  private _gBufferMaterial2 = new Material({
    shader: new Shader(
      Shader.source('clay.deferred.gbuffer.vertex'),
      Shader.source('clay.deferred.gbuffer2.fragment')
    ),
    vertexDefines: {
      SECOND_PASS: null
    },
    fragmentDefines: {
      SECOND_PASS: null
    }
  });
  private _gBufferMaterial3 = new Material({
    shader: new Shader(
      Shader.source('clay.deferred.gbuffer.vertex'),
      Shader.source('clay.deferred.gbuffer3.fragment')
    ),
    vertexDefines: {
      THIRD_PASS: null
    },
    fragmentDefines: {
      THIRD_PASS: null
    }
  });

  private _debugPass = new FullscreenQuadPass(Shader.source('clay.deferred.gbuffer.debug'));

  constructor(opts?: Partial<DeferredGBufferOpts>) {
    opts = opts || {};
    this.enableTargetTexture1 = optional(opts.enableTargetTexture1, true);
    this.enableTargetTexture2 = optional(opts.enableTargetTexture2, true);
    this.enableTargetTexture3 = optional(opts.enableTargetTexture3, true);
    this.enableTargetTexture4 = optional(opts.enableTargetTexture4, false);
    this.renderTransparent = optional(opts.renderTransparent, false);
  }
  /**
   * Set G Buffer size.
   * @param {number} width
   * @param {number} height
   */
  resize(width: number, height: number) {
    if (this._gBufferTex1.width === width && this._gBufferTex1.height === height) {
      return;
    }
    this._gBufferTex1.width = width;
    this._gBufferTex1.height = height;

    this._gBufferTex2.width = width;
    this._gBufferTex2.height = height;

    this._gBufferTex3.width = width;
    this._gBufferTex3.height = height;

    this._gBufferTex4.width = width;
    this._gBufferTex4.height = height;
  }

  // TODO is dpr needed?
  setViewport(x: RendererViewport): void;
  setViewport(x: number, y: number, width: number, height: number, dpr?: number): void;
  setViewport(
    x: number | RendererViewport,
    y?: number,
    width?: number,
    height?: number,
    dpr?: number
  ) {
    let viewport;
    if (typeof x === 'object') {
      viewport = x;
    } else {
      viewport = {
        x: x,
        y: y,
        width: width,
        height: height,
        devicePixelRatio: dpr || 1
      };
    }
    this._frameBuffer.viewport = viewport as RendererViewport;
  }

  getViewport() {
    if (this._frameBuffer.viewport) {
      return this._frameBuffer.viewport;
    } else {
      return {
        x: 0,
        y: 0,
        width: this._gBufferTex1.width,
        height: this._gBufferTex1.height,
        devicePixelRatio: 1
      };
    }
  }

  /**
   * Update GBuffer
   * @param {clay.Renderer} renderer
   * @param {clay.Scene} scene
   * @param {clay.Camera} camera
   * @param {Object} opts
   */
  update(
    renderer: Renderer,
    scene: Scene,
    camera: Camera,
    opts?: {
      targetTexture1?: Texture2D;
      targetTexture2?: Texture2D;
      targetTexture3?: Texture2D;
      targetTexture4?: Texture2D;
    }
  ) {
    opts = opts || {};

    const gl = renderer.gl;

    const frameBuffer = this._frameBuffer;
    const viewport = frameBuffer.viewport;

    const renderList = scene.updateRenderList(camera, true);

    const opaqueList = renderList.opaque;
    const transparentList = renderList.transparent;

    let offset = 0;
    const gBufferRenderList = this._gBufferRenderList;
    for (let i = 0; i < opaqueList.length; i++) {
      if (!opaqueList[i].ignoreGBuffer) {
        gBufferRenderList[offset++] = opaqueList[i];
      }
    }
    if (this.renderTransparent) {
      for (let i = 0; i < transparentList.length; i++) {
        if (!transparentList[i].ignoreGBuffer) {
          gBufferRenderList[offset++] = transparentList[i];
        }
      }
    }
    gBufferRenderList.length = offset;

    gl.clearColor(0, 0, 0, 0);
    gl.depthMask(true);
    gl.colorMask(true, true, true, true);
    gl.disable(gl.BLEND);

    let enableTargetTexture1 = this.enableTargetTexture1;
    const enableTargetTexture2 = this.enableTargetTexture2;
    const enableTargetTexture3 = this.enableTargetTexture3;
    const enableTargetTexture4 = this.enableTargetTexture4;
    if (!enableTargetTexture1 && !enableTargetTexture3 && !enableTargetTexture4) {
      console.warn("Can't disable targetTexture1, targetTexture3, targetTexture4 both");
      enableTargetTexture1 = true;
    }

    if (enableTargetTexture2) {
      frameBuffer.attach(
        opts.targetTexture2 || this._gBufferTex2,
        renderer.gl.DEPTH_STENCIL_ATTACHMENT
      );
    }

    function clearViewport() {
      if (viewport) {
        const dpr = viewport.devicePixelRatio;
        // use scissor to make sure only clear the viewport
        gl.enable(gl.SCISSOR_TEST);
        gl.scissor(viewport.x * dpr, viewport.y * dpr, viewport.width * dpr, viewport.height * dpr);
      }
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      if (viewport) {
        gl.disable(gl.SCISSOR_TEST);
      }
    }

    function isMaterialChanged(renderable: RenderableObject, prevRenderable: RenderableObject) {
      return renderable.material !== prevRenderable.material;
    }

    // PENDING, scene.boundingBoxLastFrame needs be updated if have shadow
    renderer.bindSceneRendering(scene);
    if (enableTargetTexture1) {
      // Pass 1
      frameBuffer.attach(opts.targetTexture1 || this._gBufferTex1);
      frameBuffer.bind(renderer);

      clearViewport();

      const gBufferMaterial1 = this._gBufferMaterial1;
      const passConfig = {
        getMaterial() {
          return gBufferMaterial1;
        },
        getUniform: getGetUniformHook1(
          this._defaultNormalMap,
          this._defaultRoughnessMap,
          this._defaultDiffuseMap
        ),
        isMaterialChanged: isMaterialChanged,
        sortCompare: Renderer.opaqueSortCompare
      };
      // FIXME Use MRT if possible
      renderer.renderPass(gBufferRenderList, camera, passConfig);
    }
    if (enableTargetTexture3) {
      // Pass 2
      frameBuffer.attach(opts.targetTexture3 || this._gBufferTex3);
      frameBuffer.bind(renderer);

      clearViewport();

      const gBufferMaterial2 = this._gBufferMaterial2;
      const passConfig = {
        getMaterial() {
          return gBufferMaterial2;
        },
        getUniform: getGetUniformHook2(this._defaultDiffuseMap, this._defaultMetalnessMap),
        isMaterialChanged: isMaterialChanged,
        sortCompare: Renderer.opaqueSortCompare
      };
      renderer.renderPass(gBufferRenderList, camera, passConfig);
    }

    if (enableTargetTexture4) {
      frameBuffer.bind(renderer);
      frameBuffer.attach(opts.targetTexture4 || this._gBufferTex4);

      clearViewport();

      // Remove jittering in temporal aa.
      // PENDING. Better solution?
      camera.update();

      const gBufferMaterial3 = this._gBufferMaterial3;
      const cameraViewProj = mat4.create();
      mat4.multiply(cameraViewProj, camera.projectionMatrix.array, camera.viewMatrix.array);
      const passConfig = {
        getMaterial() {
          return gBufferMaterial3;
        },
        afterRender(renderer: Renderer, renderable: RenderableObject) {
          let gbufferData = renderableGBufferData.get(renderable);
          if (!gbufferData) {
            gbufferData = {};
            renderableGBufferData.set(renderable, gbufferData);
          }
          const isSkinnedMesh = renderable.isSkinnedMesh && renderable.isSkinnedMesh();
          if (isSkinnedMesh) {
            const skeleton = renderable.skeleton;
            const joints = renderable.joints;
            if (joints.length > renderer.getMaxJointNumber()) {
              const skinMatricesTexture = skeleton.getSubSkinMatricesTexture(
                renderable.__uid__,
                joints
              );
              let prevSkinMatricesTexture = gbufferData.prevSkinMatricesTexture;
              if (!prevSkinMatricesTexture) {
                prevSkinMatricesTexture = gbufferData.prevSkinMatricesTexture = new Texture2D({
                  type: constants.FLOAT,
                  minFilter: constants.NEAREST,
                  magFilter: constants.NEAREST,
                  useMipmap: false,
                  flipY: false
                });
              }
              if (
                !prevSkinMatricesTexture.pixels ||
                prevSkinMatricesTexture.pixels.length !== skinMatricesTexture.pixels!.length
              ) {
                prevSkinMatricesTexture.pixels = new Float32Array(skinMatricesTexture.pixels!);
              } else {
                for (let i = 0; i < skinMatricesTexture.pixels!.length; i++) {
                  prevSkinMatricesTexture.pixels[i] = skinMatricesTexture.pixels![i];
                }
              }
              prevSkinMatricesTexture.width = skinMatricesTexture.width;
              prevSkinMatricesTexture.height = skinMatricesTexture.height;
            } else {
              const skinMatricesArray = skeleton.getSubSkinMatrices(renderable.__uid__, joints);
              if (
                !gbufferData.prevSkinMatricesArray ||
                gbufferData.prevSkinMatricesArray.length !== skinMatricesArray.length
              ) {
                gbufferData.prevSkinMatricesArray = new Float32Array(skinMatricesArray.length);
              }
              gbufferData.prevSkinMatricesArray.set(skinMatricesArray);
            }
          }
          gbufferData.prevWorldViewProjection =
            gbufferData.prevWorldViewProjection || mat4.create();
          if (isSkinnedMesh) {
            // Ignore world transform of skinned mesh.
            mat4.copy(gbufferData.prevWorldViewProjection, cameraViewProj);
          } else {
            if (renderable.worldTransform) {
              mat4.multiply(
                gbufferData.prevWorldViewProjection,
                cameraViewProj,
                renderable.worldTransform.array
              );
            }
          }
        },
        getUniform(renderable: RenderableObject, gBufferMat: Material, symbol: string) {
          const gbufferData = renderableGBufferData.get(renderable);
          if (symbol === 'prevWorldViewProjection') {
            return gbufferData && gbufferData.prevWorldViewProjection;
          } else if (symbol === 'prevSkinMatrix') {
            return gbufferData && gbufferData.prevSkinMatricesArray;
          } else if (symbol === 'prevSkinMatricesTexture') {
            return gbufferData && gbufferData.prevSkinMatricesTexture;
          } else if (symbol === 'firstRender') {
            return !(gbufferData && gbufferData.prevWorldViewProjection);
          } else {
            return gBufferMat.get(symbol);
          }
        },
        isMaterialChanged() {
          // Always update prevWorldViewProjection
          return true;
        },
        sortCompare: Renderer.opaqueSortCompare
      };

      renderer.renderPass(gBufferRenderList, camera, passConfig);
    }

    renderer.bindSceneRendering();
    frameBuffer.unbind(renderer);
  }

  /**
   * Debug output of gBuffer. Use `type` parameter to choos the debug output type, which can be:
   *
   * + 'normal'
   * + 'depth'
   * + 'position'
   * + 'glossiness'
   * + 'metalness'
   * + 'albedo'
   * + 'velocity'
   *
   * @param {clay.Renderer} renderer
   * @param {clay.Camera} camera
   * @param {string} [type='normal']
   */
  renderDebug(
    renderer: Renderer,
    camera: Camera,
    type?: 'normal' | 'depth' | 'position' | 'glossiness' | 'metalness' | 'albedo' | 'velocity',
    viewport?: RendererViewport
  ) {
    const debugTypes = {
      normal: 0,
      depth: 1,
      position: 2,
      glossiness: 3,
      metalness: 4,
      albedo: 5,
      velocity: 6
    } as const;
    if (debugTypes[type!] == null) {
      console.warn('Unkown type "' + type + '"');
      // Default use normal
      type = 'normal';
    }

    renderer.saveClear();
    renderer.saveViewport();
    renderer.clearBit = renderer.gl.DEPTH_BUFFER_BIT;

    if (viewport) {
      renderer.setViewport(viewport);
    }
    const viewProjectionInv = new Matrix4();
    Matrix4.multiply(viewProjectionInv, camera.worldTransform, camera.invProjectionMatrix);

    const debugPass = this._debugPass;
    debugPass.setUniform('viewportSize', [renderer.getWidth(), renderer.getHeight()]);
    debugPass.setUniform('gBufferTexture1', this._gBufferTex1);
    debugPass.setUniform('gBufferTexture2', this._gBufferTex2);
    debugPass.setUniform('gBufferTexture3', this._gBufferTex3);
    debugPass.setUniform('gBufferTexture4', this._gBufferTex4);
    debugPass.setUniform('debug', debugTypes[type!]);
    debugPass.setUniform('viewProjectionInv', viewProjectionInv.array);
    debugPass.render(renderer);

    renderer.restoreViewport();
    renderer.restoreClear();
  }

  /**
   * Get first target texture.
   * Channel storage:
   * + R: normal.x * 0.5 + 0.5
   * + G: normal.y * 0.5 + 0.5
   * + B: normal.z * 0.5 + 0.5
   * + A: glossiness
   * @return {clay.Texture2D}
   */
  getTargetTexture1() {
    return this._gBufferTex1;
  }

  /**
   * Get second target texture.
   * Channel storage:
   * + R: depth
   * @return {clay.Texture2D}
   */
  getTargetTexture2() {
    return this._gBufferTex2;
  }

  /**
   * Get third target texture.
   * Channel storage:
   * + R: albedo.r
   * + G: albedo.g
   * + B: albedo.b
   * + A: metalness
   * @return {clay.Texture2D}
   */
  getTargetTexture3() {
    return this._gBufferTex3;
  }

  /**
   * Get fourth target texture.
   * Channel storage:
   * + R: velocity.r
   * + G: velocity.g
   * @return {clay.Texture2D}
   */
  getTargetTexture4() {
    return this._gBufferTex4;
  }

  /**
   * @param  {clay.Renderer} renderer
   */
  dispose(renderer: Renderer) {
    this._gBufferTex1.dispose(renderer);
    this._gBufferTex2.dispose(renderer);
    this._gBufferTex3.dispose(renderer);

    this._defaultNormalMap.dispose(renderer);
    this._defaultRoughnessMap.dispose(renderer);
    this._defaultMetalnessMap.dispose(renderer);
    this._defaultDiffuseMap.dispose(renderer);
    this._frameBuffer.dispose(renderer);
  }
}

export default DeferredGBuffer;
