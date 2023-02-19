import GLExtension from './GLExtension';
import { GLEnum } from '../core/type';
import vendor from '../core/vendor';
import GeometryBase from '../GeometryBase';
import InstancedMesh from '../InstancedMesh';
import { GeneralMaterialUniformObject } from '../Material';
import type { Matrix4 } from '../math';
import Mesh from '../Mesh';
import Skeleton from '../Skeleton';
import GLProgram from './GLProgram';
import ProgramManager from './ProgramManager';
import { assert, genGUID, isArray, keys, optional } from '../core/util';
import type Texture from '../Texture';
import FrameBuffer from '../FrameBuffer';
import Texture2D from '../Texture2D';
import GLTexture from './GLTexture';
import TextureCube from '../TextureCube';
import GLBuffers from './GLBuffers';
import * as constants from '../core/constants';
import Shader, { isTextureUniform, ShaderDefineValue, ShaderPrecision } from '../Shader';
import GLInstancedBuffers from './GLInstancedBuffers';
import GLFrameBuffer from './GLFrameBuffer';

const errorShader: Record<string, boolean> = {};

function defaultGetMaterial(renderable: GLRenderableObject) {
  return renderable.material;
}
function defaultGetUniform(
  renderable: GLRenderableObject,
  material: GLMaterialObject,
  symbol: string
) {
  return material.uniforms![symbol].value;
}
function defaultIsMaterialChanged(
  renderable: GLRenderableObject,
  prevRenderable: GLRenderableObject,
  material: GLMaterialObject,
  prevMaterial: GLMaterialObject
) {
  return material !== prevMaterial;
}
function defaultIfRender() {
  return true;
}

function noop() {}

/**
 * A very basic material that is used in renderPass
 */
export interface GLMaterialObject {
  uid?: number;

  shader: Shader;
  uniforms?: Shader['uniformTpls'];

  depthTest?: boolean;
  depthMask?: boolean;
  transparent?: boolean;

  blend?: (gl: WebGL2RenderingContext) => void;

  precision?: ShaderPrecision;

  vertexDefines?: Record<string, ShaderDefineValue>;
  fragmentDefines?: Record<string, ShaderDefineValue>;

  getEnabledUniforms?(): string[];
  getTextureUniforms?(): string[];

  getEnabledTextures?(): string[];
  getProgramKey?(): string;
}
/**
 * A very basic renderable that is used in renderPass
 */
export interface GLRenderableObject<T extends GLMaterialObject = GLMaterialObject> {
  geometry: GeometryBase;
  material: T;
  mode?: GLEnum;
  lightGroup?: number;
  worldTransform?: Matrix4;

  cullFace?: GLEnum;
  frontFace?: GLEnum;

  culling?: boolean;
  ignorePreZ?: boolean;

  isSkinnedMesh?(): this is Mesh & { skeleton: Skeleton };
  isInstancedMesh?(): this is InstancedMesh;

  beforeRender?(): void;
  afterRender?(): void;
}

export interface ExtendedRenderableObject<T extends GLMaterialObject = GLMaterialObject>
  extends GLRenderableObject<T> {
  __program: GLProgram;
  // Depth for transparent list sorting
  __depth: number;
  renderOrder: number;
}

export interface GLRenderHooks<T extends GLRenderableObject = GLRenderableObject> {
  ifRender?(renderable: T): boolean;
  /**
   * Get material of renderable
   */
  getMaterial?(renderable: T): GLMaterialObject;

  /**
   * Get uniform from material
   */
  getMaterialUniform?(renderable: T, material: T['material'], symbol: string): any;

  /**
   * Get common uniforms to bind.
   * Renderable that trigger programs changed.
   */
  getCommonUniforms?(
    renderable: T
  ):
    | Record<string, GeneralMaterialUniformObject>
    | undefined
    | Record<string, GeneralMaterialUniformObject>[];

  /**
   * Get extra defines in shader for program.
   */
  getExtraDefines?(renderable: T, material: T['material']): Record<string, ShaderDefineValue>;
  /**
   * Get extra key for program
   */
  getProgramKey?(renderable: T, material: T['material']): string;
  /**
   * Set common uniforms once for each program
   */
  programChanged?(program: GLProgram): void;

  /**
   * Set uniforms for each program.
   * Uniform in material will be set automatically
   */
  renderableChanged?(renderable: T, material: T['material'], program: GLProgram): void;

  isMaterialChanged?(
    renderable: T,
    prevRenderable: T,
    material: GLMaterialObject,
    prevMaterial: GLMaterialObject
  ): boolean;

  sortCompare?: (a: T & ExtendedRenderableObject, b: T & ExtendedRenderableObject) => number;

  beforeRender?: (
    renderable: T,
    material: GLMaterialObject,
    prevMaterial: GLMaterialObject | undefined
  ) => void;
  afterRender?: (renderable: T) => void;
}

export type SupportedExtension =
  | 'EXT_color_buffer_float'
  | 'EXT_color_buffer_half_float'
  | 'EXT_disjoint_timer_query_webgl2'
  | 'EXT_float_blend'
  | 'EXT_texture_compression_rgtc'
  | 'EXT_texture_filter_anisotropic'
  | 'EXT_texture_norm16'
  | 'KHR_parallel_shader_compile'
  | 'OES_draw_buffers_indexed'
  | 'OES_texture_float_linear'
  | 'WEBGL_compressed_texture_s3tc'
  | 'WEBGL_compressed_texture_s3tc_srgb'
  | 'WEBGL_debug_renderer_info'
  | 'WEBGL_debug_shaders'
  | 'WEBGL_lose_context'
  | 'WEBGL_multi_draw';

/**
 * Basic webgl renderer without scene management.
 */
class GLPipeline {
  readonly gl: WebGL2RenderingContext;

  readonly uid = genGUID();

  private _programMgr: ProgramManager;

  private _blankTexture?: Texture2D;

  private _glext: GLExtension;

  private _glTextureMap = new WeakMap<Texture, GLTexture>();
  private _glBuffersMap = new WeakMap<GeometryBase, GLBuffers>();
  private _glInstancedBufferMap = new WeakMap<InstancedMesh, GLInstancedBuffers>();
  private _glFrameBufferMap = new WeakMap<FrameBuffer, GLFrameBuffer>();

  /// Framebuffer
  private _framebuffer?: FrameBuffer | null;

  private _viewport?: {
    x: number;
    y: number;
    width: number;
    height: number;
    pixelRatio: number;
  };

  throwError: boolean;

  maxJointNumber = 20;

  constructor(
    gl: WebGL2RenderingContext,
    opts?: {
      throwError?: boolean;
    }
  ) {
    opts = opts || {};
    this.gl = gl;
    // Init managers
    this._programMgr = new ProgramManager(this);
    this._glext = new GLExtension(gl, gl.getSupportedExtensions() || []);
    this.throwError = optional(opts.throwError, true);
  }

  setViewport(x: number, y: number, width: number, height: number, dpr: number) {
    this._viewport = {
      x,
      y,
      width,
      height,
      pixelRatio: dpr
    };
    this.gl.viewport(x * dpr, y * dpr, width * dpr, height * dpr);
  }

  getViewport() {
    return this._viewport || { x: 0, y: 0, width: 0, height: 0, pixelRatio: 1 };
  }

  /**
   * Bind framebuffer before render
   *
   * Set null too unbind
   */
  bindFrameBuffer(frameBuffer?: FrameBuffer | null) {
    const prevFrameBuffer = this._framebuffer;
    const glFrameBufferMap = this._glFrameBufferMap;
    const gl = this.gl;
    let glFrameBuffer;
    if (frameBuffer) {
      assert(frameBuffer.getWidth() > 0, 'No textures attached');

      glFrameBuffer = glFrameBufferMap.get(frameBuffer);
      if (!glFrameBuffer) {
        glFrameBuffer = new GLFrameBuffer(frameBuffer);
        glFrameBufferMap.set(frameBuffer, glFrameBuffer);
      }
    }
    // Unbind if there is no new framebuffer. Else only update mipmap
    const prevGLFrameBuffer = prevFrameBuffer && glFrameBufferMap.get(prevFrameBuffer);
    prevGLFrameBuffer && prevGLFrameBuffer.unbind(gl, glFrameBuffer);
    if (glFrameBuffer) {
      glFrameBuffer.bind(gl, {
        getGLTexture: (texture) => this._getGLTexture(texture),
        getGLExtension: (name) => this._glext.getExtension(name)
      });
    }
    this._framebuffer = frameBuffer;
  }

  /**
   * Render a single renderable list in camera in sequence
   * @param list List of all renderables.
   * @param renderHooks
   */
  render(list: GLRenderableObject[], renderHooks?: GLRenderHooks) {
    renderHooks = renderHooks || {};
    renderHooks.getMaterial = renderHooks.getMaterial || defaultGetMaterial;
    renderHooks.getMaterialUniform = renderHooks.getMaterialUniform || defaultGetUniform;
    // PENDING Better solution?
    renderHooks.isMaterialChanged = renderHooks.isMaterialChanged || defaultIsMaterialChanged;
    renderHooks.beforeRender = renderHooks.beforeRender || noop;
    renderHooks.afterRender = renderHooks.afterRender || noop;

    const ifRenderObject = renderHooks.ifRender || defaultIfRender;

    this._updatePrograms(list, renderHooks);
    if (renderHooks.sortCompare) {
      (list as ExtendedRenderableObject[]).sort(renderHooks.sortCompare);
    }

    // Some common builtin uniforms
    const gl = this.gl;

    let prevMaterial: GLMaterialObject | undefined;
    let prevProgram: GLProgram | undefined;
    let prevRenderable: GLRenderableObject | undefined;

    // Status
    let depthTest: boolean | undefined, depthMask: boolean | undefined;
    let culling: boolean | undefined, cullFace: GLEnum | undefined, frontFace: GLEnum | undefined;
    let transparent: boolean | undefined;
    let drawID: string | undefined;
    let materialTakesTextureSlot: number | undefined;
    let currentBuffers: GLBuffers | undefined;

    for (let i = 0; i < list.length; i++) {
      const renderable = list[i];

      if (!ifRenderObject(renderable)) {
        continue;
      }

      const geometry = renderable.geometry;
      const material = renderHooks.getMaterial.call(this, renderable);

      let program = (renderable as ExtendedRenderableObject).__program;

      // If has error in shader and program is invalid
      if (!program.isValid()) {
        continue;
      }

      const currentDrawID = geometry.uid + '-' + program.uid;
      const drawIDChanged = currentDrawID !== drawID;
      drawID = currentDrawID;

      // Before render hook
      renderable.beforeRender && renderable.beforeRender();
      renderHooks.beforeRender(renderable, material, prevMaterial);

      const programChanged = program !== prevProgram;
      if (programChanged) {
        // Set lights number
        program.bind(gl);
        renderHooks.programChanged && renderHooks.programChanged(program);
        const commonUniforms =
          renderHooks.getCommonUniforms && renderHooks.getCommonUniforms(renderable);
        if (isArray(commonUniforms)) {
          for (let i = 0; i < commonUniforms.length; i++) {
            this._setCommonUniforms(program, commonUniforms[i]);
          }
        } else if (commonUniforms) {
          this._setCommonUniforms(program, commonUniforms);
        }
      } else {
        program = prevProgram!;
      }

      // Program changes also needs reset the materials.
      if (
        programChanged ||
        renderHooks.isMaterialChanged(renderable, prevRenderable!, material, prevMaterial!)
      ) {
        if (material.depthTest !== depthTest) {
          depthTest = material.depthTest;
          depthTest ? gl.enable(constants.DEPTH_TEST) : gl.disable(constants.DEPTH_TEST);
        }
        if (material.depthMask !== depthMask) {
          depthMask = material.depthMask;
          gl.depthMask(depthMask || false);
        }
        if (material.transparent !== transparent) {
          transparent = material.transparent;
          transparent ? gl.enable(constants.BLEND) : gl.disable(constants.BLEND);
        }
        // TODO cache blending
        if (transparent) {
          if (material.blend) {
            material.blend(gl);
          } else {
            // Default blend function
            gl.blendEquationSeparate(constants.FUNC_ADD, constants.FUNC_ADD);
            gl.blendFuncSeparate(
              constants.SRC_ALPHA,
              constants.ONE_MINUS_SRC_ALPHA,
              constants.ONE,
              constants.ONE_MINUS_SRC_ALPHA
            );
          }
        }

        materialTakesTextureSlot = this._bindMaterial(
          renderable,
          material,
          program,
          renderHooks.getMaterialUniform
        );
        prevMaterial = material;
      }

      renderHooks.renderableChanged && renderHooks.renderableChanged(renderable, material, program);

      if (renderable.cullFace !== cullFace) {
        cullFace = renderable.cullFace;
        gl.cullFace(cullFace!);
      }
      if (renderable.frontFace !== frontFace) {
        frontFace = renderable.frontFace;
        gl.frontFace(frontFace!);
      }
      if (renderable.culling !== culling) {
        culling = renderable.culling;
        culling ? gl.enable(constants.CULL_FACE) : gl.disable(constants.CULL_FACE);
      }
      // TODO Not update skeleton in each renderable.
      this._updateSkeleton(renderable as Mesh, program, materialTakesTextureSlot!);
      if (drawIDChanged) {
        const glBuffersMap = this._glBuffersMap;
        let buffers = glBuffersMap.get(geometry);
        if (!buffers) {
          // Force mark geometry to be dirty
          // In case this geometry is used by multiple gl context.
          geometry.dirty();
          buffers = new GLBuffers(geometry);
          glBuffersMap.set(geometry, buffers);
        }
        buffers.bindToProgram(gl, program);
        currentBuffers = buffers;
      }
      this._renderObject(renderable, currentBuffers!, program);

      // After render hook
      renderHooks.afterRender(renderable);
      renderable.afterRender && renderable.afterRender();

      prevProgram = program;
      prevRenderable = renderable;
    }
  }

  private _updatePrograms(list: GLRenderableObject[], renderHooks: GLRenderHooks) {
    const getMaterial = renderHooks.getMaterial || defaultGetMaterial;
    for (let i = 0; i < list.length; i++) {
      const renderable = list[i];
      const renderMaterial = getMaterial.call(this, renderable);
      if (i > 0) {
        const prevRenderable = list[i - 1];
        const prevJointsLen = (prevRenderable as Mesh).joints
          ? (prevRenderable as Mesh).joints.length
          : 0;
        const jointsLen = (renderable as Mesh).joints ? (renderable as Mesh).joints.length : 0;
        // Keep program not change if joints, material, lightGroup are same of two renderables.
        if (
          jointsLen === prevJointsLen &&
          renderable.material === prevRenderable.material &&
          renderable.lightGroup === prevRenderable.lightGroup
        ) {
          (renderable as ExtendedRenderableObject).__program = (
            prevRenderable as ExtendedRenderableObject
          ).__program;
          continue;
        }
      }

      const program = this._programMgr.getProgram(
        renderable,
        renderMaterial,
        (renderHooks.getProgramKey && renderHooks.getProgramKey(renderable, renderMaterial)) || '',
        renderHooks.getExtraDefines && renderHooks.getExtraDefines(renderable, renderMaterial)
      );

      this._validateProgram(program);

      (renderable as ExtendedRenderableObject).__program = program;
    }
  }

  getWebGLExtension(extName: string) {
    return this._glext.getExtension(extName);
  }

  private _getGLTexture(texture: Texture, notUpdate?: boolean) {
    const glTextureMap = this._glTextureMap;
    let glTexture = glTextureMap.get(texture);
    if (!glTexture) {
      glTexture = new GLTexture(texture as Texture2D | TextureCube);
      glTextureMap.set(texture, glTexture);
    }
    if (texture.__dirty && !notUpdate) {
      glTexture.update(this.gl, this._glext);
      texture.__dirty = false;
    }
    return glTexture;
  }

  private _validateProgram(program: GLProgram) {
    if (program.__error) {
      const errorMsg = program.__error;
      if (errorShader[program.uid]) {
        return;
      }
      errorShader[program.uid] = true;

      if (this.throwError) {
        throw new Error(errorMsg);
      } else {
        // this.trigger('error', errorMsg);
      }
    }
  }

  private _updateSkeleton(object: Mesh, program: GLProgram, slot: number) {
    const gl = this.gl;
    const skeleton = object.skeleton;
    // Set pose matrices of skinned mesh
    if (skeleton) {
      // TODO Update before culling.
      skeleton.update();
      if (object.joints.length > this.maxJointNumber) {
        const skinMatricesTexture = skeleton.getSubSkinMatricesTexture(object.uid, object.joints);
        program.useTextureSlot(gl, this._getGLTexture(skinMatricesTexture), slot);
        program.set(gl, 'int', 'skinMatricesTexture', slot, false);
        program.set(gl, 'float', 'skinMatricesTextureSize', skinMatricesTexture.width, false);
      } else {
        const skinMatricesArray = skeleton.getSubSkinMatrices(object.uid, object.joints);
        program.set(gl, 'mat4', 'skinMatrix', skinMatricesArray, true);
      }
    }
  }

  private _renderObject(renderable: GLRenderableObject, buffer: GLBuffers, program: GLProgram) {
    const _gl = this.gl;
    const geometry = renderable.geometry;

    let glDrawMode = renderable.mode;
    if (glDrawMode == null) {
      glDrawMode = 0x0004;
    }

    const isInstanced = renderable.isInstancedMesh && renderable.isInstancedMesh();

    let instancedAttrLocations: number[] | undefined;
    if (isInstanced) {
      const instancedBufferMap = this._glInstancedBufferMap;
      let buffer = instancedBufferMap.get(renderable as InstancedMesh);
      if (!buffer) {
        // Force mark renderable to be dirty if its a new created buffer.
        // In case the object is used by multiple gl context.
        renderable.__dirty = true;
        buffer = new GLInstancedBuffers(renderable as InstancedMesh);
        instancedBufferMap.set(renderable as InstancedMesh, buffer);
      }
      instancedAttrLocations = buffer.bindToProgram(this.gl, program);
    }

    const indicesBuffer = buffer.getIndicesBuffer();

    if (indicesBuffer) {
      const isUint = geometry.indices instanceof Uint32Array;
      const indicesType = isUint ? constants.UNSIGNED_INT : constants.UNSIGNED_SHORT;

      if (isInstanced) {
        _gl.drawElementsInstanced(
          glDrawMode,
          indicesBuffer.count,
          indicesType,
          0,
          renderable.getInstanceCount()
        );
      } else {
        _gl.drawElements(glDrawMode, indicesBuffer.count, indicesType, 0);
      }
    } else {
      if (isInstanced) {
        _gl.drawArraysInstanced(glDrawMode, 0, geometry.vertexCount, renderable.getInstanceCount());
      } else {
        // FIXME Use vertex number in buffer
        // vertexCount may get the wrong value when geometry forget to mark dirty after update
        _gl.drawArrays(glDrawMode, 0, geometry.vertexCount);
      }
    }

    if (instancedAttrLocations) {
      for (let i = 0; i < instancedAttrLocations.length; i++) {
        _gl.disableVertexAttribArray(instancedAttrLocations[i]);
        _gl.vertexAttribDivisor(instancedAttrLocations[i], 0);
      }
    }
  }

  private _getBlankTexture() {
    return (
      this._blankTexture ||
      (this._blankTexture = new Texture2D({
        source: vendor.createBlankCanvas('#000')
      }))
    );
  }

  private _setCommonUniforms(
    program: GLProgram,
    uniforms: Record<string, GeneralMaterialUniformObject>
  ) {
    const gl = this.gl;
    for (const symbol in uniforms) {
      const lu = uniforms[symbol];
      if (!program.hasUniform(symbol)) {
        continue;
      }
      if (isTextureUniform(lu)) {
        if (lu.array) {
          const texSlots = [];
          for (let i = 0; i < lu.value.length; i++) {
            const texture = lu.value[i];
            const slot = program.takeTextureSlot(gl, this._getGLTexture(texture));
            texSlots.push(slot);
          }
          program.set(gl, 'int', symbol, texSlots, true);
        } else {
          program.set(
            gl,
            'int',
            symbol,
            program.takeTextureSlot(gl, this._getGLTexture(lu.value)),
            false
          );
        }
      } else {
        program.set(gl, lu.type, symbol, lu.value, lu.array);
      }
    }
  }

  private _bindMaterial(
    renderable: GLRenderableObject,
    material: GLMaterialObject,
    program: GLProgram,
    getUniformValue: GLRenderHooks['getMaterialUniform']
  ) {
    const gl = this.gl;
    // PENDING Same texture in different material take different slot?

    const uniforms = material.uniforms || {};
    const currentTextureSlot = program.currentTextureSlot();
    const enabledUniforms = material.getEnabledUniforms
      ? material.getEnabledUniforms()
      : keys(uniforms);
    const textureUniforms = material.getTextureUniforms
      ? material.getTextureUniforms()
      : enabledUniforms.filter((uniformName) => isTextureUniform(uniforms[uniformName]));
    const placeholderTexture = this._getBlankTexture();

    const getGLTexture = (texture: Texture) => {
      return this._getGLTexture(texture);
    };

    for (let u = 0; u < textureUniforms.length; u++) {
      const symbol = textureUniforms[u];
      const uniformValue = getUniformValue!(renderable, material, symbol);
      if (isTextureUniform(uniforms[symbol])) {
        // Reset slot
        if (uniforms[symbol].array) {
          // TODO
          for (let i = 0; i < uniformValue.length; i++) {
            if (uniformValue[i] && (uniformValue as Texture).isRenderable()) {
              getGLTexture(uniformValue[i]).slot = -1;
            }
          }
        } else if (uniformValue && (uniformValue as Texture).isRenderable()) {
          getGLTexture(uniformValue).slot = -1;
        }
      }
    }

    this._getGLTexture(placeholderTexture, true).slot = -1;

    function getTextureSlot(texture: Texture) {
      const glTexture = getGLTexture(texture);
      if (glTexture.slot < 0) {
        const slot = program.currentTextureSlot();
        program.takeTextureSlot(gl, glTexture);
        glTexture.slot = slot;
      }
      return glTexture.slot;
    }

    // Set uniforms
    for (let u = 0; u < enabledUniforms.length; u++) {
      const symbol = enabledUniforms[u];

      if (!program.hasUniform(symbol)) {
        continue;
      }

      const uniform = material.uniforms![symbol];
      const isUniformValueArray = uniform.array;
      const isTexture = isTextureUniform(uniform);
      const uniformType = isTexture ? 'int' : uniform.type;
      let uniformValue = getUniformValue!(renderable, material, symbol);

      if (isTexture) {
        if (!uniformValue || !uniformValue.isRenderable()) {
          uniformValue = placeholderTexture;
        }
      }

      if (uniformValue == null) {
        continue;
      }

      if (isTexture) {
        // Texture Array
        if (isUniformValueArray) {
          uniformValue = [];
          for (let i = 0; i < uniformValue.length; i++) {
            uniformValue.push(getTextureSlot(uniformValue[i]));
          }
        } else {
          uniformValue = getTextureSlot(uniformValue);
        }
      }

      program.set(gl, uniformType, symbol, uniformValue, isUniformValueArray || false);
    }
    const newSlot = program.currentTextureSlot();
    // Texture slot maybe used out of material.
    program.resetTextureSlot(currentTextureSlot);
    return newSlot;
  }

  /**
   * Dispose given geometry
   * @param geometry
   */
  disposeGeometry(geometry: GeometryBase) {
    this._disposeResource(this._glBuffersMap, geometry);
  }

  /**
   * Dispose given texture
   * @param texture
   */
  disposeTexture(texture: Texture) {
    this._disposeResource(this._glTextureMap, texture);
  }

  /**
   * Dispose given frame buffer
   * @param frameBuffer
   */
  disposeFrameBuffer(frameBuffer: FrameBuffer) {
    // TODO unbind if framebuffer is in usage?
    this._disposeResource(this._glFrameBufferMap, frameBuffer);
  }

  /**
   * Dispose instanced mesh
   */
  disposeInstancedMesh(mesh: InstancedMesh) {
    this._disposeResource(this._glInstancedBufferMap, mesh);
  }

  private _disposeResource<T extends GeometryBase | Texture | FrameBuffer | InstancedMesh>(
    // TODO provide disposable
    storage: WeakMap<T, { dispose: (gl: WebGL2RenderingContext) => void }>,
    resource: T
  ) {
    const obj = storage.get(resource);
    if (obj) {
      obj.dispose(this.gl);
      storage.delete(resource);
    }
  }
}

export default GLPipeline;
