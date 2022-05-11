// Light-pre pass deferred rendering
// http://www.realtimerendering.com/blog/deferred-lighting-approaches/
import Shader from '../Shader';
import Material from '../Material';
import FrameBuffer from '../FrameBuffer';
import FullQuadPass from '../composite/Pass';
import Texture2D from '../Texture2D';
import Mesh from '../Mesh';
import SphereGeo from '../geometry/Sphere';
import ConeGeo from '../geometry/Cone';
import CylinderGeo from '../geometry/Cylinder';
import Matrix4 from '../math/Matrix4';
import Vector3 from '../math/Vector3';
import GBuffer from './GBuffer';

import prezGlsl from '../shader/source/prez.glsl.js';
import utilGlsl from '../shader/source/util.glsl.js';

import lightvolumeGlsl from '../shader/source/deferred/lightvolume.glsl.js';
// Light shaders
import spotGlsl from '../shader/source/deferred/spot.glsl.js';
import directionalGlsl from '../shader/source/deferred/directional.glsl.js';
import ambientGlsl from '../shader/source/deferred/ambient.glsl.js';
import ambientshGlsl from '../shader/source/deferred/ambientsh.glsl.js';
import ambientcubemapGlsl from '../shader/source/deferred/ambientcubemap.glsl.js';
import pointGlsl from '../shader/source/deferred/point.glsl.js';
import sphereGlsl from '../shader/source/deferred/sphere.glsl.js';
import tubeGlsl from '../shader/source/deferred/tube.glsl.js';
import outputGlsl from '../shader/source/compositor/output.glsl.js';
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

Shader.import(prezGlsl);
Shader.import(utilGlsl);
Shader.import(lightvolumeGlsl);

// Light shaders
Shader.import(spotGlsl);
Shader.import(directionalGlsl);
Shader.import(ambientGlsl);
Shader.import(ambientshGlsl);
Shader.import(ambientcubemapGlsl);
Shader.import(pointGlsl);
Shader.import(sphereGlsl);
Shader.import(tubeGlsl);

Shader.import(prezGlsl);
Shader.import(outputGlsl);

const worldView = new Matrix4();
const preZMaterial = new Material({
  shader: new Shader(Shader.source('clay.prez.vertex'), Shader.source('clay.prez.fragment'))
});

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

  private _fullQuadPass = new FullQuadPass('', {
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

  private _outputPass = new FullQuadPass(Shader.source('clay.compositor.output'));
  private _createLightPassMat: (shader: Shader) => Material;

  constructor() {
    super();
    const fullQuadVertex = Shader.source('clay.compositor.vertex');
    const lightVolumeVertex = Shader.source('clay.deferred.light_volume.vertex');

    const directionalLightShader = new Shader(
      fullQuadVertex,
      Shader.source('clay.deferred.directional_light')
    );

    const lightAccumulateBlendFunc = function (gl: WebGLRenderingContext) {
      gl.blendEquation(gl.FUNC_ADD);
      gl.blendFuncSeparate(gl.ONE, gl.ONE, gl.ONE, gl.ONE);
    };

    const createLightPassMat = function (shader: Shader) {
      return new Material({
        shader,
        blend: lightAccumulateBlendFunc,
        transparent: true,
        depthMask: false
      });
    };
    this._createLightPassMat = createLightPassMat;

    const createVolumeShader = function (name: string) {
      return new Shader(lightVolumeVertex, Shader.source('clay.deferred.' + name));
    };

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
      new Shader(fullQuadVertex, Shader.source('clay.deferred.ambient_light'))
    );
    this._ambientSHMat = this._createLightPassMat(
      new Shader(fullQuadVertex, Shader.source('clay.deferred.ambient_sh_light'))
    );
    this._ambientCubemapMat = this._createLightPassMat(
      new Shader(fullQuadVertex, Shader.source('clay.deferred.ambient_cubemap_light'))
    );

    this._spotLightShader = createVolumeShader('spot_light');
    this._pointLightShader = createVolumeShader('point_light');

    this._sphereLightShader = createVolumeShader('sphere_light');
    this._tubeLightShader = createVolumeShader('tube_light');

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
      this._outputPass.setUniform('texture', this._lightAccumTex);

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
            material.setUniform('lightColor', uTpl.pointLightColor.value(light));
            material.setUniform('lightRange', uTpl.pointLightRange.value(light));
            material.setUniform('lightPosition', uTpl.pointLightPosition.value(light));
            break;
          case 'SPOT_LIGHT':
            material.setUniform('lightPosition', uTpl.spotLightPosition.value(light));
            material.setUniform('lightColor', uTpl.spotLightColor.value(light));
            material.setUniform('lightRange', uTpl.spotLightRange.value(light));
            material.setUniform('lightDirection', uTpl.spotLightDirection.value(light));
            material.setUniform('umbraAngleCosine', uTpl.spotLightUmbraAngleCosine.value(light));
            material.setUniform(
              'penumbraAngleCosine',
              uTpl.spotLightPenumbraAngleCosine.value(light)
            );
            material.setUniform('falloffFactor', uTpl.spotLightFalloffFactor.value(light));
            break;
          case 'SPHERE_LIGHT':
            material.setUniform('lightColor', uTpl.sphereLightColor.value(light));
            material.setUniform('lightRange', uTpl.sphereLightRange.value(light));
            material.setUniform('lightRadius', uTpl.sphereLightRadius.value(light));
            material.setUniform('lightPosition', uTpl.sphereLightPosition.value(light));
            break;
          case 'TUBE_LIGHT':
            material.setUniform('lightColor', uTpl.tubeLightColor.value(light));
            material.setUniform('lightRange', uTpl.tubeLightRange.value(light));
            material.setUniform('lightExtend', uTpl.tubeLightExtend.value(light));
            material.setUniform('lightPosition', uTpl.tubeLightPosition.value(light));
            break;
          default:
            unknownLightType = true;
        }

        if (unknownLightType) {
          continue;
        }

        material.setUniform('eyePosition', eyePosition);
        material.setUniform('viewProjectionInv', viewProjectionInv.array);
        material.setUniform('gBufferTexture1', gBuffer.getTargetTexture1());
        material.setUniform('gBufferTexture2', gBuffer.getTargetTexture2());
        material.setUniform('gBufferTexture3', gBuffer.getTargetTexture3());

        volumeMeshList.push(volumeMesh);
      } else {
        const pass = this._fullQuadPass;
        let unknownLightType = false;
        let hasShadow;
        // Full quad light
        switch (light.type) {
          case 'AMBIENT_LIGHT':
            pass.material = this._ambientMat;
            pass.material.setUniform('lightColor', uTpl.ambientLightColor.value(light));
            break;
          case 'AMBIENT_SH_LIGHT':
            pass.material = this._ambientSHMat;
            pass.material.setUniform('lightColor', uTpl.ambientSHLightColor.value(light));
            pass.material.setUniform(
              'lightCoefficients',
              uTpl.ambientSHLightCoefficients.value(light)
            );
            break;
          case 'AMBIENT_CUBEMAP_LIGHT':
            pass.material = this._ambientCubemapMat;
            pass.material.setUniform('lightColor', uTpl.ambientCubemapLightColor.value(light));
            pass.material.setUniform('lightCubemap', uTpl.ambientCubemapLightCubemap.value(light));
            pass.material.setUniform('brdfLookup', uTpl.ambientCubemapLightBRDFLookup.value(light));
            break;
          case 'DIRECTIONAL_LIGHT':
            hasShadow = shadowMapPass && light.castShadow;
            pass.material = this._directionalLightMat;
            pass.material[hasShadow ? 'define' : 'undefine']('fragment', 'SHADOWMAP_ENABLED');
            if (hasShadow) {
              pass.material.define(
                'fragment',
                'SHADOW_CASCADE',
                (light as DirectionalLight).shadowCascade
              );
            }
            pass.material.setUniform('lightColor', uTpl.directionalLightColor.value(light));
            pass.material.setUniform('lightDirection', uTpl.directionalLightDirection.value(light));
            break;
          default:
            // Unkonw light type
            unknownLightType = true;
        }
        if (unknownLightType) {
          continue;
        }

        const passMaterial = pass.material!;
        passMaterial.setUniform('eyePosition', eyePosition);
        passMaterial.setUniform('viewProjectionInv', viewProjectionInv.array);
        passMaterial.setUniform('gBufferTexture1', gBuffer.getTargetTexture1());
        passMaterial.setUniform('gBufferTexture2', gBuffer.getTargetTexture2());
        passMaterial.setUniform('gBufferTexture3', gBuffer.getTargetTexture3());

        // TODO
        if (shadowMapPass && light.castShadow) {
          const lightShadowInfo = lightShadowInfosMap.get(light)!;
          passMaterial.setUniform('lightShadowMap', lightShadowInfo.shadowMap);
          passMaterial.setUniform('lightMatrices', lightShadowInfo.lightMatrices);
          passMaterial.setUniform('shadowCascadeClipsNear', lightShadowInfo.cascadeClipsNear);
          passMaterial.setUniform('shadowCascadeClipsFar', lightShadowInfo.cascadeClipsFar);

          passMaterial.setUniform('lightShadowMapSize', light.shadowResolution);
        }

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
      material!.setUniform('lightShadowMap', shadowMaps[0]);
      material!.setUniform('lightShadowMapSize', light.shadowResolution);
    } else if (light.type === 'SPOT_LIGHT') {
      const shadowMaps: Texture2D[] = [];
      const lightMatrices: mat4.Mat4Array[] = [];
      shadowMapPass.renderSpotLightShadow(renderer, scene, light, lightMatrices, shadowMaps);
      material!.setUniform('lightShadowMap', shadowMaps[0]);
      material!.setUniform('lightMatrix', lightMatrices[0]);
      material!.setUniform('lightShadowMapSize', light.shadowResolution);
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
              new Mesh({
                material: this._createLightPassMat(shader),
                geometry: this._lightSphereGeo,
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
              new Mesh({
                material: this._createLightPassMat(this._spotLightShader),
                geometry: this._lightConeGeo,
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
              new Mesh({
                material: this._createLightPassMat(this._tubeLightShader),
                geometry: this._lightCylinderGeo,
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
