// Light-pre pass deferred rendering
// http://www.realtimerendering.com/blog/deferred-lighting-approaches/
import Shader from '../Shader';
import Material from '../Material';
import FrameBuffer from '../FrameBuffer';
import FullscreenQuadPass from '../composite/Pass';
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
import Notifier from '../core/Notifier';
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
import { directionalLightFragment } from '../shader/source/deferred/directional.glsl';
import { fullscreenQuadPassVertex } from '../shader/source/compositor/vertex.glsl';
import { lightVolumeVertex } from '../shader/source/deferred/lightvolume.glsl';
import { ambientLightFragment } from '../shader/source/deferred/ambient.glsl';
import { ambientSHLightFragment } from '../shader/source/deferred/ambientsh.glsl';
import { ambientCubemapLightFragment } from '../shader/source/deferred/ambientcubemap.glsl';
import { spotLightFragment } from '../shader/source/deferred/spot.glsl';
import { pointLightFragment } from '../shader/source/deferred/point.glsl';
import { sphereLightFragment } from '../shader/source/deferred/sphere.glsl';
import { tubeLightFragment } from '../shader/source/deferred/tube.glsl';

const worldView = new Matrix4();
const preZMaterial = new Material(new Shader(preZVertex, preZFragment));

type DeferredLight = PointLight | SphereLight | SpotLight | TubeLight | DirectionalLight;

interface LightShadowInfo {
  cascadeClipsNear: number[];
  cascadeClipsFar: number[];
  shadowMap: Texture2D;
  lightMatrices: mat4.Mat4Array[];
}

const volumeMeshMap = new WeakMap<Light, Mesh>();
const lightShadowInfosMap = new WeakMap<Light, LightShadowInfo>();
/**
 * Deferred renderer
 */
class DeferredRenderer extends Notifier {
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
    type: constants.HALF_FLOAT_OES,
    minFilter: constants.NEAREST,
    magFilter: constants.NEAREST
  });

  // TODO Support dynamic material?
  private _fullQuadPass = new FullscreenQuadPass(outputFragment, {
    blendWithPrevious: true
  });

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

  constructor() {
    super();
    const directionalLightShader = new Shader(fullscreenQuadPassVertex, directionalLightFragment);

    const lightAccumulateBlendFunc = function (gl: WebGLRenderingContext) {
      gl.blendEquation(gl.FUNC_ADD);
      gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ONE, gl.ONE);
    };

    const createLightPassMat = function <T extends Shader>(shader: T) {
      return new Material(shader, {
        blend: lightAccumulateBlendFunc,
        transparent: true,
        depthMask: false
      });
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
      new Shader(fullscreenQuadPassVertex, ambientLightFragment)
    );
    this._ambientSHMat = this._createLightPassMat(
      new Shader(fullscreenQuadPassVertex, ambientSHLightFragment)
    );
    this._ambientCubemapMat = this._createLightPassMat(
      new Shader(fullscreenQuadPassVertex, ambientCubemapLightFragment)
    );

    this._spotLightShader = new Shader(lightVolumeVertex, spotLightFragment);
    this._pointLightShader = new Shader(lightVolumeVertex, pointLightFragment);

    this._sphereLightShader = new Shader(lightVolumeVertex, sphereLightFragment);
    this._tubeLightShader = new Shader(lightVolumeVertex, tubeLightFragment);

    this._lightConeGeo = coneGeo;
    this._lightCylinderGeo = cylinderGeo;
  }

  /**
   * Do render
   * @param {clay.Renderer} renderer
   * @param {clay.Scene} scene
   * @param {clay.Camera} camera
   * @param {Object} [opts]
   * @param {boolean} [opts.renderToTarget = false] If not ouput and render to the target texture
   * @param {boolean} [opts.notUpdateShadow = true] If not update the shadow.
   * @param {boolean} [opts.notUpdateScene = true] If not update the scene.
   */
  render(
    renderer: Renderer,
    scene: Scene,
    camera: Camera,
    opts?: {
      notUpdateScene?: boolean;
      renderToTarget?: boolean;
      notUpdateShadow?: boolean;
    }
  ) {
    opts = opts || {};
    opts.renderToTarget = opts.renderToTarget || false;
    opts.notUpdateShadow = opts.notUpdateShadow || false;
    opts.notUpdateScene = opts.notUpdateScene || false;

    if (!opts.notUpdateScene) {
      scene.update();
    }
    scene.updateLights();
    // Render list will be updated in gbuffer.
    camera.update();

    // PENDING For stereo rendering
    const dpr = renderer.getDevicePixelRatio();
    if (
      this.autoResize &&
      (renderer.getWidth() * dpr !== this._lightAccumTex.width ||
        renderer.getHeight() * dpr !== this._lightAccumTex.height)
    ) {
      this.resize(renderer.getWidth() * dpr, renderer.getHeight() * dpr);
    }

    this._gBuffer.update(renderer, scene, camera);

    // Accumulate light buffer
    this._accumulateLightBuffer(renderer, scene, camera, !opts.notUpdateShadow);

    if (!opts.renderToTarget) {
      this._outputPass.material.set('texture', this._lightAccumTex);
      this._outputPass.render(renderer);
      // this._gBuffer.renderDebug(renderer, camera, 'normal');
    }
  }

  /**
   * @return {clay.Texture2D}
   */
  getTargetTexture() {
    return this._lightAccumTex;
  }

  /**
   * @return {clay.FrameBuffer}
   */
  getTargetFrameBuffer() {
    return this._lightAccumFrameBuffer;
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
    this._lightAccumTex.width = width;
    this._lightAccumTex.height = height;

    // PENDING viewport ?
    this._gBuffer.resize(width, height);
  }

  _accumulateLightBuffer(renderer: Renderer, scene: Scene, camera: Camera, updateShadow?: boolean) {
    const gl = renderer.gl;
    const lightAccumTex = this._lightAccumTex;
    const lightAccumFrameBuffer = this._lightAccumFrameBuffer;

    const eyePosition = camera.getWorldPosition().array;

    // Update volume meshes
    scene.lights.forEach((light) => {
      if (!light.invisible) {
        this._updateLightProxy(light as DeferredLight);
      }
    });

    const shadowMapPass = this.shadowMapPass;
    if (shadowMapPass && updateShadow) {
      gl.clearColor(1, 1, 1, 1);
      this._prepareLightShadow(renderer, scene, camera as PerspectiveCamera | OrthographicCamera);
    }

    this.trigger('beforelightaccumulate', renderer, scene, camera, updateShadow);

    lightAccumFrameBuffer.attach(lightAccumTex);
    lightAccumFrameBuffer.bind(renderer);
    const clearColor = renderer.clearColor;

    const viewport = lightAccumFrameBuffer.viewport;
    if (viewport) {
      const dpr = viewport.devicePixelRatio;
      // use scissor to make sure only clear the viewport
      gl.enable(gl.SCISSOR_TEST);
      gl.scissor(viewport.x * dpr, viewport.y * dpr, viewport.width * dpr, viewport.height * dpr);
    }
    gl.clearColor(clearColor[0], clearColor[1], clearColor[2], clearColor[3]);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.BLEND);
    if (viewport) {
      gl.disable(gl.SCISSOR_TEST);
    }

    this.trigger('startlightaccumulate', renderer, scene, camera);

    const viewProjectionInv = new Matrix4();
    Matrix4.multiply(viewProjectionInv, camera.worldTransform, camera.invProjectionMatrix);

    const volumeMeshList = [];
    const gBuffer = this._gBuffer;

    for (let i = 0; i < scene.lights.length; i++) {
      const light = scene.lights[i];
      if (light.invisible) {
        continue;
      }

      const uTpl = light.uniformTemplates!;

      const volumeMesh = light.volumeMesh || volumeMeshMap.get(light);

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
            unknownLightType = true;
        }

        if (unknownLightType) {
          continue;
        }

        material.set('eyePosition', eyePosition);
        material.set('viewProjectionInv', viewProjectionInv.array);
        material.set('gBufferTexture1', gBuffer.getTargetTexture1());
        material.set('gBufferTexture2', gBuffer.getTargetTexture2());
        material.set('gBufferTexture3', gBuffer.getTargetTexture3());

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
            // Unkonw light type
            unknownLightType = true;
        }
        if (unknownLightType) {
          continue;
        }

        passMaterial.set('eyePosition', eyePosition);
        passMaterial.set('viewProjectionInv', viewProjectionInv.array);
        passMaterial.set('gBufferTexture1', gBuffer.getTargetTexture1());
        passMaterial.set('gBufferTexture2', gBuffer.getTargetTexture2());
        passMaterial.set('gBufferTexture3', gBuffer.getTargetTexture3());

        // TODO
        if (shadowMapPass && light.castShadow) {
          const lightShadowInfo = lightShadowInfosMap.get(light)!;
          passMaterial.set('lightShadowMap', lightShadowInfo.shadowMap);
          passMaterial.set('lightMatrices', lightShadowInfo.lightMatrices);
          passMaterial.set('shadowCascadeClipsNear', lightShadowInfo.cascadeClipsNear);
          passMaterial.set('shadowCascadeClipsFar', lightShadowInfo.cascadeClipsFar);

          passMaterial.set('lightShadowMapSize', light.shadowResolution);
        }
        const pass = this._fullQuadPass;
        pass.material = passMaterial;

        pass.renderQuad(renderer);
      }
    }

    this._renderVolumeMeshList(renderer, scene, camera, volumeMeshList);

    this.trigger('lightaccumulate', renderer, scene, camera);

    lightAccumFrameBuffer.unbind(renderer);

    this.trigger('afterlightaccumulate', renderer, scene, camera);
  }

  _prepareLightShadow(
    renderer: Renderer,
    scene: Scene,
    camera: PerspectiveCamera | OrthographicCamera
  ) {
    for (let i = 0; i < scene.lights.length; i++) {
      const light = scene.lights[i] as DeferredLight;
      const volumeMesh = light.volumeMesh || volumeMeshMap.get(light)!;
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

  _prepareSingleLightShadow(
    renderer: Renderer,
    scene: Scene,
    camera: PerspectiveCamera | OrthographicCamera,
    light: DeferredLight,
    material?: Material
  ) {
    const shadowMapPass = this.shadowMapPass!;
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
  _updateLightProxy(light: DeferredLight) {
    let volumeMesh;
    let shader;
    let r;
    let aspect;
    let range;
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

  _renderVolumeMeshList(renderer: Renderer, scene: Scene, camera: Camera, volumeMeshList: Mesh[]) {
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

      // Use prez to avoid one pixel rendered twice
      gl.colorMask(false, false, false, false);
      gl.depthMask(true);
      // depthMask must be enabled before clear DEPTH_BUFFER
      gl.clear(gl.DEPTH_BUFFER_BIT);

      renderer.renderPass([volumeMesh], camera, {
        getMaterial: getPreZMaterial
      });

      // Render light
      gl.colorMask(true, true, true, true);

      volumeMesh.material.depthMask = true;
      renderer.renderPass([volumeMesh], camera);
    }

    gl.depthFunc(gl.LESS);
  }

  dispose(renderer: Renderer) {
    this._gBuffer.dispose(renderer);

    this._lightAccumFrameBuffer.dispose(renderer);
    this._lightAccumTex.dispose(renderer);

    this._lightConeGeo.dispose(renderer);
    this._lightCylinderGeo.dispose(renderer);
    this._lightSphereGeo.dispose(renderer);

    this._fullQuadPass.dispose(renderer);
    this._outputPass.dispose(renderer);

    this.shadowMapPass && this.shadowMapPass.dispose(renderer);
  }
}

export default DeferredRenderer;
