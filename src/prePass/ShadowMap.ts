import * as constants from '../core/constants';
import Vector3 from '../math/Vector3';
import BoundingBox from '../math/BoundingBox';
import Frustum from '../math/Frustum';
import Matrix4 from '../math/Matrix4';
import Renderer, { RenderHooks } from '../Renderer';
import Shader, { ShaderPrecision } from '../Shader';
import Material from '../Material';
import FrameBuffer from '../FrameBuffer';
import Texture from '../Texture';
import Texture2D from '../Texture2D';
import TextureCube, { CubeTarget, cubeTargets } from '../TextureCube';
import PerspectiveCamera from '../camera/Perspective';
import OrthoCamera from '../camera/Orthographic';
import TexturePool from '../composite/TexturePool';
import * as mat4 from '../glmatrix/mat4';
import type Renderable from '../Renderable';
import { Notifier } from '../core';
import Scene from '../Scene';
import Camera from '../Camera';
import FullscreenQuadPass from '../composite/Pass';
import Light from '../Light';
import DirectionalLight from '../light/Directional';
import SpotLight from '../light/Spot';
import PointLight from '../light/Point';
import { assign } from '../core/util';
import {
  shadowMapDepthDebugFragment,
  shadowMapDepthFragment,
  shadowMapDepthVertex,
  shadowMapDistanceFragment,
  shadowMapDistanceVertex
} from '../shader/source/shadowmap.glsl';

function getDepthMaterialUniform(renderable: Renderable, depthMaterial: Material, symbol: string) {
  const material = renderable.material;
  if (symbol === 'alphaMap') {
    return material.get('diffuseMap');
  } else if (symbol === 'alphaCutoff') {
    if (material.isDefined('fragment', 'ALPHA_TEST') && material.get('diffuseMap')) {
      const alphaCutoff = material.get('alphaCutoff');
      return alphaCutoff || 0;
    }
    return 0;
  } else if (symbol === 'uvRepeat') {
    return material.get('uvRepeat');
  } else if (symbol === 'uvOffset') {
    return material.get('uvOffset');
  } else {
    return depthMaterial.get(symbol);
  }
}

function isDepthMaterialChanged(renderable: Renderable, prevRenderable: Renderable) {
  const matA = renderable.material;
  const matB = prevRenderable.material;
  return (
    matA.get('diffuseMap') !== matB.get('diffuseMap') ||
    (matA.get('alphaCutoff') || 0) !== (matB.get('alphaCutoff') || 0)
  );
}

const lightViewMatrix = new Matrix4();
const sceneViewBoundingBox = new BoundingBox();
const lightViewBBox = new BoundingBox();

const splitFrustum = new Frustum();
const splitProjMatrix = new Matrix4();
const cropBBox = new BoundingBox();
const cropMatrix = new Matrix4();
const lightViewProjMatrix = new Matrix4();
const lightProjMatrix = new Matrix4();

interface ShadowMapPassOpts {}

/**
 * Pass rendering shadow map.
 *
 * @constructor clay.prePass.ShadowMap
 * @extends clay.core.Base
 * @example
 *     const shadowMapPass = new clay.prePass.ShadowMap();
 *     ...
 *     animation.on('frame', function (frameTime) {
 *         shadowMapPass.render(renderer, scene, camera);
 *         renderer.render(scene, camera);
 *     });
 */
class ShadowMapPass extends Notifier {
  lightFrustumBias: number | 'auto' = 'auto';

  /**
   * Light size for pcss shadow.
   */
  PCSSLightSize: number = 0;

  kernelPCF = new Float32Array([1, 0, 1, 1, -1, 1, 0, 1, -1, 0, -1, -1, 1, -1, 0, -1]);

  precision: ShaderPrecision = 'highp';

  private _frameBuffer = new FrameBuffer();

  private _textures: Record<string, Texture> = {};
  private _shadowMapNumber: Record<string, number> = {
    POINT_LIGHT: 0,
    DIRECTIONAL_LIGHT: 0,
    SPOT_LIGHT: 0
  };

  private _receivers: Renderable[] = [];
  private _lightsCastShadow: Light[] = [];

  private _lightCameras: {
    point?: Record<CubeTarget, PerspectiveCamera>;
    directional?: OrthoCamera;
    spot?: PerspectiveCamera;
  } = {};
  private _lightMaterials: Record<string, Material> = {};

  private _texturePool = new TexturePool();

  private _debugPass?: FullscreenQuadPass<typeof shadowMapDepthDebugFragment>;

  constructor() {
    super();
  }

  /**
   * Render scene to shadow textures
   */
  render(renderer: Renderer, scene: Scene, sceneCamera?: Camera, notUpdateScene?: boolean) {
    if (!sceneCamera) {
      sceneCamera = scene.getMainCamera();
    }
    this._renderShadowPass(renderer, scene, sceneCamera, notUpdateScene);
  }

  /**
   * Debug rendering of shadow textures
   */
  renderDebug(renderer: Renderer, size?: number) {
    let debugPass = this._debugPass;
    if (!debugPass) {
      debugPass = this._debugPass = new FullscreenQuadPass(shadowMapDepthDebugFragment);
    }
    renderer.saveClear();
    const viewport = renderer.viewport;
    let x = 0;
    const y = 0;
    const width = size || viewport.width / 4;
    const height = width;
    for (const name in this._textures) {
      const texture = this._textures[name];
      renderer.setViewport(x, y, (width * texture.width) / texture.height, height);
      debugPass.material.set('depthMap', texture as Texture2D);
      debugPass.render(renderer);
      x += (width * texture.width) / texture.height;
    }
    renderer.setViewport(viewport);
    renderer.restoreClear();
  }

  _updateReceivers(renderer: Renderer, mesh: Renderable) {
    const material = mesh.material;
    if (mesh.receiveShadow) {
      this._receivers.push(mesh);
      material.set('shadowEnabled', 1);
      material.set('pcfKernel', this.kernelPCF);
    } else {
      material.set('shadowEnabled', 0);
    }

    const kernelPCF = this.kernelPCF;
    material.define('fragment', 'PCF_KERNEL_SIZE', kernelPCF.length / 2);

    if (this.PCSSLightSize) {
      material.define('fragment', 'PCSS_LIGHT_SIZE', this.PCSSLightSize.toFixed(2));
    } else {
      material.undefine('fragment', 'PCSS_LIGHT_SIZE');
    }
  }

  _update(renderer: Renderer, scene: Scene) {
    const self = this;
    scene.traverse(function (renderable) {
      if (renderable.isRenderable()) {
        self._updateReceivers(renderer, renderable);
      }
    });

    for (let i = 0; i < scene.lights.length; i++) {
      const light = scene.lights[i];
      if (light.castShadow && !light.invisible) {
        this._lightsCastShadow.push(light);
      }
    }
  }

  _renderShadowPass(
    renderer: Renderer,
    scene: Scene,
    sceneCamera: Camera,
    notUpdateScene?: boolean
  ) {
    // reset
    for (const name in this._shadowMapNumber) {
      this._shadowMapNumber[name] = 0;
    }
    this._lightsCastShadow.length = 0;
    this._receivers.length = 0;

    const _gl = renderer.gl;

    if (!notUpdateScene) {
      scene.update();
    }
    if (sceneCamera) {
      sceneCamera.update();
    }

    scene.updateLights();
    this._update(renderer, scene);

    // Needs to update the receivers again if shadows come from 1 to 0.
    if (!this._lightsCastShadow.length) {
      return;
    }

    _gl.enable(constants.DEPTH_TEST);
    _gl.depthMask(true);
    _gl.disable(constants.BLEND);

    // Clear with high-z, so the part not rendered will not been shadowed
    // TODO
    // TODO restore
    _gl.clearColor(1.0, 1.0, 1.0, 1.0);

    // Shadow uniforms
    const spotLightShadowMaps: Texture2D[] = [];
    const spotLightMatrices: mat4.Mat4Array[] = [];
    const directionalLightShadowMaps: Texture2D[] = [];
    const directionalLightMatrices: mat4.Mat4Array[] = [];
    const shadowCascadeClips: number[] = [];
    const pointLightShadowMaps: TextureCube[] = [];

    let dirLightHasCascade;
    // Create textures for shadow map
    for (let i = 0; i < this._lightsCastShadow.length; i++) {
      const light = this._lightsCastShadow[i] as DirectionalLight | SpotLight | PointLight;
      if (light.type === 'DIRECTIONAL_LIGHT') {
        if (dirLightHasCascade) {
          console.warn('Only one direectional light supported with shadow cascade');
          continue;
        }
        if (light.shadowCascade > 4) {
          console.warn('Support at most 4 cascade');
          continue;
        }
        if (light.shadowCascade > 1) {
          dirLightHasCascade = light;
        }

        this.renderDirectionalLightShadow(
          renderer,
          scene,
          sceneCamera as PerspectiveCamera | OrthoCamera,
          light,
          shadowCascadeClips,
          directionalLightMatrices,
          directionalLightShadowMaps
        );
      } else if (light.type === 'SPOT_LIGHT') {
        this.renderSpotLightShadow(renderer, scene, light, spotLightMatrices, spotLightShadowMaps);
      } else if (light.type === 'POINT_LIGHT') {
        this.renderPointLightShadow(renderer, scene, light, pointLightShadowMaps);
      }

      this._shadowMapNumber[light.type]++;
    }

    for (const lightType in this._shadowMapNumber) {
      const number = this._shadowMapNumber[lightType];
      const key = lightType + '_SHADOWMAP_COUNT';
      for (let i = 0; i < this._receivers.length; i++) {
        const mesh = this._receivers[i];
        const material = mesh.material;
        if (material.fragmentDefines[key] !== number) {
          if (number > 0) {
            material.define('fragment', key, number);
          } else if (material.isDefined('fragment', key)) {
            material.undefine('fragment', key);
          }
        }
      }
    }
    for (let i = 0; i < this._receivers.length; i++) {
      const mesh = this._receivers[i];
      const material = mesh.material;
      if (dirLightHasCascade) {
        material.define('fragment', 'SHADOW_CASCADE', dirLightHasCascade.shadowCascade);
      } else {
        material.undefine('fragment', 'SHADOW_CASCADE');
      }
    }

    const shadowUniforms = scene.shadowUniforms;

    function getSize(texture: Texture) {
      return texture.height;
    }
    if (directionalLightShadowMaps.length > 0) {
      const directionalLightShadowMapSizes = directionalLightShadowMaps.map(getSize);
      shadowUniforms.directionalLightShadowMaps = {
        value: directionalLightShadowMaps,
        type: 'sampler2D',
        array: true
      };
      shadowUniforms.directionalLightMatrices = {
        value: directionalLightMatrices,
        type: 'mat4',
        array: true
      };
      shadowUniforms.directionalLightShadowMapSizes = {
        value: directionalLightShadowMapSizes,
        type: 'float',
        array: true
      };
      if (dirLightHasCascade) {
        const shadowCascadeClipsNear = shadowCascadeClips.slice();
        const shadowCascadeClipsFar = shadowCascadeClips.slice();
        shadowCascadeClipsNear.pop();
        shadowCascadeClipsFar.shift();

        // Iterate from far to near
        shadowCascadeClipsNear.reverse();
        shadowCascadeClipsFar.reverse();
        // directionalLightShadowMaps.reverse();
        directionalLightMatrices.reverse();
        shadowUniforms.shadowCascadeClipsNear = {
          value: shadowCascadeClipsNear,
          type: 'float',
          array: true
        };
        shadowUniforms.shadowCascadeClipsFar = {
          value: shadowCascadeClipsFar,
          type: 'float',
          array: true
        };
      }
    }

    if (spotLightShadowMaps.length > 0) {
      const spotLightShadowMapSizes = spotLightShadowMaps.map(getSize);
      const shadowUniforms = scene.shadowUniforms;
      shadowUniforms.spotLightShadowMaps = {
        value: spotLightShadowMaps,
        type: 'sampler2D',
        array: true
      };
      shadowUniforms.spotLightMatrices = { value: spotLightMatrices, type: 'mat4', array: true };
      shadowUniforms.spotLightShadowMapSizes = {
        value: spotLightShadowMapSizes,
        type: 'float',
        array: true
      };
    }

    if (pointLightShadowMaps.length > 0) {
      shadowUniforms.pointLightShadowMaps = {
        value: pointLightShadowMaps,
        type: 'samplerCube',
        array: true
      };
    }
  }

  renderDirectionalLightShadow(
    renderer: Renderer,
    scene: Scene,
    sceneCamera: PerspectiveCamera | OrthoCamera,
    light: DirectionalLight,
    shadowCascadeClips: number[],
    directionalLightMatrices: mat4.Mat4Array[],
    directionalLightShadowMaps: Texture2D[]
  ) {
    const defaultShadowMaterial = this._getDepthMaterial(light);
    const passConfig: RenderHooks = {
      prepare(gl) {
        // Needs white background.
        gl.clearColor(1, 1, 1, 1);
        gl.clear(constants.COLOR_BUFFER_BIT | constants.DEPTH_BUFFER_BIT);
      },
      getMaterial(renderable) {
        return (renderable as Renderable).shadowDepthMaterial || defaultShadowMaterial;
      },
      isMaterialChanged: isDepthMaterialChanged,
      getMaterialUniform: getDepthMaterialUniform,
      ifRender(renderable) {
        return (renderable as Renderable).castShadow;
      },
      sortCompare: Renderer.opaqueSortCompare
    };

    // First frame
    if (!scene.viewBoundingBoxLastFrame.isFinite()) {
      const boundingBox = scene.getBoundingBox();
      scene.viewBoundingBoxLastFrame.copy(boundingBox).applyTransform(sceneCamera.viewMatrix);
    }
    // Considering moving speed since the bounding box is from last frame
    // TODO: add a bias
    const clippedFar = Math.min(-scene.viewBoundingBoxLastFrame.min.z, sceneCamera.far);
    const clippedNear = Math.max(-scene.viewBoundingBoxLastFrame.max.z, sceneCamera.near);

    const lightCamera = this._getDirectionalLightCamera(light, scene, sceneCamera);

    const lvpMat4Arr = lightViewProjMatrix.array;
    lightProjMatrix.copy(lightCamera.projectionMatrix);
    mat4.invert(lightViewMatrix.array, lightCamera.worldTransform.array);
    mat4.multiply(lightViewMatrix.array, lightViewMatrix.array, sceneCamera.worldTransform.array);
    mat4.multiply(lvpMat4Arr, lightProjMatrix.array, lightViewMatrix.array);

    const clipPlanes = [];
    const isPerspective = sceneCamera instanceof PerspectiveCamera;

    const scaleZ = (sceneCamera.near + sceneCamera.far) / (sceneCamera.near - sceneCamera.far);
    const offsetZ = (2 * sceneCamera.near * sceneCamera.far) / (sceneCamera.near - sceneCamera.far);
    for (let i = 0; i <= light.shadowCascade; i++) {
      const clog = clippedNear * Math.pow(clippedFar / clippedNear, i / light.shadowCascade);
      const cuni = clippedNear + ((clippedFar - clippedNear) * i) / light.shadowCascade;
      const c = clog * light.cascadeSplitLogFactor + cuni * (1 - light.cascadeSplitLogFactor);
      clipPlanes.push(c);
      shadowCascadeClips.push(-(-c * scaleZ + offsetZ) / -c);
    }
    const texture = this._getTexture(light, light.shadowCascade);
    directionalLightShadowMaps.push(texture);

    const viewport = renderer.viewport;

    const framebuffer = this._frameBuffer;
    framebuffer.attach(texture);

    for (let i = 0; i < light.shadowCascade; i++) {
      // Get the splitted frustum
      const nearPlane = clipPlanes[i];
      const farPlane = clipPlanes[i + 1];
      if (isPerspective) {
        mat4.perspective(
          splitProjMatrix.array,
          (sceneCamera.fov / 180) * Math.PI,
          sceneCamera.aspect,
          nearPlane,
          farPlane
        );
      } else {
        mat4.ortho(
          splitProjMatrix.array,
          sceneCamera.left,
          sceneCamera.right,
          sceneCamera.bottom,
          sceneCamera.top,
          nearPlane,
          farPlane
        );
      }
      splitFrustum.setFromProjection(splitProjMatrix);
      splitFrustum.getTransformedBoundingBox(cropBBox, lightViewMatrix);
      cropBBox.applyProjection(lightProjMatrix);
      const _min = cropBBox.min.array;
      const _max = cropBBox.max.array;
      _min[0] = Math.max(_min[0], -1);
      _min[1] = Math.max(_min[1], -1);
      _max[0] = Math.min(_max[0], 1);
      _max[1] = Math.min(_max[1], 1);
      cropMatrix.ortho(_min[0], _max[0], _min[1], _max[1], 1, -1);
      lightCamera.projectionMatrix.multiplyLeft(cropMatrix);

      const shadowSize = light.shadowResolution || 512;

      const renderList = scene.updateRenderList(lightCamera);
      renderer.renderPass(
        renderList.opaque,
        lightCamera,
        framebuffer,
        assign({}, passConfig, {
          prepare(gl) {
            // Reversed, left to right => far to near
            gl.viewport((light.shadowCascade - i - 1) * shadowSize, 0, shadowSize, shadowSize);

            // Only clear on the first pass.
            if (i === 0) {
              gl.clearColor(1, 1, 1, 1);
              gl.clear(constants.COLOR_BUFFER_BIT | constants.DEPTH_BUFFER_BIT);
            }
          }
        } as RenderHooks)
      );

      const matrix = new Matrix4();
      matrix.copy(lightCamera.viewMatrix).multiplyLeft(lightCamera.projectionMatrix);

      directionalLightMatrices.push(matrix.array);

      lightCamera.projectionMatrix.copy(lightProjMatrix);
    }

    renderer.setViewport(viewport);
  }

  renderSpotLightShadow(
    renderer: Renderer,
    scene: Scene,
    light: SpotLight,
    spotLightMatrices: mat4.Mat4Array[],
    spotLightShadowMaps: Texture2D[]
  ) {
    const texture = this._getTexture(light);
    const lightCamera = this._getSpotLightCamera(light);
    const frameBuffer = this._frameBuffer;

    frameBuffer.attach(texture);

    const defaultShadowMaterial = this._getDepthMaterial(light);
    const passConfig: RenderHooks = {
      prepare(gl) {
        gl.clear(constants.COLOR_BUFFER_BIT | constants.DEPTH_BUFFER_BIT);
      },
      getMaterial(renderable) {
        return (renderable as Renderable).shadowDepthMaterial || defaultShadowMaterial;
      },
      isMaterialChanged: isDepthMaterialChanged,
      getMaterialUniform: getDepthMaterialUniform,
      ifRender(renderable) {
        return (renderable as Renderable).castShadow;
      },
      sortCompare: Renderer.opaqueSortCompare
    };

    const renderList = scene.updateRenderList(lightCamera);
    renderer.renderPass(renderList.opaque, lightCamera, frameBuffer, passConfig);

    const matrix = new Matrix4();
    matrix.copy(lightCamera.worldTransform).invert().multiplyLeft(lightCamera.projectionMatrix);

    spotLightShadowMaps.push(texture);
    spotLightMatrices.push(matrix.array);
  }

  renderPointLightShadow(
    renderer: Renderer,
    scene: Scene,
    light: PointLight,
    pointLightShadowMaps: TextureCube[]
  ) {
    const texture = this._getTexture(light);
    pointLightShadowMaps.push(texture);

    const defaultShadowMaterial = this._getDepthMaterial(light);
    const passConfig: RenderHooks = {
      prepare(gl) {
        gl.clearColor(1, 1, 1, 1);
        gl.clear(constants.COLOR_BUFFER_BIT | constants.DEPTH_BUFFER_BIT);
      },
      getMaterial(renderable) {
        return (renderable as Renderable).shadowDepthMaterial || defaultShadowMaterial;
      },
      getMaterialUniform: getDepthMaterialUniform,
      sortCompare: Renderer.opaqueSortCompare
    };
    const frameBuffer = this._frameBuffer;

    const renderListEachSide: Record<CubeTarget, Renderable[]> = {
      px: [],
      py: [],
      pz: [],
      nx: [],
      ny: [],
      nz: []
    };
    const bbox = new BoundingBox();
    const lightWorldPosition = light.getWorldPosition().array;
    const lightBBox = new BoundingBox();
    const range = light.range;
    lightBBox.min.setArray(lightWorldPosition);
    lightBBox.max.setArray(lightWorldPosition);
    const extent = new Vector3(range, range, range);
    lightBBox.max.add(extent);
    lightBBox.min.sub(extent);

    const targetsNeedRender = {} as Record<CubeTarget, boolean>;
    scene.traverse(function (renderable) {
      if (renderable.isRenderable() && renderable.castShadow) {
        const geometry = renderable.geometry;
        if (!geometry.boundingBox) {
          for (let i = 0; i < cubeTargets.length; i++) {
            renderListEachSide[cubeTargets[i]].push(renderable);
          }
          return;
        }
        bbox.transformFrom(geometry.boundingBox, renderable.worldTransform);
        if (!bbox.intersectBoundingBox(lightBBox)) {
          return;
        }

        bbox.updateVertices();
        for (let i = 0; i < cubeTargets.length; i++) {
          targetsNeedRender[cubeTargets[i]] = false;
        }
        for (let i = 0; i < 8; i++) {
          const vtx = bbox.vertices![i];
          const x = vtx[0] - lightWorldPosition[0];
          const y = vtx[1] - lightWorldPosition[1];
          const z = vtx[2] - lightWorldPosition[2];
          const absx = Math.abs(x);
          const absy = Math.abs(y);
          const absz = Math.abs(z);
          if (absx > absy) {
            if (absx > absz) {
              targetsNeedRender[x > 0 ? 'px' : 'nx'] = true;
            } else {
              targetsNeedRender[z > 0 ? 'pz' : 'nz'] = true;
            }
          } else {
            if (absy > absz) {
              targetsNeedRender[y > 0 ? 'py' : 'ny'] = true;
            } else {
              targetsNeedRender[z > 0 ? 'pz' : 'nz'] = true;
            }
          }
        }
        for (let i = 0; i < cubeTargets.length; i++) {
          if (targetsNeedRender[cubeTargets[i]]) {
            renderListEachSide[cubeTargets[i]].push(renderable);
          }
        }
      }
    });

    for (let i = 0; i < 6; i++) {
      const target = cubeTargets[i];
      const camera = this._getPointLightCamera(light, target);

      frameBuffer.attach(
        texture,
        constants.COLOR_ATTACHMENT0,
        constants.TEXTURE_CUBE_MAP_POSITIVE_X + i
      );

      renderer.renderPass(renderListEachSide[target], camera, frameBuffer, passConfig);
    }
  }

  _getDepthMaterial(light: Light) {
    let shadowMaterial = this._lightMaterials[light.uid];
    const isPointLight = light.type === 'POINT_LIGHT';
    if (!shadowMaterial) {
      shadowMaterial = new Material(
        new Shader(
          isPointLight ? shadowMapDistanceVertex : shadowMapDepthVertex,
          isPointLight ? shadowMapDistanceFragment : shadowMapDepthFragment
        ),
        {
          precision: this.precision
        }
      );

      this._lightMaterials[light.uid] = shadowMaterial;
    }
    if ((light as DirectionalLight).shadowSlopeScale != null) {
      shadowMaterial.set('slopeScale', (light as DirectionalLight).shadowSlopeScale);
    }
    if ((light as DirectionalLight).shadowBias != null) {
      shadowMaterial.set('bias', (light as DirectionalLight).shadowBias);
    }

    if (isPointLight) {
      shadowMaterial.set('lightPosition', light.getWorldPosition().array);
      shadowMaterial.set('range', (light as PointLight).range);
    }

    return shadowMaterial;
  }

  _getTexture(light: PointLight, cascade?: number): TextureCube;
  _getTexture(light: DirectionalLight | SpotLight, cascade?: number): Texture2D;
  _getTexture(light: DirectionalLight | PointLight | SpotLight, cascade?: number) {
    const key = light.uid;
    let texture = this._textures[key];
    const resolution = light.shadowResolution || 512;
    cascade = cascade || 1;
    if (!texture) {
      if (light.type === 'POINT_LIGHT') {
        texture = new TextureCube();
      } else {
        texture = new Texture2D();
      }
      // At most 4 cascade
      // TODO share with height ?
      texture.width = resolution * cascade;
      texture.height = resolution;
      texture.minFilter = constants.NEAREST;
      texture.magFilter = constants.NEAREST;
      texture.wrapS = constants.CLAMP_TO_EDGE;
      texture.wrapT = constants.CLAMP_TO_EDGE;
      texture.useMipmap = false;
      this._textures[key] = texture;
    }

    return texture;
  }

  _getPointLightCamera(light: PointLight, target: CubeTarget) {
    const lightCameras = this._lightCameras;
    if (!lightCameras.point) {
      lightCameras.point = cubeTargets.reduce((obj, target) => {
        obj[target] = new PerspectiveCamera();
        return obj;
      }, {} as Record<CubeTarget, PerspectiveCamera>);
    }
    const camera = lightCameras.point[target];

    camera.far = light.range;
    camera.fov = 90;
    camera.position.set(0, 0, 0);
    switch (target) {
      case 'px':
        camera.lookAt(Vector3.POSITIVE_X, Vector3.NEGATIVE_Y);
        break;
      case 'nx':
        camera.lookAt(Vector3.NEGATIVE_X, Vector3.NEGATIVE_Y);
        break;
      case 'py':
        camera.lookAt(Vector3.POSITIVE_Y, Vector3.POSITIVE_Z);
        break;
      case 'ny':
        camera.lookAt(Vector3.NEGATIVE_Y, Vector3.NEGATIVE_Z);
        break;
      case 'pz':
        camera.lookAt(Vector3.POSITIVE_Z, Vector3.NEGATIVE_Y);
        break;
      case 'nz':
        camera.lookAt(Vector3.NEGATIVE_Z, Vector3.NEGATIVE_Y);
        break;
    }
    light.getWorldPosition(camera.position);
    camera.update();

    return camera;
  }

  // Camera of directional light will be adjusted
  // to contain the view frustum and scene bounding box as tightly as possible
  _getDirectionalLightCamera(
    light: DirectionalLight,
    scene: Scene,
    sceneCamera: PerspectiveCamera | OrthoCamera
  ) {
    if (!this._lightCameras.directional) {
      this._lightCameras.directional = new OrthoCamera();
    }
    const camera = this._lightCameras.directional;

    sceneViewBoundingBox.copy(scene.viewBoundingBoxLastFrame);
    sceneViewBoundingBox.intersection(sceneCamera.frustum.boundingBox);
    // Move to the center of frustum(in world space)
    camera.position
      .copy(sceneViewBoundingBox.min)
      .add(sceneViewBoundingBox.max)
      .scale(0.5)
      .transformMat4(sceneCamera.worldTransform);
    camera.rotation.copy(light.rotation);
    camera.scale.copy(light.scale);
    camera.updateWorldTransform();

    // Transform to light view space
    Matrix4.invert(lightViewMatrix, camera.worldTransform);
    Matrix4.multiply(lightViewMatrix, lightViewMatrix, sceneCamera.worldTransform);

    lightViewBBox.copy(sceneViewBoundingBox).applyTransform(lightViewMatrix);

    const min = lightViewBBox.min;
    const max = lightViewBBox.max;

    const PCSSLightSize = this.PCSSLightSize || 0;

    // Add a distance to make sure the blur size of different object are similar.
    // Or the object near to camera will be too blurry.
    const nearDistance = PCSSLightSize > 0 ? max.z - min.z : 0;

    // Move camera to adjust the near to 0
    camera.position
      .set((min.x + max.x) / 2, (min.y + max.y) / 2, max.z + nearDistance)
      .transformMat4(camera.worldTransform);
    camera.near = 0;
    camera.far = max.z - min.z + nearDistance;
    // Make sure receivers not in the frustum will stil receive the shadow.
    if (isNaN(+this.lightFrustumBias)) {
      camera.far *= 4;
    } else {
      camera.far += +this.lightFrustumBias;
    }
    // PENDING
    camera.left = min.x - PCSSLightSize;
    camera.right = max.x + PCSSLightSize;
    camera.top = max.y + PCSSLightSize;
    camera.bottom = min.y - PCSSLightSize;
    camera.update();

    return camera;
  }

  _getSpotLightCamera(light: SpotLight) {
    if (!this._lightCameras.spot) {
      this._lightCameras.spot = new PerspectiveCamera();
    }
    const camera = this._lightCameras.spot;
    // Update properties
    camera.fov = light.penumbraAngle * 2;
    camera.far = light.range;
    camera.worldTransform.copy(light.worldTransform);
    camera.updateProjectionMatrix();
    mat4.invert(camera.viewMatrix.array, camera.worldTransform.array);

    return camera;
  }

  /**
   * @param  {clay.Renderer|WebGL2RenderingContext} [renderer]
   * @memberOf clay.prePass.ShadowMap.prototype
   */
  // PENDING Renderer or WebGL2RenderingContext
  dispose(renderer: Renderer) {
    if (this._frameBuffer) {
      renderer.disposeFrameBuffer(this._frameBuffer);
    }

    for (const name in this._textures) {
      renderer.disposeTexture(this._textures[name]);
    }

    this._texturePool.clear(renderer);

    this._textures = {};
    this._lightCameras = {};
    this._shadowMapNumber = {
      POINT_LIGHT: 0,
      DIRECTIONAL_LIGHT: 0,
      SPOT_LIGHT: 0
    };

    for (let i = 0; i < this._receivers.length; i++) {
      const mesh = this._receivers[i];
      // Mesh may be disposed
      if (mesh.material) {
        const material = mesh.material;
        material.undefine('fragment', 'POINT_LIGHT_SHADOW_COUNT');
        material.undefine('fragment', 'DIRECTIONAL_LIGHT_SHADOW_COUNT');
        material.undefine('fragment', 'AMBIENT_LIGHT_SHADOW_COUNT');
        material.set('shadowEnabled', 0);
      }
    }

    this._receivers = [];
    this._lightsCastShadow = [];
  }
}

export default ShadowMapPass;
