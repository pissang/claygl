// TODO Resources like shader, texture, geometry reference management
// Trace and find out which shader, texture, geometry can be destroyed
import Notifier from './core/Notifier';
import * as constants from './core/constants';
import vendor from './core/vendor';

import Material from './Material';
import Vector2 from './math/Vector2';

// Light header
import Shader, { BASIC_MATRIX_SEMANTICS, MatrixSemantic } from './Shader';

import * as mat4 from './glmatrix/mat4';
import * as vec3 from './glmatrix/vec3';
import type Renderable from './Renderable';
import type FrameBuffer from './FrameBuffer';
import type Scene from './Scene';
import { Color, GLEnum } from './core/type';
import { assign, genGUID, optional, setCanvasSize } from './core/util';
import type Camera from './Camera';
import type ClayNode from './Node';
import type PerspectiveCamera from './camera/Perspective';
import { preZFragment, preZVertex } from './shader/source/prez.glsl';
import GLRenderer, {
  ExtendedRenderableObject,
  GLRenderableObject,
  GLRenderHooks
} from './gl/GLRenderer';
import Texture from './Texture';
import InstancedMesh from './InstancedMesh';
import GeometryBase from './GeometryBase';

const mat4Create = mat4.create;

interface ExtendedWebGL2RenderingContext extends WebGL2RenderingContext {
  targetRenderer: Renderer;
}

export type RenderableObject = GLRenderableObject<Material>;
export type RenderHooks = GLRenderHooks<RenderableObject> & {
  /**
   * Do preparation like color clear before render and after framebuffer bound.
   */
  prepare?(gl: WebGL2RenderingContext): void;
  /**
   * Do cleanup like restore gl state after pass rendered, before framebuffer unbound.
   */
  cleanup?(gl: WebGL2RenderingContext): void;
};

export interface RendererViewport {
  x: number;
  y: number;
  width: number;
  height: number;
  devicePixelRatio: number;
}
export interface RendererOpts {
  canvas: HTMLCanvasElement | null;

  /**
   * Canvas width
   */
  width: number;
  /**
   * Canvas width
   */
  height: number;

  /**
   * Device pixel ratio, set by setDevicePixelRatio method
   * Specially for high defination display
   * @see http://www.khronos.org/webgl/wiki/HandlingHighDPI
   * @type {number}
   * @private
   */
  devicePixelRatio: number;

  /**
   * Clear color
   */
  clearColor: Color;

  /**
   * Default:
   *     _gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT | _gl.STENCIL_BUFFER_BIT
   */
  clearBit: GLEnum;

  // Settings when getting context
  // http://www.khronos.org/registry/webgl/specs/latest/#2.4

  /**
   * If enable log depth buffer
   */
  logDepthBuffer: boolean;
  /**
   * If enable alpha, default true
   */
  alpha: boolean;
  /**
   * If enable depth buffer, default true
   */
  depth: boolean;
  /**
   * If enable stencil buffer, default false
   */
  stencil: boolean;
  /**
   * If enable antialias, default true
   */
  antialias: boolean;
  /**
   * If enable premultiplied alpha, default true
   */
  premultipliedAlpha: boolean;
  /**
   * If preserve drawing buffer, default false
   */
  preserveDrawingBuffer: boolean;
  /**
   * If throw context error, usually turned on in debug mode
   */
  throwError: boolean;
}

interface Renderer
  extends Pick<RendererOpts, 'canvas' | 'clearColor' | 'clearBit' | 'logDepthBuffer'> {}
/**
 * @constructor clay.Renderer
 * @extends clay.core.Base
 */
class Renderer extends Notifier {
  uid = genGUID();

  canvas: HTMLCanvasElement;
  /**
   * Canvas width, set by resize method
   */
  private _width: number;

  /**
   * Canvas width, set by resize method
   */
  private _height: number;

  /**
   * Device pixel ratio, set by setDevicePixelRatio method
   * Specially for high defination display
   * @see http://www.khronos.org/webgl/wiki/HandlingHighDPI
   * @type {number}
   * @private
   */
  private _devicePixelRatio: number;

  // Settings when getting context
  // http://www.khronos.org/registry/webgl/specs/latest/#2.4

  /**
   * WebGL Context created from given canvas
   */
  readonly gl: ExtendedWebGL2RenderingContext;
  /**
   * Renderer viewport, read-only, can be set by setViewport method
   * @type {Object}
   */
  viewport = {} as RendererViewport;

  private _viewportStack: RendererViewport[] = [];
  private _clearStack: {
    clearBit: GLEnum;
    clearColor: Color;
  }[] = [];

  private _prezMaterial?: Material;

  private _glRenderer: GLRenderer;

  constructor(opts?: Partial<RendererOpts>) {
    super();
    opts = opts || {};

    const canvas = (this.canvas = opts.canvas || vendor.createCanvas());
    try {
      const webglOpts = {
        alpha: optional(opts.alpha, true),
        depth: optional(opts.depth, true),
        stencil: opts.stencil || false,
        antialias: optional(opts.antialias, true),
        premultipliedAlpha: optional(opts.premultipliedAlpha, true),
        preserveDrawingBuffer: optional(opts.preserveDrawingBuffer, false)
      };

      const gl = (this.gl = canvas.getContext(
        'webgl2',
        webglOpts
      ) as ExtendedWebGL2RenderingContext);

      if (!this.gl) {
        throw new Error('WebGL 2.0 is not supported.');
      }

      if (gl.targetRenderer) {
        console.error('Already created a renderer');
      }
      gl.targetRenderer = this;
      this._glRenderer = new GLRenderer(gl, {
        throwError: opts.throwError
      });

      this._width = opts.width || canvas.width || 100;
      this._height = opts.height || canvas.height || 100;
      this._devicePixelRatio =
        opts.devicePixelRatio || (typeof window !== 'undefined' ? window.devicePixelRatio : 1.0);
      this.resize(this._width, this._height);
    } catch (e) {
      throw 'Error creating WebGL Context ' + e;
    }

    this.logDepthBuffer = opts.logDepthBuffer || false;
    this.clearColor = opts.clearColor || [0.0, 0.0, 0.0, 0.0];
    // gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT | gl.STENCIL_BUFFER_BIT
    this.clearBit = opts.clearBit || 17664;
  }
  /**
   * Resize the canvas
   * @param {number} width
   * @param {number} height
   */
  resize(width?: number, height?: number) {
    const canvas = this.canvas;
    const dpr = this._devicePixelRatio;
    if (width != null) {
      setCanvasSize(canvas, width, height!, dpr);
      this._width = width;
      this._height = height!;
    } else {
      this._width = canvas.width / dpr;
      this._height = canvas.height / dpr;
    }
    this.setViewport(0, 0, this._width, this._height);
  }

  /**
   * Get renderer width
   * @return {number}
   */
  getWidth() {
    return this._width;
  }

  /**
   * Get renderer height
   * @return {number}
   */
  getHeight() {
    return this._height;
  }

  /**
   * Get viewport aspect,
   * @return {number}
   */
  getViewportAspect() {
    const viewport = this.viewport;
    return viewport.width / viewport.height;
  }

  /**
   * Set devicePixelRatio
   * @param {number} devicePixelRatio
   */
  setDevicePixelRatio(devicePixelRatio: number) {
    this._devicePixelRatio = devicePixelRatio;
    this.resize(this._width, this._height);
  }

  /**
   * Get devicePixelRatio
   * @param {number} devicePixelRatio
   */
  getDevicePixelRatio() {
    return this._devicePixelRatio;
  }

  /**
   * Set rendering viewport
   * @param {number|Object} x
   * @param {number} [y]
   * @param {number} [width]
   * @param {number} [height]
   * @param {number} [devicePixelRatio]
   *        Defaultly use the renderere devicePixelRatio
   *        It needs to be 1 when setViewport is called by frameBuffer
   *
   * @example
   *  setViewport(0,0,width,height,1)
   *  setViewport({
   *      x: 0,
   *      y: 0,
   *      width: width,
   *      height: height,
   *      devicePixelRatio: 1
   *  })
   */
  setViewport(x: RendererViewport): void;
  setViewport(x: number, y: number, width: number, height: number, dpr?: number): void;
  setViewport(
    x: number | RendererViewport,
    y?: number,
    width?: number,
    height?: number,
    dpr?: number
  ) {
    if (typeof x === 'object') {
      const obj = x;

      x = obj.x;
      y = obj.y;
      width = obj.width;
      height = obj.height;
      dpr = obj.devicePixelRatio;
    }
    dpr = dpr || this._devicePixelRatio;

    this._glRenderer.setViewport(x, y!, width!, height!, dpr!);
    // Use a fresh new object, not write property.
    this.viewport = {
      x,
      y: y!,
      width: width!,
      height: height!,
      devicePixelRatio: dpr
    };
  }

  /**
   * Push current viewport into a stack
   */
  saveViewport() {
    this._viewportStack.push(this.viewport);
  }

  /**
   * Pop viewport from stack, restore in the renderer
   */
  restoreViewport() {
    const viewport = this._viewportStack.pop();
    if (viewport) {
      this.setViewport(viewport);
    }
  }

  /**
   * Push current clear into a stack
   */
  saveClear() {
    this._clearStack.push({
      clearBit: this.clearBit,
      clearColor: this.clearColor
    });
  }

  /**
   * Pop clear from stack, restore in the renderer
   */
  restoreClear() {
    const opt = this._clearStack.pop();
    if (opt) {
      this.clearColor = opt.clearColor;
      this.clearBit = opt.clearBit;
    }
  }

  getWebGLExtension(name: string) {
    return this._glRenderer.getWebGLExtension(name);
  }

  /**
   * Render the scene in camera to the screen or binded offline framebuffer
   */
  render(
    scene: Scene,
    camera: Camera,
    frameBuffer?: FrameBuffer,
    opts?: {
      /**
       * If not call the scene.update methods in the rendering
       */
      notUpdateScene?: boolean;
      /**
       * If use preZ optimization
       */
      preZ?: boolean;
    }
  ) {
    const gl = this.gl;

    const clearColor = this.clearColor;

    this._bindFrameBuffer(frameBuffer);

    opts = opts || {};
    const { notUpdateScene, preZ } = opts;

    const viewport = this._glRenderer.getViewport();
    const viewportDpr = viewport.devicePixelRatio;

    if (this.clearBit) {
      // Must set depth and color mask true before clear
      gl.colorMask(true, true, true, true);
      gl.depthMask(true);
      let needsScissor = false;
      if (
        viewport.width !== this._width ||
        viewport.height !== this._height ||
        (viewportDpr && viewportDpr !== this._devicePixelRatio) ||
        viewport.x ||
        viewport.y
      ) {
        needsScissor = true;
        // http://stackoverflow.com/questions/11544608/how-to-clear-a-rectangle-area-in-webgl
        // Only clear the viewport
        gl.enable(constants.SCISSOR_TEST);
        gl.scissor(
          viewport.x * viewportDpr,
          viewport.y * viewportDpr,
          viewport.width * viewportDpr,
          viewport.height * viewportDpr
        );
      }
      gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
      gl.clear(this.clearBit);
      if (needsScissor) {
        gl.disable(constants.SCISSOR_TEST);
      }
    }

    // If the scene have been updated in the prepass like shadow map
    // There is no need to update it again
    if (!notUpdateScene) {
      scene.update();
    }
    scene.updateLights();

    camera = camera || scene.getMainCamera();
    if (!camera) {
      console.error("Can't find camera in the scene.");
      return;
    }
    camera.update();
    camera.updateOffset && camera.updateOffset(viewport.width, viewport.height, viewportDpr);
    const renderList = scene.updateRenderList(camera, true);

    const opaqueList = renderList.opaque;
    const transparentList = renderList.transparent;
    const sceneMaterial = scene.material;

    // Render pre z
    preZ && this.renderPreZ(opaqueList, scene, camera);
    gl.depthFunc(preZ ? constants.LEQUAL : constants.LESS);

    // Update the depth of transparent list.
    const worldViewMat = mat4Create();
    const posViewSpace = vec3.create();
    for (let i = 0; i < transparentList.length; i++) {
      const renderable = transparentList[i];
      mat4.multiplyAffine(worldViewMat, camera.viewMatrix.array, renderable.worldTransform.array);
      vec3.transformMat4(posViewSpace, renderable.position.array, worldViewMat);
      renderable.__depth = posViewSpace[2];
    }

    function getMaterial(renderable: Renderable) {
      return sceneMaterial || renderable.material;
    }

    // Render skybox before anyother objects
    const skybox = scene.skybox;
    if (skybox) {
      skybox.update();
      this._renderPass([skybox], camera, frameBuffer);
    }

    // Render opaque list
    this._renderPass(
      opaqueList,
      camera,
      frameBuffer,
      {
        getMaterial,
        sortCompare: Renderer.opaqueSortCompare
      },
      scene
    );

    this._renderPass(
      transparentList,
      camera,
      frameBuffer,
      {
        getMaterial,
        sortCompare: Renderer.transparentSortCompare
      },
      scene
    );
  }

  /**
   * Render a single pass.
   *
   * CAUTION:
   * You must execute gl.clear or other gl commands in the prepare methods.
   * If you are using framebuffer. executing theme before the renderPass will not affect on the framebuffer.
   */
  renderPass(
    list: GLRenderableObject<Material>[],
    camera?: Camera,
    frameBuffer?: FrameBuffer,
    renderHooks?: RenderHooks,
    scene?: Scene
  ) {
    this._bindFrameBuffer(frameBuffer);
    this._renderPass(list, camera, frameBuffer, renderHooks, scene);
  }

  /**
   * Bind frame buffer manually.
   * Use #bindFrameBuffer(null) to unbind
   */
  bindFrameBuffer(frameBuffer?: FrameBuffer | null) {
    this._bindFrameBuffer(frameBuffer);
  }

  private _bindFrameBuffer(frameBuffer?: FrameBuffer | null) {
    const glRenderer = this._glRenderer;
    glRenderer.bindFrameBuffer(frameBuffer);
    const viewport = frameBuffer ? frameBuffer.getViewport() : this.viewport;
    glRenderer.setViewport(
      viewport.x,
      viewport.y,
      viewport.width,
      viewport.height,
      viewport.devicePixelRatio
    );
  }

  private _renderPass(
    list: GLRenderableObject<Material>[],
    camera?: Camera,
    frameBuffer?: FrameBuffer,
    renderHooks?: RenderHooks,
    scene?: Scene
  ) {
    let worldM: mat4.Mat4Array;
    const viewport = this._glRenderer.getViewport();
    const vDpr = viewport.devicePixelRatio;
    const viewportUniform = [
      viewport.x * vDpr,
      viewport.y * vDpr,
      viewport.width * vDpr,
      viewport.height * vDpr
    ];
    const windowDpr = this._devicePixelRatio;
    const windowSizeUniform = frameBuffer
      ? [frameBuffer.getWidth(), frameBuffer.getHeight()]
      : [this._width * windowDpr, this._height * windowDpr];
    // DEPRECATED
    const viewportSizeUniform = [viewportUniform[2], viewportUniform[3]];
    const time = Date.now();
    const gl = this.gl;
    const logDepthBuffer = this.logDepthBuffer;

    // Calculate view and projection matrix
    if (camera) {
      mat4.copy(matrices.VIEW, camera.viewMatrix.array);
      mat4.copy(matrices.PROJECTION, camera.projectionMatrix.array);
      mat4.copy(matrices.VIEWINVERSE, camera.worldTransform.array);
    } else {
      mat4.identity(matrices.VIEW);
      mat4.identity(matrices.PROJECTION);
      mat4.identity(matrices.VIEWINVERSE);
    }
    mat4.multiply(matrices.VIEWPROJECTION, matrices.PROJECTION, matrices.VIEW);
    mat4.invert(matrices.PROJECTIONINVERSE, matrices.PROJECTION);
    mat4.invert(matrices.VIEWPROJECTIONINVERSE, matrices.VIEWPROJECTION);

    const renderHooksForScene: GLRenderHooks = {
      getProgramKey: (renderable) => {
        let key = (scene && scene.getProgramKey(renderable.lightGroup || 0)) || '';
        if (this.logDepthBuffer) {
          key += ',ld';
        }
        return key;
      },
      getShaderDefineCode: (renderable) => {
        const lightsNumbers = scene ? scene.getLightsNumbers(renderable.lightGroup || 0) : {};
        const commonDefineCode: string[] = [];
        if (lightsNumbers) {
          for (const lightType in lightsNumbers) {
            const count = lightsNumbers[lightType];
            if (count > 0) {
              commonDefineCode.push('#define ' + lightType.toUpperCase() + '_COUNT ' + count);
            }
          }
        }
        if (this.logDepthBuffer) {
          commonDefineCode.push('#define LOG_DEPTH');
        }
        return commonDefineCode.join('\n');
      },
      programChanged: (program) => {
        // Set some common uniforms
        program.setSemanticUniform(gl, 'VIEWPORT', viewportUniform);
        program.setSemanticUniform(gl, 'WINDOW_SIZE', windowSizeUniform);
        if (camera) {
          program.setSemanticUniform(gl, 'NEAR', (camera as PerspectiveCamera).near);
          program.setSemanticUniform(gl, 'FAR', (camera as PerspectiveCamera).far);

          if (logDepthBuffer) {
            program.setSemanticUniform(
              gl,
              'LOG_DEPTH_BUFFER_FC',
              2.0 / (Math.log((camera as PerspectiveCamera).far + 1.0) / Math.LN2)
            );
          }
        }
        program.setSemanticUniform(gl, 'DEVICEPIXELRATIO', vDpr);
        program.setSemanticUniform(gl, 'TIME', time);
        // DEPRECATED
        program.setSemanticUniform(gl, 'VIEWPORT_SIZE', viewportSizeUniform);
      },
      getCommonUniforms: (renderable) => {
        return scene && scene.getLightUniforms(renderable.lightGroup!);
      },
      renderableChanged: (renderable, material, program) => {
        const isSceneNode = renderable.worldTransform != null;
        const shader = material.shader;
        if (isSceneNode) {
          // Skinned mesh will transformed to joint space. Ignore the mesh transform
          worldM =
            renderable.isSkinnedMesh && renderable.isSkinnedMesh()
              ? // TODO
                renderable.offsetMatrix
                ? renderable.offsetMatrix.array
                : IDENTITY_MATRIX
              : renderable.worldTransform!.array;
          mat4.copy(matrices.WORLD, worldM!);
          mat4.multiply(matrices.WORLDVIEWPROJECTION, matrices.VIEWPROJECTION, worldM!);
          mat4.multiplyAffine(matrices.WORLDVIEW, matrices.VIEW, worldM!);
          if (shader.semanticsMap.WORLDINVERSE || shader.semanticsMap.WORLDINVERSETRANSPOSE) {
            mat4.invert(matrices.WORLDINVERSE, worldM!);
          }
          if (
            shader.semanticsMap.WORLDVIEWINVERSE ||
            shader.semanticsMap.WORLDVIEWINVERSETRANSPOSE
          ) {
            mat4.invert(matrices.WORLDVIEWINVERSE, matrices.WORLDVIEW);
          }
          if (
            shader.semanticsMap.WORLDVIEWPROJECTIONINVERSE ||
            shader.semanticsMap.WORLDVIEWPROJECTIONINVERSETRANSPOSE
          ) {
            mat4.invert(matrices.WORLDVIEWPROJECTIONINVERSE, matrices.WORLDVIEWPROJECTION);
          }
        }

        const matrixSemanticKeys = shader.matrixSemantics;

        for (let k = 0; k < matrixSemanticKeys.length; k++) {
          const semantic = matrixSemanticKeys[k];
          const semanticInfo = shader.semanticsMap[semantic]!;
          const matrix = matrices[semantic];
          if (semanticInfo.isTranspose) {
            const matrixNoTranspose = matrices[semanticInfo.semanticNoTranspose!];
            mat4.transpose(matrix, matrixNoTranspose);
          }
          // Force set the uniform. Because underhood it only compares reference.
          // And we share reference between renderables.
          program.set(gl, semanticInfo.type, semanticInfo.name, matrix, true);
        }
      }
    };

    // Do frmaebuffer bind in the rnderPass method exposed to outside.
    this._glRenderer.bindFrameBuffer(frameBuffer);

    renderHooks && renderHooks.prepare && renderHooks.prepare(gl);
    this._glRenderer.render(list, assign(renderHooksForScene, renderHooks));
    renderHooks && renderHooks.cleanup && renderHooks.cleanup(gl);
  }

  getMaxJointNumber() {
    return this._glRenderer.maxJointNumber;
  }

  setMaxJointNumber(val: number) {
    this._glRenderer.maxJointNumber = val;
  }

  renderPreZ(list: GLRenderableObject<Material>[], scene: Scene, camera: Camera) {
    const _gl = this.gl;
    const preZPassMaterial =
      this._prezMaterial || new Material(new Shader(preZVertex, preZFragment));
    this._prezMaterial = preZPassMaterial;
    if (this.logDepthBuffer) {
      this._prezMaterial.set(
        'logDepthBufFC',
        2.0 / (Math.log((camera as PerspectiveCamera).far + 1.0) / Math.LN2)
      );
    }

    _gl.colorMask(false, false, false, false);
    _gl.depthMask(true);

    // Status
    this._renderPass(list, camera, undefined, {
      ifRender(renderable) {
        return !renderable.ignorePreZ;
      },
      isMaterialChanged(renderable, prevRenderable) {
        const matA = renderable.material;
        const matB = prevRenderable.material;
        return (
          matA.get('diffuseMap') !== matB.get('diffuseMap') ||
          (matA.get('alphaCutoff') || 0) !== (matB.get('alphaCutoff') || 0)
        );
      },
      getMaterialUniform(renderable, depthMaterial, symbol) {
        const material = renderable.material;
        if (symbol === 'alphaMap') {
          return material.get('diffuseMap');
        } else if (symbol === 'alphaCutoff') {
          if (material.isDefined('fragment', 'ALPHA_TEST') && material.get('diffuseMap')) {
            const alphaCutoff = material.get('alphaCutoff');
            return alphaCutoff || 0;
          }
          return 0;
        } else if (symbol === 'uvRepeat' || symbol === 'uvOffset') {
          return material.get(symbol);
        } else {
          return depthMaterial.get(symbol);
        }
      },
      getMaterial() {
        return preZPassMaterial;
      },
      sortCompare: Renderer.opaqueSortCompare
    });

    _gl.colorMask(true, true, true, true);
    _gl.depthMask(true);
  }

  /**
   * Dispose given scene, including all geometris, textures and shaders in the scene
   * @param {clay.Scene} scene
   */
  disposeScene(scene: Scene) {
    this.disposeNode(scene, true, true);
    scene.skybox && this.disposeNode(scene.skybox, true, true);
    scene.dispose();
  }

  /**
   * Dispose given node, including all geometries, textures and shaders attached on it or its descendant
   * @param {clay.Node} node
   * @param {boolean} [disposeGeometry=false] If dispose the geometries used in the descendant mesh
   * @param {boolean} [disposeTexture=false] If dispose the textures used in the descendant mesh
   */
  disposeNode(root: ClayNode, disposeGeometry?: boolean, disposeTexture?: boolean) {
    const parent = root.getParent();
    // Dettached from parent
    if (parent) {
      parent.remove(root);
    }
    const disposedMap: Record<string, boolean> = {};
    const glRenderer = this._glRenderer;
    root.traverse((node) => {
      const material = (node as Renderable).material;
      if ((node as Renderable).geometry && disposeGeometry) {
        this._glRenderer.disposeGeometry((node as Renderable).geometry);
      }
      // Pending more check?
      if ((node as InstancedMesh).instancedAttributes) {
        this.disposeInstancedMesh(node as InstancedMesh);
      }
      if (disposeTexture && material && !disposedMap[material.uid]) {
        const textureUniforms = material.getTextureUniforms();
        for (let u = 0; u < textureUniforms.length; u++) {
          const uniformName = textureUniforms[u];
          const val = material.uniforms[uniformName].value as any;
          const uniformType = material.uniforms[uniformName].type;
          if (!val) {
            continue;
          }
          if (uniformType === 't') {
            glRenderer.disposeTexture(val);
          } else if (uniformType === 'tv') {
            for (let k = 0; k < val.length; k++) {
              if (val[k]) {
                glRenderer.disposeTexture(val[k]);
              }
            }
          }
        }
        disposedMap[material.uid] = true;
      }
      // Particle system and AmbientCubemap light need to dispose
      node.dispose && node.dispose(this);
    });
  }

  disposeTexture(texture: Texture) {
    this._glRenderer.disposeTexture(texture);
  }
  disposeGeometry(geometry: GeometryBase) {
    this._glRenderer.disposeGeometry(geometry);
  }
  disposeFrameBuffer(frameBuffer: FrameBuffer) {
    this._glRenderer.disposeFrameBuffer(frameBuffer);
  }
  disposeInstancedMesh(mesh: InstancedMesh) {
    this._glRenderer.disposeInstancedMesh(mesh);
  }
  /**
   * Dispose renderer
   */
  dispose() {
    // TODO
    // @ts-ignore
    delete (this.gl as ExtendedWebGL2RenderingContext).targetRenderer;
  }

  /**
   * Convert screen coords to normalized device coordinates(NDC)
   * Screen coords can get from mouse event, it is positioned relative to canvas element
   * NDC can be used in ray casting with Camera.prototype.castRay methods
   *
   * @param  {number}       x
   * @param  {number}       y
   * @param  {clay.Vector2} [out]
   * @return {clay.Vector2}
   */
  screenToNDC(x: number, y: number, out?: Vector2): Vector2 {
    if (!out) {
      out = new Vector2();
    }
    // Invert y;
    y = this._height - y;

    const viewport = this.viewport;
    const arr = out.array;
    arr[0] = (x - viewport.x) / viewport.width;
    arr[0] = arr[0] * 2 - 1;
    arr[1] = (y - viewport.y) / viewport.height;
    arr[1] = arr[1] * 2 - 1;

    return out;
  }

  /**
   * Opaque renderables compare function
   * @param  {clay.Renderable} x
   * @param  {clay.Renderable} y
   * @return {boolean}
   * @static
   */
  static opaqueSortCompare(x: ExtendedRenderableObject, y: ExtendedRenderableObject) {
    // Priority renderOrder -> program -> material -> geometry
    if (x.renderOrder === y.renderOrder) {
      if (x.__program === y.__program) {
        if (x.material === y.material) {
          return x.geometry.uid - y.geometry.uid;
        }
        return x.material.uid! - y.material.uid!;
      }
      if (x.__program && y.__program) {
        return x.__program.uid - y.__program.uid;
      }
      return 0;
    }
    return x.renderOrder - y.renderOrder;
  }

  /**
   * Transparent renderables compare function
   * @param  {clay.Renderable} a
   * @param  {clay.Renderable} b
   * @return {boolean}
   * @static
   */
  static transparentSortCompare(x: ExtendedRenderableObject, y: ExtendedRenderableObject) {
    // Priority renderOrder -> depth -> program -> material -> geometry

    if (x.renderOrder === y.renderOrder) {
      if (x.__depth === y.__depth) {
        if (x.__program === y.__program) {
          if (x.material === y.material) {
            return x.geometry.uid - y.geometry.uid;
          }
          return x.material.uid! - y.material.uid!;
        }
        if (x.__program && y.__program) {
          return x.__program.uid - y.__program.uid;
        }
        return 0;
      }
      // Depth is negative
      // So farther object has smaller depth value
      return x.__depth - y.__depth;
    }
    return x.renderOrder - y.renderOrder;
  }

  static COLOR_BUFFER_BIT = constants.COLOR_BUFFER_BIT;
  static DEPTH_BUFFER_BIT = constants.DEPTH_BUFFER_BIT;
  static STENCIL_BUFFER_BIT = constants.STENCIL_BUFFER_BIT;
}

const IDENTITY_MATRIX = mat4.create();
const matrices = {} as Record<MatrixSemantic, mat4.Mat4Array>;
// Temporary variables
BASIC_MATRIX_SEMANTICS.forEach((semantic) => {
  matrices[semantic] = mat4.create();
  matrices[`${semantic}INVERSE`] = mat4.create();
  matrices[`${semantic}TRANSPOSE`] = mat4.create();
  matrices[`${semantic}INVERSETRANSPOSE`] = mat4.create();
});

export default Renderer;
