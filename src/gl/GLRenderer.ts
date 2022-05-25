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
import { genGUID, isArray, keys, optional } from '../core/util';
import type Texture from '../Texture';
import FrameBuffer from '../FrameBuffer';
import Texture2D from '../Texture2D';
import GLTexture from './GLTexture';
import TextureCube from '../TextureCube';
import GLBuffers from './GLBuffers';
import * as constants from '../core/constants';
import Shader, { ShaderDefineValue, ShaderPrecision } from '../Shader';
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
  __uid__?: number;

  shader: Shader;
  uniforms?: Shader['uniformTpls'];

  depthTest?: boolean;
  depthMask?: boolean;
  transparent?: boolean;

  blend?: (gl: WebGLRenderingContext) => void;

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
  lightGroup: number;
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
   * Get common shader header code in shader for program.
   */
  getShaderDefineCode?(renderable: T, material: T['material']): string;
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

const OES_texture = 'OES_texture';
const WEBGL_compressed_texture = 'WEBGL_compressed_texture';

const GL1_EXTENSION_LIST = [
  `${OES_texture}_float`,
  `${OES_texture}_half_float`,
  `${OES_texture}_float_linear`,
  `${OES_texture}_half_float_linear`,
  'OES_standard_derivatives',
  'OES_vertex_array_object',
  'OES_element_index_uint',
  `${WEBGL_compressed_texture}_s3tc`,
  `${WEBGL_compressed_texture}_etc`,
  `${WEBGL_compressed_texture}_etc1`,
  `${WEBGL_compressed_texture}_pvrtc`,
  `${WEBGL_compressed_texture}_atc`,
  `${WEBGL_compressed_texture}_astc`,
  'WEBGL_depth_texture',
  'EXT_texture_filter_anisotropic',
  'EXT_shader_texture_lod',
  'WEBGL_draw_buffers',
  'EXT_frag_depth',
  'EXT_sRGB',
  'ANGLE_instanced_arrays'
] as const;

/**
 * Basic webgl renderer without scene management.
 */
class GLRenderer {
  readonly gl: WebGLRenderingContext;

  readonly __uid__ = genGUID();

  private _programMgr: ProgramManager;

  private _blankTexture?: Texture2D;

  private _glext: GLExtension;

  private _glTextureMap = new WeakMap<Texture, GLTexture>();
  private _glBuffersMap = new WeakMap<GeometryBase, GLBuffers>();
  private _glInstancedBufferMap = new WeakMap<InstancedMesh, GLInstancedBuffers>();
  private _glFrameBufferMap = new WeakMap<FrameBuffer, GLFrameBuffer>();

  /// Framebuffer
  private _framebuffer?: FrameBuffer | null;

  throwError: boolean;

  maxJointNumber = 20;

  constructor(
    gl: WebGLRenderingContext,
    opts?: {
      throwError?: boolean;
    }
  ) {
    opts = opts || {};
    this.gl = gl;
    // Init managers
    this._programMgr = new ProgramManager(this);
    this._glext = new GLExtension(gl, GL1_EXTENSION_LIST);
    this.throwError = optional(opts.throwError, true);
  }

  setViewport(x: number, y: number, width: number, height: number, dpr: number) {
    this.gl.viewport(x * dpr, y * dpr, width * dpr, height * dpr);
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
      glFrameBuffer = glFrameBufferMap.get(frameBuffer);
      if (!glFrameBuffer) {
        glFrameBuffer = new GLFrameBuffer(frameBuffer);
        glFrameBufferMap.set(frameBuffer, glFrameBuffer);
      }
    }
    // Unbind if there is no new framebuffer. Else only update mipmap
    prevFrameBuffer && glFrameBufferMap.get(prevFrameBuffer)!.unbind(gl, glFrameBuffer);
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

      const currentDrawID = geometry.__uid__ + '-' + program.__uid__;
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
        (renderHooks.getShaderDefineCode &&
          renderHooks.getShaderDefineCode(renderable, renderMaterial)) ||
          ''
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
      if (errorShader[program.__uid__]) {
        return;
      }
      errorShader[program.__uid__] = true;

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
        const skinMatricesTexture = skeleton.getSubSkinMatricesTexture(
          object.__uid__,
          object.joints
        );
        program.useTextureSlot(gl, this._getGLTexture(skinMatricesTexture), slot);
        program.set(gl, '1i', 'skinMatricesTexture', slot);
        program.set(gl, '1f', 'skinMatricesTextureSize', skinMatricesTexture.width);
      } else {
        const skinMatricesArray = skeleton.getSubSkinMatrices(object.__uid__, object.joints);
        program.set(gl, 'm4v', 'skinMatrix', skinMatricesArray);
      }
    }
  }

  private _renderObject(renderable: GLRenderableObject, buffer: GLBuffers, program: GLProgram) {
    const _gl = this.gl;
    const geometry = renderable.geometry;
    const glext = this._glext;

    let glDrawMode = renderable.mode;
    if (glDrawMode == null) {
      glDrawMode = 0x0004;
    }

    let instancedExt;
    const isInstanced = renderable.isInstancedMesh && renderable.isInstancedMesh();
    if (isInstanced) {
      instancedExt = glext.getExtension('ANGLE_instanced_arrays');
      if (!instancedExt) {
        console.warn('Device not support ANGLE_instanced_arrays extension');
        return;
      }
    }

    let instancedAttrLocations: number[] | undefined;
    if (isInstanced) {
      const instancedBufferMap = this._glInstancedBufferMap;
      let buffer = instancedBufferMap.get(renderable as InstancedMesh);
      if (!buffer) {
        buffer = new GLInstancedBuffers(renderable as InstancedMesh);
        instancedBufferMap.set(renderable as InstancedMesh, buffer);
      }
      instancedAttrLocations = buffer.bindToProgram(this.gl, program, instancedExt);
    }

    const indicesBuffer = buffer.getIndicesBuffer();

    if (indicesBuffer) {
      const uintExt = glext.getExtension('OES_element_index_uint');
      const useUintExt = uintExt && geometry.indices instanceof Uint32Array;
      const indicesType = useUintExt ? constants.UNSIGNED_INT : constants.UNSIGNED_SHORT;

      if (isInstanced) {
        instancedExt.drawElementsInstancedANGLE(
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
        instancedExt.drawArraysInstancedANGLE(
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

    if (instancedAttrLocations) {
      for (let i = 0; i < instancedAttrLocations.length; i++) {
        _gl.disableVertexAttribArray(instancedAttrLocations[i]);
        instancedExt.vertexAttribDivisorANGLE(instancedAttrLocations[i], 0);
      }
    }
  }

  private _getBlankTexture() {
    return (
      this._blankTexture ||
      (this._blankTexture = new Texture2D({
        image: vendor.createBlankCanvas('#000')
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
      if (lu.type === 't') {
        program.set(gl, '1i', symbol, program.takeTextureSlot(gl, this._getGLTexture(lu.value)));
      } else if (lu.type === 'tv') {
        const texSlots = [];
        for (let i = 0; i < lu.value.length; i++) {
          const texture = lu.value[i];
          const slot = program.takeTextureSlot(gl, this._getGLTexture(texture));
          texSlots.push(slot);
        }
        program.set(gl, '1iv', symbol, texSlots);
      } else {
        program.set(gl, lu.type, symbol, lu.value);
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
      : enabledUniforms.filter(
          (uniformName) =>
            uniforms[uniformName].type === 't' || (uniforms[uniformName].type as any) === 'tv'
        );
    const placeholderTexture = this._getBlankTexture();

    const getGLTexture = (texture: Texture) => {
      return this._getGLTexture(texture);
    };

    for (let u = 0; u < textureUniforms.length; u++) {
      const symbol = textureUniforms[u];
      const uniformValue = getUniformValue!(renderable, material, symbol);
      const uniformType = uniforms[symbol].type;
      if (uniformType === 't' && uniformValue && (uniformValue as Texture).isRenderable()) {
        // Reset slot
        getGLTexture(uniformValue).slot = -1;
      } else if ((uniformType as any) === 'tv') {
        // TODO
        for (let i = 0; i < uniformValue.length; i++) {
          if (uniformValue[i] && (uniformValue as Texture).isRenderable()) {
            getGLTexture(uniformValue[i]).slot = -1;
          }
        }
      }
    }

    this._getGLTexture(placeholderTexture, true).slot = -1;

    // Set uniforms
    for (let u = 0; u < enabledUniforms.length; u++) {
      const symbol = enabledUniforms[u];
      const uniform = material.uniforms![symbol];
      let uniformValue = getUniformValue!(renderable, material, symbol);
      const uniformType = uniform.type;
      const isTexture = uniformType === 't';

      if (isTexture) {
        if (!uniformValue || !uniformValue.isRenderable()) {
          uniformValue = placeholderTexture;
        }
      }

      if (uniformValue == null) {
        continue;
      } else if (isTexture) {
        const glTexture = getGLTexture(uniformValue);
        if (glTexture.slot < 0) {
          const slot = program.currentTextureSlot();
          const res = program.set(gl, '1i', symbol, slot);
          if (res) {
            // Texture uniform is enabled
            program.takeTextureSlot(gl, glTexture);
            glTexture.slot = slot;
          }
        }
        // Multiple uniform use same texture..
        else {
          program.set(gl, '1i', symbol, glTexture.slot);
        }
      } else if (isArray(uniformValue)) {
        if (uniformValue.length === 0) {
          continue;
        }
        // Texture Array
        if ((uniformType as any) === 'tv') {
          if (!program.hasUniform(symbol)) {
            continue;
          }

          const arr = [];
          for (let i = 0; i < uniformValue.length; i++) {
            const glTexture = getGLTexture(uniformValue[i]);
            if (glTexture.slot < 0) {
              const slot = program.currentTextureSlot();
              arr.push(slot);
              program.takeTextureSlot(gl, glTexture);
              glTexture.slot = slot;
            } else {
              arr.push(glTexture.slot);
            }
          }

          program.set(gl, '1iv', symbol, arr);
        } else {
          program.set(gl, uniform.type, symbol, uniformValue);
        }
      } else {
        program.set(gl, uniform.type, symbol, uniformValue);
      }
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
    const glBuffers = this._glBuffersMap.get(geometry);
    glBuffers && glBuffers.dispose(this.gl);
  }

  /**
   * Dispose given texture
   * @param texture
   */
  disposeTexture(texture: Texture) {
    const glTexture = this._glTextureMap.get(texture);
    glTexture && glTexture.dispose(this.gl);
  }

  /**
   * Dispose given frame buffer
   * @param frameBuffer
   */
  disposeFrameBuffer(frameBuffer: FrameBuffer) {
    const glFramebuffer = this._glFrameBufferMap.get(frameBuffer);
    glFramebuffer && glFramebuffer.dispose(this.gl);
  }

  /**
   * Dispose instanced mesh
   */
  disposeInstancedMesh(mesh: InstancedMesh) {
    const buffers = this._glInstancedBufferMap.get(mesh as InstancedMesh);
    if (buffers) {
      buffers.dispose(this.gl);
    }
  }
}

export default GLRenderer;
