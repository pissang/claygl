import Texture2D from '../Texture2D';
import Material from '../Material';
import FrameBuffer from '../FrameBuffer';
import Shader from '../Shader';
import FullscreenQuadPass from '../composite/Pass';
import Matrix4 from '../math/Matrix4';
import * as mat4 from '../glmatrix/mat4';
import * as constants from '../core/constants';

import Renderer, { RenderHooks, RendererViewport, RenderableObject } from '../Renderer';
import Camera from '../Camera';
import Scene from '../Scene';
import { optional } from '../core/util';
import {
  createGBufferFrag,
  gBufferDebugFragment,
  gBufferVertex
} from '../shader/source/deferred/gbuffer.glsl';
import { isPixelSource, TexturePixelSource } from '../Texture';

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
function getGetUniformHook(
  defaultDiffuseMap: Texture2D,
  defaultNormalMap: Texture2D,
  defaultRoughnessMap: Texture2D,
  defaultMetalnessMap: Texture2D
) {
  return function (renderable: RenderableObject, gBufferMat: Material, symbol: string) {
    const standardMaterial = renderable.material;
    switch (symbol) {
      case 'doubleSided':
        return standardMaterial.isDefined('fragment', 'DOUBLE_SIDED');
      case 'uvRepeat':
      case 'uvOffset':
      case 'alpha':
      case 'color':
        return standardMaterial.get(symbol);
      case 'normalMap':
        return standardMaterial.get(symbol) || defaultNormalMap;
      case 'diffuseMap':
        return standardMaterial.get(symbol) || defaultDiffuseMap;
      case 'metalness':
        return standardMaterial.get('metalness') || 0;
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
          return alphaCutoff || 0;
        }
        return 0;
      case 'prevWorldViewProjection':
        return renderableGBufferData.get(renderable)?.prevWorldViewProjection;
      case 'prevSkinMatrix':
        return renderableGBufferData.get(renderable)?.prevSkinMatricesArray;
      case 'prevSkinMatricesTexture':
        return renderableGBufferData.get(renderable)?.prevSkinMatricesTexture;
      case 'firstRender':
        return !renderableGBufferData.get(renderable)?.prevWorldViewProjection;
      default:
        const useRoughnessWorkflow = !standardMaterial.isDefined('fragment', 'SPECULAR_WORKFLOW');
        const roughGlossMap = useRoughnessWorkflow
          ? standardMaterial.get('roughnessMap')
          : standardMaterial.get('glossinessMap');
        switch (symbol) {
          case 'glossiness':
            return useRoughnessWorkflow
              ? 1.0 - standardMaterial.get('roughness')
              : standardMaterial.get('glossiness');
          case 'roughGlossMap':
            // PENDING defaultGlossinessMap?
            return roughGlossMap || defaultRoughnessMap;
          case 'useRoughGlossMap':
            return !!roughGlossMap;
          case 'useRoughness':
            return useRoughnessWorkflow;
          case 'roughGlossChannel':
            return standardMaterial.getDefine(
              'fragment',
              useRoughnessWorkflow ? 'ROUGHNESS_CHANNEL' : 'GLOSSINESS_CHANNEL'
            );
          default:
            // Return directly
            return standardMaterial.get(symbol);
        }
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
  private _gBufferTex1 = new Texture2D({
    // PENDING
    type: constants.HALF_FLOAT,
    ...commonTextureOpts
  });

  // - R: depth
  private _gBufferTex2 = new Texture2D({
    // TODO DEPTH_STENCIL have invalid internalFormat error.
    internalFormat: constants.DEPTH24_STENCIL8,
    format: constants.DEPTH_STENCIL,
    type: constants.UNSIGNED_INT_24_8,

    // format: constants.DEPTH_STENCIL,
    ...commonTextureOpts
  });

  // - R: albedo.r
  // - G: albedo.g
  // - B: albedo.b
  // - A: metalness
  private _gBufferTex3 = new Texture2D(commonTextureOpts);

  private _gBufferTex4 = new Texture2D({
    // FLOAT Texture has bug on iOS. is HALF_FLOAT enough?
    type: constants.HALF_FLOAT,
    ...commonTextureOpts
  });

  private _defaultNormalMap = new Texture2D({
    source: createFillCanvas('#000')
  });
  private _defaultRoughnessMap = new Texture2D({
    source: createFillCanvas('#fff')
  });
  private _defaultMetalnessMap = new Texture2D({
    source: createFillCanvas('#fff')
  });
  private _defaultDiffuseMap = new Texture2D({
    source: createFillCanvas('#fff')
  });

  private _frameBuffer = new FrameBuffer();

  private _outputs = [];
  private _gBufferMaterial?: Material;

  private _debugPass = new FullscreenQuadPass(gBufferDebugFragment);

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
    const gBufferTex1 = this._gBufferTex1;
    if (gBufferTex1.width === width && gBufferTex1.height === height) {
      return;
    }
    gBufferTex1.resize(width, height);
    this._gBufferTex2.resize(width, height);
    this._gBufferTex3.resize(width, height);
    this._gBufferTex4.resize(width, height);
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
        pixelRatio: dpr || 1
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
        pixelRatio: 1
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
      const targetTexture2 = opts.targetTexture2 || this._gBufferTex2;
      frameBuffer.attach(
        targetTexture2,
        // TODO can specify attachment
        targetTexture2.format === constants.DEPTH_STENCIL
          ? renderer.gl.DEPTH_STENCIL_ATTACHMENT
          : renderer.gl.DEPTH_ATTACHMENT
      );
    }

    function clearViewport() {
      if (viewport) {
        const dpr = viewport.pixelRatio;
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

    const outputs = [];
    // PENDING, scene.boundingBoxLastFrame needs be updated if have shadow
    if (enableTargetTexture1) {
      frameBuffer.attach(opts.targetTexture1 || this._gBufferTex1, gl.COLOR_ATTACHMENT0);
      outputs.push('color0');
    }
    if (enableTargetTexture3) {
      frameBuffer.attach(opts.targetTexture3 || this._gBufferTex3, gl.COLOR_ATTACHMENT1);
      outputs.push('color1');
    }
    if (enableTargetTexture4) {
      frameBuffer.attach(opts.targetTexture4 || this._gBufferTex4, gl.COLOR_ATTACHMENT2);
      outputs.push('color2');
    }

    // Render list will be updated in gbuffer.
    camera.updateOffset && camera.updateOffset(frameBuffer.getWidth(), frameBuffer.getHeight(), 1);
    camera.update();

    const cameraViewProj = mat4.create();
    mat4.multiply(cameraViewProj, camera.projectionMatrix.array, camera.viewMatrix.array);

    let gBufferMaterial = this._gBufferMaterial;
    if (!gBufferMaterial || this._outputs.join('') !== outputs.join('')) {
      gBufferMaterial = this._gBufferMaterial = new Material(
        new Shader(gBufferVertex, createGBufferFrag(outputs))
      );
      if (enableTargetTexture1) {
        gBufferMaterial.define('USE_TARGET_TEXTURE1');
      }
      if (enableTargetTexture3) {
        gBufferMaterial.define('USE_TARGET_TEXTURE3');
      }
      if (enableTargetTexture4) {
        gBufferMaterial.define('USE_TARGET_TEXTURE4');
      }
    }

    const renderHooks: RenderHooks = {
      prepare(gl) {
        clearViewport();
      },
      getMaterial() {
        return gBufferMaterial!;
      },
      getMaterialUniform: getGetUniformHook(
        this._defaultDiffuseMap,
        this._defaultNormalMap,
        this._defaultRoughnessMap,
        this._defaultMetalnessMap
      ),
      isMaterialChanged,
      sortCompare: Renderer.opaqueSortCompare,
      afterRender(renderable: RenderableObject) {
        if (enableTargetTexture4) {
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
                renderable.uid,
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
              const source = skinMatricesTexture.source as TexturePixelSource;
              if (
                !isPixelSource(prevSkinMatricesTexture.source) ||
                prevSkinMatricesTexture.source.data.length !== source.data.length
              ) {
                prevSkinMatricesTexture.source = {
                  data: new Float32Array(source.data),
                  width: source.width,
                  height: source.height
                };
              } else {
                for (let i = 0; i < source.data.length; i++) {
                  prevSkinMatricesTexture.source.data[i] = source.data[i];
                }
              }
              prevSkinMatricesTexture.width = skinMatricesTexture.width;
              prevSkinMatricesTexture.height = skinMatricesTexture.height;
            } else {
              const skinMatricesArray = skeleton.getSubSkinMatrices(renderable.uid, joints);
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
        }
      }
    };
    renderer.renderPass(gBufferRenderList, camera, frameBuffer, renderHooks, scene);
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
    const debugPassMat = debugPass.material;
    debugPassMat.set('gBufferTexture1', this._gBufferTex1);
    debugPassMat.set('gBufferTexture2', this._gBufferTex2);
    debugPassMat.set('gBufferTexture3', this._gBufferTex3);
    debugPassMat.set('gBufferTexture4', this._gBufferTex4);
    debugPassMat.set('debug', debugTypes[type!]);
    debugPassMat.set('viewProjectionInv', viewProjectionInv.array);
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
    [
      this._gBufferTex1,
      this._gBufferTex2,
      this._gBufferTex3,
      this._gBufferTex4,
      this._defaultDiffuseMap,
      this._defaultNormalMap,
      this._defaultRoughnessMap,
      this._defaultMetalnessMap
    ].forEach((texture) => renderer.disposeTexture(texture));
    renderer.disposeFrameBuffer(this._frameBuffer);
  }
}

export default DeferredGBuffer;
