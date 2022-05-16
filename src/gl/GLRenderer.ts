import GLExtension from './GLExtension';
import { GLEnum } from '../core/type';
import vendor from '../core/vendor';
import GeometryBase from '../GeometryBase';
import InstancedMesh from '../InstancedMesh';
import Material from '../Material';
import type { Matrix4 } from '../math';
import Mesh from '../Mesh';
import Skeleton from '../Skeleton';
import GLProgram from './GLProgram';
import ProgramManager from './ProgramManager';
import { genGUID, keys, optional } from '../core/util';
import type Texture from '../Texture';
import type FrameBuffer from '../FrameBuffer';
import Texture2D from '../Texture2D';
import GLTexture from './GLTexture';
import TextureCube from '../TextureCube';
import GLBuffers from './GLBuffers';
import * as constants from '../core/constants';
import Shader, { ShaderDefineValue, ShaderPrecision } from '../Shader';

const errorShader: Record<string, boolean> = {};

function defaultGetMaterial(renderable: RenderableObject) {
  return renderable.material;
}
function defaultGetUniform(renderable: RenderableObject, material: MaterialObject, symbol: string) {
  return material.uniforms[symbol].value;
}
function defaultIsMaterialChanged(
  renderable: RenderableObject,
  prevRenderable: RenderableObject,
  material: MaterialObject,
  prevMaterial: MaterialObject
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
export interface MaterialObject {
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
export interface RenderableObject {
  geometry: GeometryBase;
  material: MaterialObject;
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

export interface ExtendedRenderableObject extends RenderableObject {
  __program: GLProgram;
  // Depth for transparent list sorting
  __depth: number;
  renderOrder: number;
}

export interface RenderHooks<
  T extends RenderableObject = RenderableObject,
  S extends MaterialObject = MaterialObject
> {
  ifRender?(renderable: T): boolean;
  /**
   * Get material of renderable
   */
  getMaterial?(renderable: T): MaterialObject;

  /**
   * Get uniform from material
   */
  getUniform?(renderable: T, material: S, symbol: string): any;

  /**
   * Get common shader header code in shader for program.
   */
  getShaderDefineCode?(renderable: T, material: S): string;
  /**
   * Get extra key for program
   */
  getProgramKey?(renderable: T, material: S): string;
  /**
   * Set common uniforms once for each program
   */
  programChanged?(program: GLProgram): void;

  /**
   * Set uniforms for each program.
   * Uniform in material will be set automatically
   */
  renderableChanged?(renderable: T, material: S, program: GLProgram): void;

  isMaterialChanged?(
    renderable: T,
    prevRenderable: T,
    material: MaterialObject,
    prevMaterial: MaterialObject
  ): boolean;

  sortCompare?: (a: T & ExtendedRenderableObject, b: T & ExtendedRenderableObject) => number;

  beforeRender?: (
    renderable: T,
    material: MaterialObject,
    prevMaterial: MaterialObject | undefined
  ) => void;
  afterRender?: (renderable: T) => void;
}

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
  private _glBufferMap = new WeakMap<GeometryBase, GLBuffers>();

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
    this._glext = new GLExtension(gl);
    this.throwError = optional(opts.throwError, true);
  }

  setViewport(x: number, y: number, width: number, height: number, dpr: number) {
    this.gl.viewport(x * dpr, y * dpr, width * dpr, height * dpr);
  }

  /**
   * Render a single renderable list in camera in sequence
   * @param list List of all renderables.
   * @param renderHooks
   */
  render(list: RenderableObject[], renderHooks?: RenderHooks) {
    renderHooks = renderHooks || {};
    renderHooks.getMaterial = renderHooks.getMaterial || defaultGetMaterial;
    renderHooks.getUniform = renderHooks.getUniform || defaultGetUniform;
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

    let prevMaterial: Material | undefined;
    let prevProgram: GLProgram | undefined;
    let prevRenderable: RenderableObject | undefined;

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
          prevRenderable,
          prevMaterial,
          prevProgram,
          renderHooks.getUniform
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
        let buffers = this._glBufferMap.get(geometry);
        if (!buffers) {
          buffers = new GLBuffers(geometry);
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

  private _updatePrograms(list: RenderableObject[], renderHooks: RenderHooks) {
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

  getGLExtension(extName: string) {
    return this._glext.getExtension(extName);
  }

  private _getGLTexture(texture: Texture) {
    const glTextureMap = this._glTextureMap;
    let glTexture = glTextureMap.get(texture);
    if (!glTexture) {
      glTexture = new GLTexture(texture as Texture2D | TextureCube);
      glTextureMap.set(texture, glTexture);
    }
    if (texture.__dirty) {
      glTexture.update(this.gl, this._glext);
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
        program.useTextureSlot(gl, skinMatricesTexture, slot);
        program.set(gl, '1i', 'skinMatricesTexture', slot);
        program.set(gl, '1f', 'skinMatricesTextureSize', skinMatricesTexture.width);
      } else {
        const skinMatricesArray = skeleton.getSubSkinMatrices(object.__uid__, object.joints);
        program.set(gl, 'm4v', 'skinMatrix', skinMatricesArray);
      }
    }
  }

  private _renderObject(renderable: RenderableObject, buffer: GLBuffers, program: GLProgram) {
    const _gl = this.gl;
    const geometry = renderable.geometry;
    const glext = this._glext;

    let glDrawMode = renderable.mode;
    if (glDrawMode == null) {
      glDrawMode = 0x0004;
    }

    let ext = null;
    const isInstanced = renderable.isInstancedMesh && renderable.isInstancedMesh();
    if (isInstanced) {
      ext = glext.getExtension('ANGLE_instanced_arrays');
      if (!ext) {
        console.warn('Device not support ANGLE_instanced_arrays extension');
        return;
      }
    }

    let instancedAttrLocations: {
      location: number;
      enabled: boolean;
    }[];
    if (isInstanced) {
      instancedAttrLocations = this._bindInstancedAttributes(renderable, program, ext);
    }

    const indicesBuffer = buffer.getIndicesBuffer();

    if (indicesBuffer) {
      const uintExt = glext.getExtension('OES_element_index_uint');
      const useUintExt = uintExt && geometry.indices instanceof Uint32Array;
      const indicesType = useUintExt ? constants.UNSIGNED_INT : constants.UNSIGNED_SHORT;

      if (isInstanced) {
        ext.drawElementsInstancedANGLE(
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
      for (let i = 0; i < instancedAttrLocations!.length; i++) {
        if (!instancedAttrLocations![i].enabled) {
          _gl.disableVertexAttribArray(instancedAttrLocations![i].location);
        }
        ext.vertexAttribDivisorANGLE(instancedAttrLocations![i].location, 0);
      }
    }
  }

  private _bindInstancedAttributes(renderable: InstancedMesh, program: GLProgram, ext: any) {
    const gl = this.gl;
    const instancedBuffers = renderable.getInstancedAttributesBuffers(this);
    const locations: {
      location: number;
      enabled: boolean;
    }[] = [];

    for (let i = 0; i < instancedBuffers.length; i++) {
      const bufferObj = instancedBuffers[i];
      const location = program.getAttribLocation(gl, bufferObj.symbol);
      if (location < 0) {
        continue;
      }

      const glType = attributeBufferTypeMap[bufferObj.type] || constants.FLOAT;
      const isEnabled = program.isAttribEnabled(gl, location);
      if (!program.isAttribEnabled(gl, location)) {
        gl.enableVertexAttribArray(location);
      }
      locations.push({
        location: location,
        enabled: isEnabled
      });
      gl.bindBuffer(constants.ARRAY_BUFFER, bufferObj.buffer);
      gl.vertexAttribPointer(location, bufferObj.size, glType, false, 0, 0);
      ext.vertexAttribDivisorANGLE(location, bufferObj.divisor);
    }

    return locations;
  }

  private _getBlankTexture() {
    return (
      this._blankTexture ||
      (this._blankTexture = new Texture2D({
        image: vendor.createBlankCanvas('#fff')
      }))
    );
  }

  private _bindMaterial(
    renderable: RenderableObject,
    material: MaterialObject,
    program: GLProgram,
    prevRenderable: RenderableObject | undefined,
    prevMaterial: MaterialObject | undefined,
    prevProgram: GLProgram | undefined,
    getUniformValue: RenderHooks['getUniform']
  ) {
    const gl = this.gl;
    // PENDING Same texture in different material take different slot?

    // May use shader of other material if shader code are same
    const sameProgram = prevProgram === program;

    const uniforms = material.uniforms || {};
    const currentTextureSlot = program.currentTextureSlot();
    const enabledUniforms = material.getEnabledUniforms
      ? material.getEnabledUniforms()
      : keys(uniforms);
    const textureUniforms = material.getTextureUniforms
      ? material.getTextureUniforms()
      : enabledUniforms.filter(
          (uniformName) => uniforms[uniformName].type === 't' || uniforms[uniformName].type === 'tv'
        );
    const placeholderTexture = this._getBlankTexture();

    for (let u = 0; u < textureUniforms.length; u++) {
      const symbol = textureUniforms[u];
      const uniformValue = getUniformValue!(renderable, material, symbol);
      const uniformType = uniforms[symbol].type;
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
      const uniform = material.uniforms![symbol];
      let uniformValue = getUniformValue!(renderable, material, symbol);
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
        let prevUniformValue = getUniformValue!(prevRenderable!, prevMaterial, symbol);
        if (isTexture) {
          if (!prevUniformValue || !prevUniformValue.isRenderable()) {
            prevUniformValue = placeholderTexture;
          }
        }

        if (prevUniformValue === uniformValue) {
          if (isTexture) {
            // Still take the slot to make sure same texture in different materials have same slot.
            program.takeCurrentTextureSlot(gl);
          } else if (uniformType === 'tv' && uniformValue) {
            for (let i = 0; i < uniformValue.length; i++) {
              program.takeCurrentTextureSlot(gl);
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
          const res = program.set(gl, '1i', symbol, slot);
          if (res) {
            // Texture uniform is enabled
            program.takeCurrentTextureSlot(gl, uniformValue as Texture);
            uniformValue.__slot = slot;
          }
        }
        // Multiple uniform use same texture..
        else {
          program.set(gl, '1i', symbol, uniformValue.__slot);
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
            const texture = uniformValue[i] as Texture;

            if (texture.__slot < 0) {
              const slot = program.currentTextureSlot();
              arr.push(slot);
              program.takeCurrentTextureSlot(gl, texture);
              texture.__slot = slot;
            } else {
              arr.push(texture.__slot);
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
   * @param {clay.Geometry} geometry
   */
  disposeGeometry(geometry: GeometryBase) {
    const buffers = this._glBufferMap.get(geometry);
    buffers && buffers.dispose(this.gl);
  }

  /**
   * Dispose given texture
   * @param {clay.Texture} texture
   */
  disposeTexture(texture: Texture) {
    const textures = this._glTextureMap.get(texture);
    textures && textures.dispose(this.gl);
  }

  /**
   * Dispose given frame buffer
   * @param {clay.FrameBuffer} frameBuffer
   */
  disposeFrameBuffer(frameBuffer: FrameBuffer) {
    frameBuffer.dispose(this);
  }
}

export default GLRenderer;
