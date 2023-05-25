// Light-pre pass deferred rendering
// http://www.realtimerendering.com/blog/deferred-lighting-approaches/
import Shader from '../Shader';
import Material from '../Material';
import FrameBuffer from '../FrameBuffer';
import FullscreenQuadPass from '../FullscreenQuadPass';
import Texture2D from '../Texture2D';
import Mesh from '../Mesh';
import SphereGeo from '../geometry/Sphere';
import ConeGeo from '../geometry/Cone';
import CylinderGeo from '../geometry/Cylinder';
import Matrix4 from '../math/Matrix4';
import Vector3 from '../math/Vector3';
import GBuffer from './GBuffer';

import type ShadowMapPass from '../prePass/ShadowMap';
import type Geometry from '../Geometry';
import type Scene from '../Scene';
import type Camera from '../Camera';
import Renderer, { RendererViewport } from '../Renderer';
import type PointLight from '../light/Point';
import SphereLight from '../light/Sphere';
import type SpotLight from '../light/Spot';
import type TubeLight from '../light/Tube';
import type DirectionalLight from '../light/Directional';
import * as mat4 from '../glmatrix/mat4';
import type TextureCube from '../TextureCube';
import type Light from '../Light';
import PerspectiveCamera from '../camera/Perspective';
import OrthographicCamera from '../camera/Orthographic';
import * as constants from '../core/constants';
import { preZFragment, preZVertex } from '../shader/source/prez.glsl';
import { outputFragment } from '../shader/source/compositor/output.glsl';
import { deferredDirectionalLightFragment } from '../shader/source/deferred/directional.glsl';
import { fullscreenQuadPassVertex } from '../shader/source/compositor/vertex.glsl';
import { lightVolumeVertex } from '../shader/source/deferred/lightvolume.glsl';
import { deferredAmbientLightFragment } from '../shader/source/deferred/ambient.glsl';
import { deferredAmbientSHLightFragment } from '../shader/source/deferred/ambientsh.glsl';
import { deferredAmbientCubemapLightFragment } from '../shader/source/deferred/ambientcubemap.glsl';
import { deferredSpotLightFragment } from '../shader/source/deferred/spot.glsl';
import { deferredPointLightFragment } from '../shader/source/deferred/point.glsl';
import { deferredSphereLightFragment } from '../shader/source/deferred/sphere.glsl';
import { deferredTubeLightFragment } from '../shader/source/deferred/tube.glsl';
import { depthWriteFragment } from '../shader/source/deferred/depthwrite.glsl';

const worldView = new Matrix4();
const preZMaterial = new Material(new Shader(preZVertex, preZFragment));

function lightAccumulateBlendFunc(gl: WebGL2RenderingContext) {
  gl.blendEquation(constants.FUNC_ADD);
  gl.blendFuncSeparate(constants.ONE, constants.ONE, constants.ONE, constants.ZERO);
}

type DeferredLight = PointLight | SphereLight | SpotLight | TubeLight | DirectionalLight;

interface LightShadowInfo {
  cascadeClipsNear: number[];
  cascadeClipsFar: number[];
  shadowMap: Texture2D;
  lightMatrices: mat4.Mat4Array[];
}

/**
 * Deferred renderer
 */
class DeferredRenderer {
  /**
   * Provide ShadowMapPass for shadow rendering.
   * @type {clay.prePass.ShadowMap}
   */
  shadowMapPass?: ShadowMapPass;
  /**
   * If enable auto resizing from given defualt renderer size.
   * @type {boolean}
   */
  autoResize = true;

  private _gBuffer = new GBuffer();

  private _lightAccumFrameBuffer = new FrameBuffer();

  private _lightAccumTex = new Texture2D({
    // FIXME Device not support float texture
    type: constants.HALF_FLOAT,
    minFilter: constants.NEAREST,
    magFilter: constants.NEAREST
  });

  // TODO Support dynamic material?
  private _fullQuadPass = new FullscreenQuadPass(outputFragment);

  private _depthWriteMat = new Material(new Shader(fullscreenQuadPassVertex, depthWriteFragment));

  private _directionalLightMat: Material;

  private _ambientMat: Material;
  private _ambientSHMat: Material;
  private _ambientCubemapMat: Material;

  private _spotLightShader: Shader;
  private _pointLightShader: Shader;

  private _sphereLightShader: Shader;
  private _tubeLightShader: Shader;

  private _lightSphereGeo = new SphereGeo({
    widthSegments: 10,
    heightSegments: 10
  });

  private _lightConeGeo: Geometry;

  private _lightCylinderGeo: Geometry;

  private _outputPass = new FullscreenQuadPass(outputFragment);
  private _createLightPassMat: (shader: Shader) => Material;

  private _volumeMeshMap = new WeakMap<Light, Mesh>();
  private _lightShadowInfosMap = new WeakMap<Light, LightShadowInfo>();

  private _extraLightTypes: Record<
    string,
    {
      fullQuad: boolean;
      getLightMaterial?: (light: Light) => Material;
    }
  > = {};

  constructor() {
    const directionalLightShader = new Shader(
      fullscreenQuadPassVertex,
      deferredDirectionalLightFragment
    );

    const createLightPassMat = function <T extends Shader>(shader: T) {
      return new Material(shader);
    };
    this._createLightPassMat = createLightPassMat;

    // Rotate and positioning to fit the spot light
    // Which the cusp of cone pointing to the positive z
    // and positioned on the origin
    const coneGeo = new ConeGeo({
      capSegments: 10
    });
    const mat = new Matrix4();
    mat.rotateX(Math.PI / 2).translate(new Vector3(0, -1, 0));

    coneGeo.applyTransform(mat);

    const cylinderGeo = new CylinderGeo({
      capSegments: 10
    });
    // Align with x axis
    mat.identity().rotateZ(Math.PI / 2);
    cylinderGeo.applyTransform(mat);

    this._directionalLightMat = this._createLightPassMat(directionalLightShader);

    this._ambientMat = this._createLightPassMat(
      new Shader(fullscreenQuadPassVertex, deferredAmbientLightFragment)
    );
    this._ambientSHMat = this._createLightPassMat(
      new Shader(fullscreenQuadPassVertex, deferredAmbientSHLightFragment)
    );
    this._ambientCubemapMat = this._createLightPassMat(
      new Shader(fullscreenQuadPassVertex, deferredAmbientCubemapLightFragment)
    );

    this._spotLightShader = new Shader(lightVolumeVertex, deferredSpotLightFragment);
    this._pointLightShader = new Shader(lightVolumeVertex, deferredPointLightFragment);

    this._sphereLightShader = new Shader(lightVolumeVertex, deferredSphereLightFragment);
    this._tubeLightShader = new Shader(lightVolumeVertex, deferredTubeLightFragment);

    this._lightConeGeo = coneGeo;
    this._lightCylinderGeo = cylinderGeo;
  }

  extendLightType<T extends Light>(
    lightType: T['type'],
    opts?: {
      fullQuad?: boolean;
      // Available when fullQuad is true
      getLightMaterial?: (light: T) => Material;
    }
  ) {
    opts = opts || {};
    // TODO light using full quad not supported yet.
    this._extraLightTypes[lightType] = {
      fullQuad: opts.fullQuad || false,
      getLightMaterial: opts.getLightMaterial as (light: Light) => Material
    };
  }

  /**
   * Do render
   * @param {clay.Renderer} renderer
   * @param {clay.Scene} scene
   * @param {clay.Camera} camera
   */
  render(
    renderer: Renderer,
    scene: Scene,
    camera: Camera,
    opts?: {
      /**
       * If not ouput and render to the target texture
       */
      notUpdateScene?: boolean;
      /**
       * If not update the scene.
       */
      notUpdateShadow?: boolean;

      /**
       * If using input gbuffer texture
       */
      gBufferTexture1?: Texture2D;
      gBufferTexture2?: Texture2D;
      gBufferTexture3?: Texture2D;

      ssaoTexture?: Texture2D;
      /**
       * If render to target texture.
       */
      targetTexture?: Texture2D;
    }
  ) {
    opts = opts || {};
    opts.notUpdateShadow = opts.notUpdateShadow || false;
    opts.notUpdateScene = opts.notUpdateScene || false;

    if (!opts.notUpdateScene) {
      scene.update();
    }
    scene.updateLights();

    const lightAccumTex = opts.targetTexture || this._lightAccumTex;

    const pixelRatio = renderer.getPixelRatio();
    const isInputGBuffer = opts.gBufferTexture1 && opts.gBufferTexture2 && opts.gBufferTexture3;

    if (
      this.autoResize &&
      (renderer.getWidth() * pixelRatio !== lightAccumTex.width ||
        renderer.getHeight() * pixelRatio !== lightAccumTex.height)
    ) {
      this.resize(renderer.getWidth() * pixelRatio, renderer.getHeight() * pixelRatio);
    }

    if (!isInputGBuffer) {
      this._gBuffer.update(renderer, scene, camera);
    }

    this._lightAccumFrameBuffer.attach(opts.targetTexture || this._lightAccumTex);
    // Accumulate light buffer
    this._accumulateLightBuffer(
      renderer,
      scene,
      camera,
      !opts.notUpdateShadow,
      isInputGBuffer
        ? {
            gBufferTexture1: opts.gBufferTexture1!,
            gBufferTexture2: opts.gBufferTexture2!,
            gBufferTexture3: opts.gBufferTexture3!
          }
        : undefined
    );

    this._renderOthers(
      renderer,
      scene,
      camera,
      isInputGBuffer ? opts.gBufferTexture2! : this._gBuffer.getTargetTexture2(),
      this._lightAccumFrameBuffer
    );

    if (!opts.targetTexture) {
      this._outputPass.material.set('colorTex', lightAccumTex);
      this._outputPass.render(renderer);
      // this._gBuffer.renderDebug(renderer, camera, 'normal');
    }
  }

  getTargetTexture() {
    return this._lightAccumTex;
  }

  /**
   * @return {clay.deferred.GBuffer}
   */
  getGBuffer() {
    return this._gBuffer;
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
    this._gBuffer.setViewport(
      x as number,
      y as number,
      width as number,
      height as number,
      dpr as number
    );
    this._lightAccumFrameBuffer.viewport = this._gBuffer.getViewport();
  }

  // getFullQuadLightPass: function () {
  //     return this._fullQuadPass;
  // },

  /**
   * Set renderer size.
   * @param {number} width
   * @param {number} height
   */
  resize(width: number, height: number) {
    this._lightAccumTex.resize(width, height);
    // PENDING viewport ?
    this._gBuffer.resize(width, height);
  }
  // Render transparent object, skybox
  private _renderOthers(
    renderer: Renderer,
    scene: Scene,
    camera: Camera,
    gBufferTexture2: Texture2D,
    frameBuffer: FrameBuffer
  ) {
    // Render depth
    const pass = this._fullQuadPass;
    this._depthWriteMat.set('depthTex', gBufferTexture2);
    pass.material = this._depthWriteMat as Material;
    pass.renderQuad(
      renderer,
      frameBuffer,
      (gl) => {
        gl.depthMask(true);
        gl.clear(gl.DEPTH_BUFFER_BIT);
        gl.colorMask(false, false, false, false);
      },
      (gl) => {
        gl.colorMask(true, true, true, true);
      }
    );

    if (scene.skybox) {
      scene.skybox.update();
      renderer.renderPass([scene.skybox], camera, frameBuffer);
    }
  }

  private _accumulateLightBuffer(
    renderer: Renderer,
    scene: Scene,
    camera: Camera,
    updateShadow?: boolean,
    gBufferTextures?: {
      gBufferTexture1: Texture2D;
      gBufferTexture2: Texture2D;
      gBufferTexture3: Texture2D;
    }
  ) {
    const gl = renderer.gl;
    const lightAccumFrameBuffer = this._lightAccumFrameBuffer;
    const fullQuadPass = this._fullQuadPass;

    const eyePosition = camera.getWorldPosition().array;

    // Update volume meshes
    scene.lights.forEach((light) => {
      if (!light.invisible) {
        this._updateLightProxy(light as DeferredLight);
      }
    });

    const shadowMapPass = this.shadowMapPass;
    if (shadowMapPass && updateShadow) {
      this._prepareLightShadow(renderer, scene, camera as PerspectiveCamera | OrthographicCamera);
    }

    const clearColor = renderer.clearColor;

    const viewport = lightAccumFrameBuffer.viewport;

    const viewProjectionInv = new Matrix4();
    Matrix4.multiply(viewProjectionInv, camera.worldTransform, camera.invProjectionMatrix);

    const volumeMeshList = [];
    const gBuffer = this._gBuffer;
    let gBufferTexture1: Texture2D;
    let gBufferTexture2: Texture2D;
    let gBufferTexture3: Texture2D;
    if (gBufferTextures) {
      gBufferTexture1 = gBufferTextures.gBufferTexture1;
      gBufferTexture2 = gBufferTextures.gBufferTexture2;
      gBufferTexture3 = gBufferTextures.gBufferTexture3;
    } else {
      gBufferTexture1 = gBuffer.getTargetTexture1();
      gBufferTexture2 = gBuffer.getTargetTexture2();
      gBufferTexture3 = gBuffer.getTargetTexture3();
    }

    // Render nothing and do the clear.
    renderer.renderPass([], camera, lightAccumFrameBuffer, {
      prepare() {
        if (viewport) {
          const dpr = viewport.pixelRatio;
          // use scissor to make sure only clear the viewport
          gl.enable(constants.SCISSOR_TEST);
          gl.scissor(
            viewport.x * dpr,
            viewport.y * dpr,
            viewport.width * dpr,
            viewport.height * dpr
          );
        }
        gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
        gl.clear(constants.COLOR_BUFFER_BIT | constants.DEPTH_BUFFER_BIT);
        gl.enable(constants.BLEND);
        if (viewport) {
          gl.disable(constants.SCISSOR_TEST);
        }
      }
    });

    let hasLight = false;
    for (let i = 0; i < scene.lights.length; i++) {
      const light = scene.lights[i];
      if (light.invisible) {
        continue;
      }
      hasLight = true;
      const uTpl = light.uniformTemplates!;

      const volumeMesh = light.volumeMesh || this._volumeMeshMap.get(light);
      const extraLightTypes = this._extraLightTypes;

      if (volumeMesh) {
        const material = volumeMesh.material;
        // Volume mesh will affect the scene bounding box when rendering
        // if castShadow is true
        volumeMesh.castShadow = false;

        let unknownLightType = false;
        switch (light.type) {
          case 'POINT_LIGHT':
            material.set('lightColor', uTpl.pointLightColor.value(light));
            material.set('lightRange', uTpl.pointLightRange.value(light));
            material.set('lightPosition', uTpl.pointLightPosition.value(light));
            break;
          case 'SPOT_LIGHT':
            material.set('lightPosition', uTpl.spotLightPosition.value(light));
            material.set('lightColor', uTpl.spotLightColor.value(light));
            material.set('lightRange', uTpl.spotLightRange.value(light));
            material.set('lightDirection', uTpl.spotLightDirection.value(light));
            material.set('umbraAngleCosine', uTpl.spotLightUmbraAngleCosine.value(light));
            material.set('penumbraAngleCosine', uTpl.spotLightPenumbraAngleCosine.value(light));
            material.set('falloffFactor', uTpl.spotLightFalloffFactor.value(light));
            break;
          case 'SPHERE_LIGHT':
            material.set('lightColor', uTpl.sphereLightColor.value(light));
            material.set('lightRange', uTpl.sphereLightRange.value(light));
            material.set('lightRadius', uTpl.sphereLightRadius.value(light));
            material.set('lightPosition', uTpl.sphereLightPosition.value(light));
            break;
          case 'TUBE_LIGHT':
            material.set('lightColor', uTpl.tubeLightColor.value(light));
            material.set('lightRange', uTpl.tubeLightRange.value(light));
            material.set('lightExtend', uTpl.tubeLightExtend.value(light));
            material.set('lightPosition', uTpl.tubeLightPosition.value(light));
            break;
          default:
            if (!(!extraLightTypes[light.type].fullQuad && light.volumeMesh)) {
              unknownLightType = true;
            }
        }

        if (unknownLightType) {
          continue;
        }

        material.set('eyePosition', eyePosition);
        material.set('viewProjectionInv', viewProjectionInv.array);
        material.set('gBufferTexture1', gBufferTexture1);
        material.set('gBufferTexture2', gBufferTexture2);
        material.set('gBufferTexture3', gBufferTexture3);
        material.transparent = true;
        material.depthMask = false;
        material.blend = lightAccumulateBlendFunc;

        this._updatePCFKernel(material);

        volumeMeshList.push(volumeMesh);
      } else {
        let unknownLightType = false;
        let passMaterial!: Material;
        let hasShadow;
        // Full quad light
        switch (light.type) {
          case 'AMBIENT_LIGHT':
            passMaterial = this._ambientMat;
            passMaterial.set('lightColor', uTpl.ambientLightColor.value(light));
            break;
          case 'AMBIENT_SH_LIGHT':
            passMaterial = this._ambientSHMat;
            passMaterial.set('lightColor', uTpl.ambientSHLightColor.value(light));
            passMaterial.set('lightCoefficients', uTpl.ambientSHLightCoefficients.value(light));
            break;
          case 'AMBIENT_CUBEMAP_LIGHT':
            passMaterial = this._ambientCubemapMat;
            passMaterial.set('lightColor', uTpl.ambientCubemapLightColor.value(light));
            passMaterial.set('lightCubemap', uTpl.ambientCubemapLightCubemap.value(light));
            passMaterial.set('brdfLookup', uTpl.ambientCubemapLightBRDFLookup.value(light));
            break;
          case 'DIRECTIONAL_LIGHT':
            hasShadow = shadowMapPass && light.castShadow;
            passMaterial = this._directionalLightMat;
            passMaterial[hasShadow ? 'define' : 'undefine']('fragment', 'SHADOWMAP_ENABLED');
            if (hasShadow) {
              passMaterial.define(
                'fragment',
                'SHADOW_CASCADE',
                (light as DirectionalLight).shadowCascade
              );
            }
            passMaterial.set('lightColor', uTpl.directionalLightColor.value(light));
            passMaterial.set('lightDirection', uTpl.directionalLightDirection.value(light));
            break;
          default:
            const extraLightConfig = extraLightTypes[light.type];
            if (
              extraLightConfig &&
              extraLightConfig.fullQuad &&
              extraLightConfig.getLightMaterial
            ) {
              passMaterial = extraLightConfig.getLightMaterial(light);
            } else {
              // Unkonw light type
              unknownLightType = true;
            }
        }
        if (unknownLightType) {
          continue;
        }

        passMaterial.set('eyePosition', eyePosition);
        passMaterial.set('viewProjectionInv', viewProjectionInv.array);
        passMaterial.set('gBufferTexture1', gBufferTexture1);
        passMaterial.set('gBufferTexture2', gBufferTexture2);
        passMaterial.set('gBufferTexture3', gBufferTexture3);

        // TODO
        if (shadowMapPass && light.castShadow) {
          const lightShadowInfo = this._lightShadowInfosMap.get(light);
          if (lightShadowInfo) {
            passMaterial.set('lightShadowMap', lightShadowInfo.shadowMap);
            passMaterial.set('lightMatrices', lightShadowInfo.lightMatrices);
            passMaterial.set('shadowCascadeClipsNear', lightShadowInfo.cascadeClipsNear);
            passMaterial.set('shadowCascadeClipsFar', lightShadowInfo.cascadeClipsFar);

            passMaterial.set('lightShadowMapSize', light.shadowResolution);
          }

          this._updatePCFKernel(passMaterial);
        }
        fullQuadPass.material = passMaterial;
        passMaterial.transparent = true;
        passMaterial.depthMask = false;
        passMaterial.blend = lightAccumulateBlendFunc;
        fullQuadPass.renderQuad(renderer, lightAccumFrameBuffer);
      }
    }

    this._renderVolumeMeshList(renderer, scene, camera, lightAccumFrameBuffer, volumeMeshList);

    if (!hasLight) {
      // Show pure black with ambient light.
      const passMaterial = this._ambientMat;
      // No need to set transparent and blend
      passMaterial.set('lightColor', [0, 0, 0]);
      passMaterial.set('gBufferTexture1', gBufferTexture1);
      passMaterial.set('gBufferTexture3', gBufferTexture3);
      passMaterial.depthMask = false;
      fullQuadPass.material = passMaterial;
      fullQuadPass.renderQuad(renderer, lightAccumFrameBuffer);
    }
  }

  private _updatePCFKernel(material: Material) {
    const shadowMapPass = this.shadowMapPass;
    if (shadowMapPass) {
      material.define('fragment', 'PCF_KERNEL_SIZE', shadowMapPass.kernelPCF.length / 2);
      material[shadowMapPass.PCSSLightSize > 0 ? 'define' : 'undefine'](
        'fragment',
        'PCSS_LIGHT_SIZE',
        shadowMapPass.PCSSLightSize.toFixed(2)
      );
      material.set('pcfKernel', shadowMapPass.kernelPCF);
    }
  }

  private _prepareLightShadow(
    renderer: Renderer,
    scene: Scene,
    camera: PerspectiveCamera | OrthographicCamera
  ) {
    for (let i = 0; i < scene.lights.length; i++) {
      const light = scene.lights[i] as DeferredLight;
      const volumeMesh = light.volumeMesh || this._volumeMeshMap.get(light)!;
      if (!light.castShadow || light.invisible) {
        continue;
      }

      switch (light.type) {
        case 'POINT_LIGHT':
        case 'SPOT_LIGHT':
          // Frustum culling
          Matrix4.multiply(worldView, camera.viewMatrix, volumeMesh.worldTransform);
          if (scene.isFrustumCulled(volumeMesh, camera, worldView.array)) {
            continue;
          }

          this._prepareSingleLightShadow(renderer, scene, camera, light, volumeMesh.material);
          break;
        case 'DIRECTIONAL_LIGHT':
          this._prepareSingleLightShadow(renderer, scene, camera, light, undefined);
      }
    }
  }

  private _prepareSingleLightShadow(
    renderer: Renderer,
    scene: Scene,
    camera: PerspectiveCamera | OrthographicCamera,
    light: DeferredLight,
    material?: Material
  ) {
    const shadowMapPass = this.shadowMapPass!;
    if (material) {
      this._updatePCFKernel(material);
    }
    if (light.type === 'POINT_LIGHT') {
      const shadowMaps: TextureCube[] = [];
      shadowMapPass.renderPointLightShadow(renderer, scene, light, shadowMaps);
      material!.set('lightShadowMap', shadowMaps[0]);
      material!.set('lightShadowMapSize', light.shadowResolution);
    } else if (light.type === 'SPOT_LIGHT') {
      const shadowMaps: Texture2D[] = [];
      const lightMatrices: mat4.Mat4Array[] = [];
      shadowMapPass.renderSpotLightShadow(renderer, scene, light, lightMatrices, shadowMaps);
      material!.set('lightShadowMap', shadowMaps[0]);
      material!.set('lightMatrix', lightMatrices[0]);
      material!.set('lightShadowMapSize', light.shadowResolution);
    } else if (light.type === 'DIRECTIONAL_LIGHT') {
      const shadowMaps: Texture2D[] = [];
      const lightMatrices: mat4.Mat4Array[] = [];
      const cascadeClips: number[] = [];
      shadowMapPass.renderDirectionalLightShadow(
        renderer,
        scene,
        camera,
        light,
        cascadeClips,
        lightMatrices,
        shadowMaps
      );
      const cascadeClipsNear = cascadeClips.slice();
      const cascadeClipsFar = cascadeClips.slice();
      cascadeClipsNear.pop();
      cascadeClipsFar.shift();

      // Iterate from far to near
      cascadeClipsNear.reverse();
      cascadeClipsFar.reverse();
      lightMatrices.reverse();

      const lightShadowInfosMap = this._lightShadowInfosMap;
      const lightShadowInfo = lightShadowInfosMap.get(light) || ({} as LightShadowInfo);
      lightShadowInfo.cascadeClipsNear = cascadeClipsNear;
      lightShadowInfo.cascadeClipsFar = cascadeClipsFar;
      lightShadowInfo.shadowMap = shadowMaps[0];
      lightShadowInfo.lightMatrices = lightMatrices;
      lightShadowInfosMap.set(light, lightShadowInfo);
    }
  }

  // Update light volume mesh
  // Light volume mesh is rendered in light accumulate pass instead of full quad.
  // It will reduce pixels significantly when local light is relatively small.
  // And we can use custom volume mesh to shape the light.
  //
  // See "Deferred Shading Optimizations" in GDC2011
  private _updateLightProxy(light: DeferredLight) {
    let volumeMesh;
    let shader;
    let r;
    let aspect;
    let range;
    const volumeMeshMap = this._volumeMeshMap;
    if (light.volumeMesh) {
      volumeMesh = light.volumeMesh;
    } else {
      switch (light.type) {
        // Only local light (point and spot) needs volume mesh.
        // Directional and ambient light renders in full quad
        case 'POINT_LIGHT':
        case 'SPHERE_LIGHT':
          shader = light.type === 'SPHERE_LIGHT' ? this._sphereLightShader : this._pointLightShader;
          // Volume mesh created automatically
          if (!volumeMeshMap.get(light)) {
            volumeMeshMap.set(
              light,
              new Mesh(this._lightSphereGeo, this._createLightPassMat(shader), {
                // Disable culling
                // if light volume mesh intersect camera near plane
                // We need mesh inside can still be rendered
                culling: false
              })
            );
          }
          volumeMesh = volumeMeshMap.get(light);
          r = light.range + ((light as SphereLight).radius || 0);
          volumeMesh!.scale.set(r, r, r);
          break;
        case 'SPOT_LIGHT':
          if (!volumeMeshMap.get(light)) {
            volumeMeshMap.set(
              light,
              new Mesh(this._lightConeGeo, this._createLightPassMat(this._spotLightShader), {
                culling: false
              })
            );
          }
          volumeMesh = volumeMeshMap.get(light);
          aspect = Math.tan((light.penumbraAngle * Math.PI) / 180);
          range = light.range;
          volumeMesh!.scale.set(aspect * range, aspect * range, range / 2);
          break;
        case 'TUBE_LIGHT':
          if (!volumeMeshMap.get(light)) {
            volumeMeshMap.set(
              light,
              new Mesh(this._lightCylinderGeo, this._createLightPassMat(this._tubeLightShader), {
                culling: false
              })
            );
          }
          volumeMesh = volumeMeshMap.get(light);
          range = light.range;
          volumeMesh!.scale.set(light.length / 2 + range, range, range);
          break;
      }
    }
    if (volumeMesh) {
      volumeMesh.update();
      // Apply light transform
      Matrix4.multiply(volumeMesh.worldTransform, light.worldTransform, volumeMesh.worldTransform);
      const hasShadow = this.shadowMapPass && light.castShadow;
      volumeMesh.material[hasShadow ? 'define' : 'undefine']('fragment', 'SHADOWMAP_ENABLED');
    }
  }

  private _renderVolumeMeshList(
    renderer: Renderer,
    scene: Scene,
    camera: Camera,
    lightAccumFrameBuffer: FrameBuffer,
    volumeMeshList: Mesh[]
  ) {
    const gl = renderer.gl;

    gl.depthFunc(gl.LEQUAL);

    function getPreZMaterial() {
      return preZMaterial;
    }

    for (let i = 0; i < volumeMeshList.length; i++) {
      const volumeMesh = volumeMeshList[i];

      // Frustum culling
      Matrix4.multiply(worldView, camera.viewMatrix, volumeMesh.worldTransform);
      if (scene.isFrustumCulled(volumeMesh, camera, worldView.array)) {
        continue;
      }

      renderer.renderPass([volumeMesh], camera, lightAccumFrameBuffer, {
        getMaterial: getPreZMaterial,
        prepare() {
          // Use prez to avoid one pixel rendered twice
          gl.colorMask(false, false, false, false);
          gl.depthMask(true);
          // depthMask must be enabled before clear DEPTH_BUFFER
          gl.clear(gl.DEPTH_BUFFER_BIT);
        }
      });

      volumeMesh.material.depthMask = true;
      renderer.renderPass([volumeMesh], camera, lightAccumFrameBuffer, {
        prepare() {
          // Render light
          gl.colorMask(true, true, true, true);
        }
      });
    }

    gl.depthFunc(gl.LESS);
  }

  dispose(renderer: Renderer) {
    this._gBuffer.dispose(renderer);

    renderer.disposeFrameBuffer(this._lightAccumFrameBuffer);
    renderer.disposeTexture(this._lightAccumTex);
    renderer.disposeGeometry(this._lightConeGeo);
    renderer.disposeGeometry(this._lightCylinderGeo);
    renderer.disposeGeometry(this._lightSphereGeo);

    this._fullQuadPass.dispose(renderer);
    this._outputPass.dispose(renderer);

    this.shadowMapPass && this.shadowMapPass.dispose(renderer);
  }
}

export default DeferredRenderer;
