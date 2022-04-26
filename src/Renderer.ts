// TODO Resources like shader, texture, geometry reference management
// Trace and find out which shader, texture, geometry can be destroyed
import Notifier from './core/Notifier';
import GLInfo from './core/GLInfo';
import glenum from './core/glenum';
import vendor from './core/vendor';

import Material from './Material';
import Vector2 from './math/Vector2';
import ProgramManager from './gpu/ProgramManager';

// Light header
import Shader from './Shader';

import prezEssl from './shader/source/prez.glsl.js';
Shader.import(prezEssl);

import * as mat4 from './glmatrix/mat4';
import * as vec3 from './glmatrix/vec3';
import type Renderable from './Renderable';
import type { IndicesBuffer } from './GeometryBase';
import type FrameBuffer from './FrameBuffer';
import type Scene from './Scene';
import { Color, GLEnum } from './core/type';
import { genGUID } from './core/util';

const mat4Create = mat4.create;

const errorShader = {};

function defaultGetMaterial(renderable: Renderable) {
  return renderable.material;
}
function defaultGetUniform(renderable: Renderable, material: Material, symbol: string) {
  return material.uniforms[symbol].value;
}
function defaultIsMaterialChanged(
  renderable: Renderable,
  prevRenderable: Renderable,
  material: Material,
  prevMaterial: Material
) {
  return material !== prevMaterial;
}
function defaultIfRender(renderable: Renderable) {
  return true;
}

function noop() {}

const attributeBufferTypeMap = {
  float: glenum.FLOAT,
  byte: glenum.BYTE,
  ubyte: glenum.UNSIGNED_BYTE,
  short: glenum.SHORT,
  ushort: glenum.UNSIGNED_SHORT
};

class VertexArrayObject {
  vao?: any;
  availableAttributes: string[];
  availableAttributeSymbols: string[];
  indicesBuffer: IndicesBuffer;

  constructor(
    availableAttributes: string[],
    availableAttributeSymbols: string[],
    indicesBuffer: IndicesBuffer
  ) {
    this.availableAttributes = availableAttributes;
    this.availableAttributeSymbols = availableAttributeSymbols;
    this.indicesBuffer = indicesBuffer;
  }
}

function PlaceHolderTexture(renderer: Renderer) {
  let blankCanvas: HTMLCanvasElement;
  let webglTexture: WebGLTexture;

  return {
    bind(renderer: Renderer) {
      if (!blankCanvas) {
        // TODO Environment not support createCanvas.
        blankCanvas = vendor.createCanvas();
        blankCanvas.width = blankCanvas.height = 1;
        blankCanvas.getContext('2d');
      }

      const gl = renderer.gl;
      const firstBind = !webglTexture;
      if (firstBind) {
        webglTexture = gl.createTexture()!;
      }
      gl.bindTexture(gl.TEXTURE_2D, webglTexture);
      if (firstBind) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, blankCanvas);
      }
    },
    unbind(renderer: Renderer) {
      renderer.gl.bindTexture(renderer.gl.TEXTURE_2D, null);
    },
    isRenderable() {
      return true;
    }
  };
}

interface ExtendedWebGLRenderingContext extends WebGLRenderingContext {
  targetRenderer: Renderer;
}

interface Viewport {
  x: number;
  y: number;
  width: number;
  height: number;
  devicePixelRatio: number;
}
interface RendererOpts {
  canvas: HTMLCanvasElement;

  /**
   * Canvas width
   */
  width: number;
  /**
   * Canvas width
   */
  height: number;
}

interface Renderer extends Omit<RendererOpts, 'width' | 'height'> {}
/**
 * @constructor clay.Renderer
 * @extends clay.core.Base
 */
class Renderer extends Notifier {
  __uid__ = genGUID();
  /**
   * Canvas width, set by resize method
   */
  private _width = 100;

  /**
   * Canvas width, set by resize method
   */
  private _height = 100;

  /**
   * Device pixel ratio, set by setDevicePixelRatio method
   * Specially for high defination display
   * @see http://www.khronos.org/webgl/wiki/HandlingHighDPI
   * @type {number}
   * @private
   */
  devicePixelRatio = (typeof window !== 'undefined' && window.devicePixelRatio) || 1.0;

  /**
   * Clear color
   */
  clearColor: Color = [0.0, 0.0, 0.0, 0.0];

  /**
   * Default:
   *     _gl.COLOR_BUFFER_BIT | _gl.DEPTH_BUFFER_BIT | _gl.STENCIL_BUFFER_BIT
   */
  clearBit: GLEnum = 17664;

  // Settings when getting context
  // http://www.khronos.org/registry/webgl/specs/latest/#2.4

  /**
   * If enable log depth buffer
   */
  logDepthBuffer = false;
  /**
   * If enable alpha, default true
   */
  alpha = true;
  /**
   * If enable depth buffer, default true
   */
  depth = true;
  /**
   * If enable stencil buffer, default false
   */
  stencil = false;
  /**
   * If enable antialias, default true
   */
  antialias = true;
  /**
   * If enable premultiplied alpha, default true
   */
  premultipliedAlpha = true;
  /**
   * If preserve drawing buffer, default false
   */
  preserveDrawingBuffer = false;
  /**
   * If throw context error, usually turned on in debug mode
   */
  throwError = true;
  /**
   * WebGL Context created from given canvas
   */
  readonly gl: ExtendedWebGLRenderingContext;
  /**
   * Renderer viewport, read-only, can be set by setViewport method
   * @type {Object}
   */
  viewport = {} as Viewport;

  /**
   * Max joint number
   */
  maxJointNumber = 20;

  // Set by FrameBuffer#bind
  private __currentFrameBuffer?: FrameBuffer;

  private _viewportStack: Viewport[] = [];
  private _clearStack: {
    clearBit: GLEnum;
    clearColor: Color;
  }[] = [];

  private _sceneRendering?: Scene;

  private _glinfo: GLInfo;

  constructor(opts?: Partial<RendererOpts>) {
    opts = opts || {};
    super();

    if (!this.canvas) {
      this.canvas = vendor.createCanvas();
    }
    const canvas = this.canvas;
    try {
      const opts = {
        alpha: this.alpha,
        depth: this.depth,
        stencil: this.stencil,
        antialias: this.antialias,
        premultipliedAlpha: this.premultipliedAlpha,
        preserveDrawingBuffer: this.preserveDrawingBuffer
      };

      this.gl = canvas.getContext('webgl', opts) as ExtendedWebGLRenderingContext;

      if (!this.gl) {
        throw new Error();
      }

      this._glinfo = new GLInfo(this.gl);

      if (this.gl.targetRenderer) {
        console.error('Already created a renderer');
      }
      this.gl.targetRenderer = this;

      this.resize();
    } catch (e) {
      throw 'Error creating WebGL Context ' + e;
    }

    // Init managers
    this._programMgr = new ProgramManager(this);

    this._placeholderTexture = new PlaceHolderTexture(this);
  }
  /**
   * Resize the canvas
   * @param {number} width
   * @param {number} height
   */
  resize(width?: number, height?: number) {
    const canvas = this.canvas;
    // http://www.khronos.org/webgl/wiki/HandlingHighDPI
    // set the display size of the canvas.
    const dpr = this.devicePixelRatio;
    if (width != null) {
      if (canvas.style) {
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
      }
      // set the size of the drawingBuffer
      canvas.width = width * dpr;
      canvas.height = height! * dpr;

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
  setDevicePixelRatio(devicePixelRatio) {
    this.devicePixelRatio = devicePixelRatio;
    this.resize(this._width, this._height);
  }

  /**
   * Get devicePixelRatio
   * @param {number} devicePixelRatio
   */
  getDevicePixelRatio() {
    return this.devicePixelRatio;
  }

  /**
   * Get WebGL extension
   * @param {string} name
   * @return {object}
   */
  getGLExtension(name: string) {
    return this._glinfo.getExtension(name);
  }

  /**
   * Get WebGL parameter
   * @param {string} name
   * @return {*}
   */
  getGLParameter(name: string) {
    return this._glinfo.getParameter(name);
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
  setViewport(x: Viewport): void;
  setViewport(x: number, y: number, width: number, height: number, dpr?: number): void;
  setViewport(x: number | Viewport, y?: number, width?: number, height?: number, dpr?: number) {
    if (typeof x === 'object') {
      const obj = x;

      x = obj.x;
      y = obj.y;
      width = obj.width;
      height = obj.height;
      dpr = obj.devicePixelRatio;
    }
    dpr = dpr || this.devicePixelRatio;

    this.gl.viewport(x * dpr, y! * dpr, width! * dpr, height! * dpr);
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
    if (this._viewportStack.length > 0) {
      this.setViewport(this._viewportStack.pop()!);
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
    if (this._clearStack.length > 0) {
      const opt = this._clearStack.pop();
      this.clearColor = opt.clearColor;
      this.clearBit = opt.clearBit;
    }
  }

  bindSceneRendering(scene) {
    this._sceneRendering = scene;
  }

  /**
   * Render the scene in camera to the screen or binded offline framebuffer
   * @param  {clay.Scene}       scene
   * @param  {clay.Camera}      camera
   * @param  {boolean}     [notUpdateScene] If not call the scene.update methods in the rendering, default true
   * @param  {boolean}     [preZ]           If use preZ optimization, default false
   * @return {IRenderInfo}
   */
  render(scene, camera, notUpdateScene, preZ) {
    const _gl = this.gl;

    const clearColor = this.clearColor;

    if (this.clearBit) {
      // Must set depth and color mask true before clear
      _gl.colorMask(true, true, true, true);
      _gl.depthMask(true);
      const viewport = this.viewport;
      let needsScissor = false;
      const viewportDpr = viewport.devicePixelRatio;
      if (
        viewport.width !== this._width ||
        viewport.height !== this._height ||
        (viewportDpr && viewportDpr !== this.devicePixelRatio) ||
        viewport.x ||
        viewport.y
      ) {
        needsScissor = true;
        // http://stackoverflow.com/questions/11544608/how-to-clear-a-rectangle-area-in-webgl
        // Only clear the viewport
        _gl.enable(_gl.SCISSOR_TEST);
        _gl.scissor(
          viewport.x * viewportDpr,
          viewport.y * viewportDpr,
          viewport.width * viewportDpr,
          viewport.height * viewportDpr
        );
      }
      _gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
      _gl.clear(this.clearBit);
      if (needsScissor) {
        _gl.disable(_gl.SCISSOR_TEST);
      }
    }

    // If the scene have been updated in the prepass like shadow map
    // There is no need to update it again
    if (!notUpdateScene) {
      scene.update(false);
    }
    scene.updateLights();

    camera = camera || scene.getMainCamera();
    if (!camera) {
      console.error("Can't find camera in the scene.");
      return;
    }
    camera.update();
    const renderList = scene.updateRenderList(camera, true);

    this._sceneRendering = scene;

    const opaqueList = renderList.opaque;
    const transparentList = renderList.transparent;
    const sceneMaterial = scene.material;

    scene.trigger('beforerender', this, scene, camera, renderList);

    // Render pre z
    if (preZ) {
      this.renderPreZ(opaqueList, scene, camera);
      _gl.depthFunc(_gl.LEQUAL);
    } else {
      _gl.depthFunc(_gl.LESS);
    }

    // Update the depth of transparent list.
    const worldViewMat = mat4Create();
    const posViewSpace = vec3.create();
    for (let i = 0; i < transparentList.length; i++) {
      const renderable = transparentList[i];
      mat4.multiplyAffine(worldViewMat, camera.viewMatrix.array, renderable.worldTransform.array);
      vec3.transformMat4(posViewSpace, renderable.position.array, worldViewMat);
      renderable.__depth = posViewSpace[2];
    }

    // Render opaque list
    this.renderPass(opaqueList, camera, {
      getMaterial(renderable) {
        return sceneMaterial || renderable.material;
      },
      sortCompare: this.opaqueSortCompare
    });

    this.renderPass(transparentList, camera, {
      getMaterial(renderable) {
        return sceneMaterial || renderable.material;
      },
      sortCompare: this.transparentSortCompare
    });

    scene.trigger('afterrender', this, scene, camera, renderList);

    // Cleanup
    this._sceneRendering = null;
  }

  getProgram(renderable, renderMaterial, scene) {
    renderMaterial = renderMaterial || renderable.material;
    return this._programMgr.getProgram(renderable, renderMaterial, scene, this);
  }

  validateProgram(program) {
    if (program.__error) {
      const errorMsg = program.__error;
      if (errorShader[program.__uid__]) {
        return;
      }
      errorShader[program.__uid__] = true;

      if (this.throwError) {
        throw new Error(errorMsg);
      } else {
        this.trigger('error', errorMsg);
      }
    }
  }

  updatePrograms(list, scene, passConfig) {
    const getMaterial = (passConfig && passConfig.getMaterial) || defaultGetMaterial;
    scene = scene || null;
    for (let i = 0; i < list.length; i++) {
      const renderable = list[i];
      const renderMaterial = getMaterial.call(this, renderable);
      if (i > 0) {
        const prevRenderable = list[i - 1];
        const prevJointsLen = prevRenderable.joints ? prevRenderable.joints.length : 0;
        const jointsLen = renderable.joints ? renderable.joints.length : 0;
        // Keep program not change if joints, material, lightGroup are same of two renderables.
        if (
          jointsLen === prevJointsLen &&
          renderable.material === prevRenderable.material &&
          renderable.lightGroup === prevRenderable.lightGroup
        ) {
          renderable.__program = prevRenderable.__program;
          continue;
        }
      }

      const program = this._programMgr.getProgram(renderable, renderMaterial, scene, this);

      this.validateProgram(program);

      renderable.__program = program;
    }
  }

  /**
   * Render a single renderable list in camera in sequence
   * @param {clay.Renderable[]} list List of all renderables.
   * @param {clay.Camera} [camera] Camera provide view matrix and porjection matrix. It can be null.
   * @param {Object} [passConfig]
   * @param {Function} [passConfig.getMaterial] Get renderable material.
   * @param {Function} [passConfig.getUniform] Get material uniform value.
   * @param {Function} [passConfig.isMaterialChanged] If material changed.
   * @param {Function} [passConfig.beforeRender] Before render each renderable.
   * @param {Function} [passConfig.afterRender] After render each renderable
   * @param {Function} [passConfig.ifRender] If render the renderable.
   * @param {Function} [passConfig.sortCompare] Sort compare function.
   * @return {IRenderInfo}
   */
  renderPass(list, camera, passConfig) {
    this.trigger('beforerenderpass', this, list, camera, passConfig);

    passConfig = passConfig || {};
    passConfig.getMaterial = passConfig.getMaterial || defaultGetMaterial;
    passConfig.getUniform = passConfig.getUniform || defaultGetUniform;
    // PENDING Better solution?
    passConfig.isMaterialChanged = passConfig.isMaterialChanged || defaultIsMaterialChanged;
    passConfig.beforeRender = passConfig.beforeRender || noop;
    passConfig.afterRender = passConfig.afterRender || noop;

    let ifRenderObject = passConfig.ifRender || defaultIfRender;

    this.updatePrograms(list, this._sceneRendering, passConfig);
    if (passConfig.sortCompare) {
      list.sort(passConfig.sortCompare);
    }

    // Some common builtin uniforms
    const viewport = this.viewport;
    const vDpr = viewport.devicePixelRatio;
    const viewportUniform = [
      viewport.x * vDpr,
      viewport.y * vDpr,
      viewport.width * vDpr,
      viewport.height * vDpr
    ];
    const windowDpr = this.devicePixelRatio;
    const windowSizeUniform = this.__currentFrameBuffer
      ? [this.__currentFrameBuffer.getTextureWidth(), this.__currentFrameBuffer.getTextureHeight()]
      : [this._width * windowDpr, this._height * windowDpr];
    // DEPRECATED
    const viewportSizeUniform = [viewportUniform[2], viewportUniform[3]];
    const time = Date.now();

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

    const _gl = this.gl;
    const scene = this._sceneRendering;

    let prevMaterial;
    let prevProgram;
    let prevRenderable;

    // Status
    let depthTest, depthMask;
    let culling, cullFace, frontFace;
    let transparent;
    let drawID;
    let currentVAO;
    let materialTakesTextureSlot;

    // const vaoExt = this.getGLExtension('OES_vertex_array_object');
    // not use vaoExt, some platforms may mess it up.
    const vaoExt = null;

    for (let i = 0; i < list.length; i++) {
      const renderable = list[i];
      const isSceneNode = renderable.worldTransform != null;
      let worldM;

      if (!ifRenderObject(renderable)) {
        continue;
      }

      // Skinned mesh will transformed to joint space. Ignore the mesh transform
      if (isSceneNode) {
        worldM =
          renderable.isSkinnedMesh && renderable.isSkinnedMesh()
            ? // TODO
              renderable.offsetMatrix
              ? renderable.offsetMatrix.array
              : matrices.IDENTITY
            : renderable.worldTransform.array;
      }
      const geometry = renderable.geometry;
      const material = passConfig.getMaterial.call(this, renderable);

      let program = renderable.__program;
      const shader = material.shader;

      const currentDrawID = geometry.__uid__ + '-' + program.__uid__;
      const drawIDChanged = currentDrawID !== drawID;
      drawID = currentDrawID;
      if (drawIDChanged && vaoExt) {
        // TODO Seems need to be bound to null immediately (or before bind another program?) if vao is changed
        vaoExt.bindVertexArrayOES(null);
      }
      if (isSceneNode) {
        mat4.copy(matrices.WORLD, worldM);
        mat4.multiply(matrices.WORLDVIEWPROJECTION, matrices.VIEWPROJECTION, worldM);
        mat4.multiplyAffine(matrices.WORLDVIEW, matrices.VIEW, worldM);
        if (shader.matrixSemantics.WORLDINVERSE || shader.matrixSemantics.WORLDINVERSETRANSPOSE) {
          mat4.invert(matrices.WORLDINVERSE, worldM);
        }
        if (
          shader.matrixSemantics.WORLDVIEWINVERSE ||
          shader.matrixSemantics.WORLDVIEWINVERSETRANSPOSE
        ) {
          mat4.invert(matrices.WORLDVIEWINVERSE, matrices.WORLDVIEW);
        }
        if (
          shader.matrixSemantics.WORLDVIEWPROJECTIONINVERSE ||
          shader.matrixSemantics.WORLDVIEWPROJECTIONINVERSETRANSPOSE
        ) {
          mat4.invert(matrices.WORLDVIEWPROJECTIONINVERSE, matrices.WORLDVIEWPROJECTION);
        }
      }

      // Before render hook
      renderable.beforeRender && renderable.beforeRender(this);
      passConfig.beforeRender.call(this, renderable, material, prevMaterial);

      const programChanged = program !== prevProgram;
      if (programChanged) {
        // Set lights number
        program.bind(this);
        // Set some common uniforms
        program.setUniformOfSemantic(_gl, 'VIEWPORT', viewportUniform);
        program.setUniformOfSemantic(_gl, 'WINDOW_SIZE', windowSizeUniform);
        if (camera) {
          program.setUniformOfSemantic(_gl, 'NEAR', camera.near);
          program.setUniformOfSemantic(_gl, 'FAR', camera.far);

          if (this.logDepthBuffer) {
            // TODO Semantic?
            program.setUniformOfSemantic(
              _gl,
              'LOG_DEPTH_BUFFER_FC',
              2.0 / (Math.log(camera.far + 1.0) / Math.LN2)
            );
          }
        }
        program.setUniformOfSemantic(_gl, 'DEVICEPIXELRATIO', vDpr);
        program.setUniformOfSemantic(_gl, 'TIME', time);
        // DEPRECATED
        program.setUniformOfSemantic(_gl, 'VIEWPORT_SIZE', viewportSizeUniform);

        // Set lights uniforms
        // TODO needs optimized
        if (scene) {
          scene.setLightUniforms(program, renderable.lightGroup, this);
        }
      } else {
        program = prevProgram;
      }

      // Program changes also needs reset the materials.
      if (
        programChanged ||
        passConfig.isMaterialChanged(renderable, prevRenderable, material, prevMaterial)
      ) {
        if (material.depthTest !== depthTest) {
          material.depthTest ? _gl.enable(_gl.DEPTH_TEST) : _gl.disable(_gl.DEPTH_TEST);
          depthTest = material.depthTest;
        }
        if (material.depthMask !== depthMask) {
          _gl.depthMask(material.depthMask);
          depthMask = material.depthMask;
        }
        if (material.transparent !== transparent) {
          material.transparent ? _gl.enable(_gl.BLEND) : _gl.disable(_gl.BLEND);
          transparent = material.transparent;
        }
        // TODO cache blending
        if (material.transparent) {
          if (material.blend) {
            material.blend(_gl);
          } else {
            // Default blend function
            _gl.blendEquationSeparate(_gl.FUNC_ADD, _gl.FUNC_ADD);
            _gl.blendFuncSeparate(
              _gl.SRC_ALPHA,
              _gl.ONE_MINUS_SRC_ALPHA,
              _gl.ONE,
              _gl.ONE_MINUS_SRC_ALPHA
            );
          }
        }

        materialTakesTextureSlot = this._bindMaterial(
          renderable,
          material,
          program,
          prevRenderable || null,
          prevMaterial || null,
          prevProgram || null,
          passConfig.getUniform
        );
        prevMaterial = material;
      }

      const matrixSemanticKeys = shader.matrixSemanticKeys;

      if (isSceneNode) {
        for (let k = 0; k < matrixSemanticKeys.length; k++) {
          const semantic = matrixSemanticKeys[k];
          const semanticInfo = shader.matrixSemantics[semantic];
          const matrix = matrices[semantic];
          if (semanticInfo.isTranspose) {
            const matrixNoTranspose = matrices[semanticInfo.semanticNoTranspose];
            mat4.transpose(matrix, matrixNoTranspose);
          }
          program.setUniform(_gl, semanticInfo.type, semanticInfo.symbol, matrix);
        }
      }

      if (renderable.cullFace !== cullFace) {
        cullFace = renderable.cullFace;
        _gl.cullFace(cullFace);
      }
      if (renderable.frontFace !== frontFace) {
        frontFace = renderable.frontFace;
        _gl.frontFace(frontFace);
      }
      if (renderable.culling !== culling) {
        culling = renderable.culling;
        culling ? _gl.enable(_gl.CULL_FACE) : _gl.disable(_gl.CULL_FACE);
      }
      // TODO Not update skeleton in each renderable.
      this._updateSkeleton(renderable, program, materialTakesTextureSlot);
      if (drawIDChanged) {
        currentVAO = this._bindVAO(vaoExt, shader, geometry, program);
      }
      this._renderObject(renderable, currentVAO, program);

      // After render hook
      passConfig.afterRender(this, renderable);
      renderable.afterRender && renderable.afterRender(this);

      prevProgram = program;
      prevRenderable = renderable;
    }

    // TODO Seems need to be bound to null immediately if vao is changed?
    if (vaoExt) {
      vaoExt.bindVertexArrayOES(null);
    }

    this.trigger('afterrenderpass', this, list, camera, passConfig);
  }

  getMaxJointNumber() {
    return this.maxJointNumber;
  }

  _updateSkeleton(object, program, slot) {
    const _gl = this.gl;
    const skeleton = object.skeleton;
    // Set pose matrices of skinned mesh
    if (skeleton) {
      // TODO Update before culling.
      skeleton.update();
      if (object.joints.length > this.getMaxJointNumber()) {
        const skinMatricesTexture = skeleton.getSubSkinMatricesTexture(
          object.__uid__,
          object.joints
        );
        program.useTextureSlot(this, skinMatricesTexture, slot);
        program.setUniform(_gl, '1i', 'skinMatricesTexture', slot);
        program.setUniform(_gl, '1f', 'skinMatricesTextureSize', skinMatricesTexture.width);
      } else {
        const skinMatricesArray = skeleton.getSubSkinMatrices(object.__uid__, object.joints);
        program.setUniformOfSemantic(_gl, 'SKIN_MATRIX', skinMatricesArray);
      }
    }
  }

  _renderObject(renderable, vao, program) {
    const _gl = this.gl;
    const geometry = renderable.geometry;

    let glDrawMode = renderable.mode;
    if (glDrawMode == null) {
      glDrawMode = 0x0004;
    }

    let ext = null;
    const isInstanced = renderable.isInstancedMesh && renderable.isInstancedMesh();
    if (isInstanced) {
      ext = this.getGLExtension('ANGLE_instanced_arrays');
      if (!ext) {
        console.warn('Device not support ANGLE_instanced_arrays extension');
        return;
      }
    }

    let instancedAttrLocations;
    if (isInstanced) {
      instancedAttrLocations = this._bindInstancedAttributes(renderable, program, ext);
    }

    if (vao.indicesBuffer) {
      const uintExt = this.getGLExtension('OES_element_index_uint');
      const useUintExt = uintExt && geometry.indices instanceof Uint32Array;
      const indicesType = useUintExt ? _gl.UNSIGNED_INT : _gl.UNSIGNED_SHORT;

      if (isInstanced) {
        ext.drawElementsInstancedANGLE(
          glDrawMode,
          vao.indicesBuffer.count,
          indicesType,
          0,
          renderable.getInstanceCount()
        );
      } else {
        _gl.drawElements(glDrawMode, vao.indicesBuffer.count, indicesType, 0);
      }
    } else {
      if (isInstanced) {
        ext.drawArraysInstancedANGLE(
          glDrawMode,
          0,
          geometry.vertexCount,
          renderable.getInstanceCount()
        );
      } else {
        // FIXME Use vertex number in buffer
        // vertexCount may get the wrong value when geometry forget to mark dirty after update
        _gl.drawArrays(glDrawMode, 0, geometry.vertexCount);
      }
    }

    if (isInstanced) {
      for (let i = 0; i < instancedAttrLocations.length; i++) {
        if (!instancedAttrLocations[i].enabled) {
          _gl.disableVertexAttribArray(instancedAttrLocations[i].location);
        }
        ext.vertexAttribDivisorANGLE(instancedAttrLocations[i].location, 0);
      }
    }
  }

  _bindInstancedAttributes(renderable, program, ext) {
    const _gl = this.gl;
    let instancedBuffers = renderable.getInstancedAttributesBuffers(this);
    const locations = [];

    for (let i = 0; i < instancedBuffers.length; i++) {
      const bufferObj = instancedBuffers[i];
      const location = program.getAttribLocation(_gl, bufferObj.symbol);
      if (location < 0) {
        continue;
      }

      const glType = attributeBufferTypeMap[bufferObj.type] || _gl.FLOAT;
      let isEnabled = program.isAttribEnabled(this, location);
      if (!program.isAttribEnabled(this, location)) {
        _gl.enableVertexAttribArray(location);
      }
      locations.push({
        location: location,
        enabled: isEnabled
      });
      _gl.bindBuffer(_gl.ARRAY_BUFFER, bufferObj.buffer);
      _gl.vertexAttribPointer(location, bufferObj.size, glType, false, 0, 0);
      ext.vertexAttribDivisorANGLE(location, bufferObj.divisor);
    }

    return locations;
  }

  _bindMaterial(
    renderable,
    material,
    program,
    prevRenderable,
    prevMaterial,
    prevProgram,
    getUniformValue
  ) {
    const _gl = this.gl;
    // PENDING Same texture in different material take different slot?

    // May use shader of other material if shader code are same
    const sameProgram = prevProgram === program;

    const currentTextureSlot = program.currentTextureSlot();
    const enabledUniforms = material.getEnabledUniforms();
    const textureUniforms = material.getTextureUniforms();
    const placeholderTexture = this._placeholderTexture;

    for (let u = 0; u < textureUniforms.length; u++) {
      const symbol = textureUniforms[u];
      const uniformValue = getUniformValue(renderable, material, symbol);
      const uniformType = material.uniforms[symbol].type;
      // Not use `instanceof` to determine if a value is texture in Material#bind.
      // Use type instead, in some case texture may be in different namespaces.
      // TODO Duck type validate.
      if (uniformType === 't' && uniformValue) {
        // Reset slot
        uniformValue.__slot = -1;
      } else if (uniformType === 'tv') {
        for (let i = 0; i < uniformValue.length; i++) {
          if (uniformValue[i]) {
            uniformValue[i].__slot = -1;
          }
        }
      }
    }

    placeholderTexture.__slot = -1;

    // Set uniforms
    for (let u = 0; u < enabledUniforms.length; u++) {
      const symbol = enabledUniforms[u];
      const uniform = material.uniforms[symbol];
      let uniformValue = getUniformValue(renderable, material, symbol);
      const uniformType = uniform.type;
      const isTexture = uniformType === 't';

      if (isTexture) {
        if (!uniformValue || !uniformValue.isRenderable()) {
          uniformValue = placeholderTexture;
        }
      }
      // PENDING
      // When binding two materials with the same shader
      // Many uniforms will be be set twice even if they have the same value
      // So add a evaluation to see if the uniform is really needed to be set
      if (prevMaterial && sameProgram) {
        let prevUniformValue = getUniformValue(prevRenderable, prevMaterial, symbol);
        if (isTexture) {
          if (!prevUniformValue || !prevUniformValue.isRenderable()) {
            prevUniformValue = placeholderTexture;
          }
        }

        if (prevUniformValue === uniformValue) {
          if (isTexture) {
            // Still take the slot to make sure same texture in different materials have same slot.
            program.takeCurrentTextureSlot(this, null);
          } else if (uniformType === 'tv' && uniformValue) {
            for (let i = 0; i < uniformValue.length; i++) {
              program.takeCurrentTextureSlot(this, null);
            }
          }
          continue;
        }
      }

      if (uniformValue == null) {
        continue;
      } else if (isTexture) {
        if (uniformValue.__slot < 0) {
          const slot = program.currentTextureSlot();
          const res = program.setUniform(_gl, '1i', symbol, slot);
          if (res) {
            // Texture uniform is enabled
            program.takeCurrentTextureSlot(this, uniformValue);
            uniformValue.__slot = slot;
          }
        }
        // Multiple uniform use same texture..
        else {
          program.setUniform(_gl, '1i', symbol, uniformValue.__slot);
        }
      } else if (Array.isArray(uniformValue)) {
        if (uniformValue.length === 0) {
          continue;
        }
        // Texture Array
        if (uniformType === 'tv') {
          if (!program.hasUniform(symbol)) {
            continue;
          }

          const arr = [];
          for (let i = 0; i < uniformValue.length; i++) {
            const texture = uniformValue[i];

            if (texture.__slot < 0) {
              const slot = program.currentTextureSlot();
              arr.push(slot);
              program.takeCurrentTextureSlot(this, texture);
              texture.__slot = slot;
            } else {
              arr.push(texture.__slot);
            }
          }

          program.setUniform(_gl, '1iv', symbol, arr);
        } else {
          program.setUniform(_gl, uniform.type, symbol, uniformValue);
        }
      } else {
        program.setUniform(_gl, uniform.type, symbol, uniformValue);
      }
    }
    const newSlot = program.currentTextureSlot();
    // Texture slot maybe used out of material.
    program.resetTextureSlot(currentTextureSlot);
    return newSlot;
  }

  _bindVAO(vaoExt, shader, geometry, program) {
    const isStatic = !geometry.dynamic;
    const _gl = this.gl;

    const vaoId = this.__uid__ + '-' + program.__uid__;
    let vao = geometry.__vaoCache[vaoId];
    if (!vao) {
      const chunks = geometry.getBufferChunks(this);
      if (!chunks || !chunks.length) {
        // Empty mesh
        return;
      }
      const chunk = chunks[0];
      const attributeBuffers = chunk.attributeBuffers;
      const indicesBuffer = chunk.indicesBuffer;

      const availableAttributes = [];
      const availableAttributeSymbols = [];
      for (let a = 0; a < attributeBuffers.length; a++) {
        const attributeBufferInfo = attributeBuffers[a];
        const name = attributeBufferInfo.name;
        const semantic = attributeBufferInfo.semantic;
        let symbol;
        if (semantic) {
          const semanticInfo = shader.attributeSemantics[semantic];
          symbol = semanticInfo && semanticInfo.symbol;
        } else {
          symbol = name;
        }
        if (symbol && program.attributes[symbol]) {
          availableAttributes.push(attributeBufferInfo);
          availableAttributeSymbols.push(symbol);
        }
      }

      vao = new VertexArrayObject(availableAttributes, availableAttributeSymbols, indicesBuffer);

      if (isStatic) {
        geometry.__vaoCache[vaoId] = vao;
      }
    }

    let needsBindAttributes = true;

    // Create vertex object array cost a lot
    // So we don't use it on the dynamic object
    if (vaoExt && isStatic) {
      // Use vertex array object
      // http://blog.tojicode.com/2012/10/oesvertexarrayobject-extension.html
      if (vao.vao == null) {
        vao.vao = vaoExt.createVertexArrayOES();
      } else {
        needsBindAttributes = false;
      }
      vaoExt.bindVertexArrayOES(vao.vao);
    }

    const availableAttributes = vao.availableAttributes;
    const indicesBuffer = vao.indicesBuffer;

    if (needsBindAttributes) {
      const locationList = program.enableAttributes(
        this,
        vao.availableAttributeSymbols,
        vaoExt && isStatic && vao
      );
      // Setting attributes;
      for (let a = 0; a < availableAttributes.length; a++) {
        const location = locationList[a];
        if (location === -1) {
          continue;
        }
        const attributeBufferInfo = availableAttributes[a];
        const buffer = attributeBufferInfo.buffer;
        const size = attributeBufferInfo.size;
        const glType = attributeBufferTypeMap[attributeBufferInfo.type] || _gl.FLOAT;

        _gl.bindBuffer(_gl.ARRAY_BUFFER, buffer);
        _gl.vertexAttribPointer(location, size, glType, false, 0, 0);
      }

      if (geometry.isUseIndices()) {
        _gl.bindBuffer(_gl.ELEMENT_ARRAY_BUFFER, indicesBuffer.buffer);
      }
    }

    return vao;
  }

  renderPreZ(list, scene, camera) {
    const _gl = this.gl;
    const preZPassMaterial =
      this._prezMaterial ||
      new Material({
        shader: new Shader(Shader.source('clay.prez.vertex'), Shader.source('clay.prez.fragment'))
      });
    this._prezMaterial = preZPassMaterial;
    if (this.logDepthBuffer) {
      this._prezMaterial.setUniform('logDepthBufFC', 2.0 / (Math.log(camera.far + 1.0) / Math.LN2));
    }

    _gl.colorMask(false, false, false, false);
    _gl.depthMask(true);

    // Status
    this.renderPass(list, camera, {
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
      getUniform(renderable, depthMaterial, symbol) {
        if (symbol === 'alphaMap') {
          return renderable.material.get('diffuseMap');
        } else if (symbol === 'alphaCutoff') {
          if (
            renderable.material.isDefined('fragment', 'ALPHA_TEST') &&
            renderable.material.get('diffuseMap')
          ) {
            const alphaCutoff = renderable.material.get('alphaCutoff');
            return alphaCutoff || 0;
          }
          return 0;
        } else if (symbol === 'uvRepeat') {
          return renderable.material.get('uvRepeat');
        } else if (symbol === 'uvOffset') {
          return renderable.material.get('uvOffset');
        } else {
          return depthMaterial.get(symbol);
        }
      },
      getMaterial() {
        return preZPassMaterial;
      },
      sort: this.opaqueSortCompare
    });

    _gl.colorMask(true, true, true, true);
    _gl.depthMask(true);
  }

  /**
   * Dispose given scene, including all geometris, textures and shaders in the scene
   * @param {clay.Scene} scene
   */
  disposeScene(scene) {
    this.disposeNode(scene, true, true);
    scene.dispose();
  }

  /**
   * Dispose given node, including all geometries, textures and shaders attached on it or its descendant
   * @param {clay.Node} node
   * @param {boolean} [disposeGeometry=false] If dispose the geometries used in the descendant mesh
   * @param {boolean} [disposeTexture=false] If dispose the textures used in the descendant mesh
   */
  disposeNode(root, disposeGeometry, disposeTexture) {
    // Dettached from parent
    if (root.getParent()) {
      root.getParent().remove(root);
    }
    const disposedMap = {};
    root.traverse(function (node) {
      const material = node.material;
      if (node.geometry && disposeGeometry) {
        node.geometry.dispose(this);
      }
      if (disposeTexture && material && !disposedMap[material.__uid__]) {
        const textureUniforms = material.getTextureUniforms();
        for (let u = 0; u < textureUniforms.length; u++) {
          const uniformName = textureUniforms[u];
          const val = material.uniforms[uniformName].value;
          const uniformType = material.uniforms[uniformName].type;
          if (!val) {
            continue;
          }
          if (uniformType === 't') {
            val.dispose && val.dispose(this);
          } else if (uniformType === 'tv') {
            for (let k = 0; k < val.length; k++) {
              if (val[k]) {
                val[k].dispose && val[k].dispose(this);
              }
            }
          }
        }
        disposedMap[material.__uid__] = true;
      }
      // Particle system and AmbientCubemap light need to dispose
      if (node.dispose) {
        node.dispose(this);
      }
    }, this);
  }

  /**
   * Dispose given geometry
   * @param {clay.Geometry} geometry
   */
  disposeGeometry(geometry) {
    geometry.dispose(this);
  }

  /**
   * Dispose given texture
   * @param {clay.Texture} texture
   */
  disposeTexture(texture) {
    texture.dispose(this);
  }

  /**
   * Dispose given frame buffer
   * @param {clay.FrameBuffer} frameBuffer
   */
  disposeFrameBuffer(frameBuffer) {
    frameBuffer.dispose(this);
  }

  /**
   * Dispose renderer
   */
  dispose() {}

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
  screenToNDC(x, y, out) {
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
}

/**
 * Opaque renderables compare function
 * @param  {clay.Renderable} x
 * @param  {clay.Renderable} y
 * @return {boolean}
 * @static
 */
Renderer.opaqueSortCompare = Renderer.prototype.opaqueSortCompare = function (x, y) {
  // Priority renderOrder -> program -> material -> geometry
  if (x.renderOrder === y.renderOrder) {
    if (x.__program === y.__program) {
      if (x.material === y.material) {
        return x.geometry.__uid__ - y.geometry.__uid__;
      }
      return x.material.__uid__ - y.material.__uid__;
    }
    if (x.__program && y.__program) {
      return x.__program.__uid__ - y.__program.__uid__;
    }
    return 0;
  }
  return x.renderOrder - y.renderOrder;
};

/**
 * Transparent renderables compare function
 * @param  {clay.Renderable} a
 * @param  {clay.Renderable} b
 * @return {boolean}
 * @static
 */
Renderer.transparentSortCompare = Renderer.prototype.transparentSortCompare = function (x, y) {
  // Priority renderOrder -> depth -> program -> material -> geometry

  if (x.renderOrder === y.renderOrder) {
    if (x.__depth === y.__depth) {
      if (x.__program === y.__program) {
        if (x.material === y.material) {
          return x.geometry.__uid__ - y.geometry.__uid__;
        }
        return x.material.__uid__ - y.material.__uid__;
      }
      if (x.__program && y.__program) {
        return x.__program.__uid__ - y.__program.__uid__;
      }
      return 0;
    }
    // Depth is negative
    // So farther object has smaller depth value
    return x.__depth - y.__depth;
  }
  return x.renderOrder - y.renderOrder;
};

// Temporary variables
const matrices = {
  IDENTITY: mat4Create(),

  WORLD: mat4Create(),
  VIEW: mat4Create(),
  PROJECTION: mat4Create(),
  WORLDVIEW: mat4Create(),
  VIEWPROJECTION: mat4Create(),
  WORLDVIEWPROJECTION: mat4Create(),

  WORLDINVERSE: mat4Create(),
  VIEWINVERSE: mat4Create(),
  PROJECTIONINVERSE: mat4Create(),
  WORLDVIEWINVERSE: mat4Create(),
  VIEWPROJECTIONINVERSE: mat4Create(),
  WORLDVIEWPROJECTIONINVERSE: mat4Create(),

  WORLDTRANSPOSE: mat4Create(),
  VIEWTRANSPOSE: mat4Create(),
  PROJECTIONTRANSPOSE: mat4Create(),
  WORLDVIEWTRANSPOSE: mat4Create(),
  VIEWPROJECTIONTRANSPOSE: mat4Create(),
  WORLDVIEWPROJECTIONTRANSPOSE: mat4Create(),
  WORLDINVERSETRANSPOSE: mat4Create(),
  VIEWINVERSETRANSPOSE: mat4Create(),
  PROJECTIONINVERSETRANSPOSE: mat4Create(),
  WORLDVIEWINVERSETRANSPOSE: mat4Create(),
  VIEWPROJECTIONINVERSETRANSPOSE: mat4Create(),
  WORLDVIEWPROJECTIONINVERSETRANSPOSE: mat4Create()
};

/**
 * @name clay.Renderer.COLOR_BUFFER_BIT
 * @type {number}
 */
Renderer.COLOR_BUFFER_BIT = glenum.COLOR_BUFFER_BIT;
/**
 * @name clay.Renderer.DEPTH_BUFFER_BIT
 * @type {number}
 */
Renderer.DEPTH_BUFFER_BIT = glenum.DEPTH_BUFFER_BIT;
/**
 * @name clay.Renderer.STENCIL_BUFFER_BIT
 * @type {number}
 */
Renderer.STENCIL_BUFFER_BIT = glenum.STENCIL_BUFFER_BIT;

export default Renderer;
