// TODO createCompositor
// TODO Dispose test. geoCache test.
// TODO Tonemapping exposure
// TODO fitModel.
// TODO Particle ?
import Renderer, { RendererOpts } from './Renderer';
import Scene, { RenderList } from './Scene';
import Timeline from './Timeline';
import CubeGeo from './geometry/Cube';
import SphereGeo from './geometry/Sphere';
import PlaneGeo from './geometry/Plane';
import ParametricSurfaceGeo, { ParametricSurfaceGeometryOpts } from './geometry/ParametricSurface';
import Texture2D, { Texture2DOpts } from './Texture2D';
import TextureCube, { CubeTarget, TextureCubeOpts } from './TextureCube';
import Texture, { TextureImageSource } from './Texture';
import Mesh from './Mesh';
import Material, { GeneralMaterialUniformObject, MaterialOpts } from './Material';
import Vector3 from './math/Vector3';
import { GLTFLoadResult, load as loadGLTF } from './loader/GLTF';
import ClayNode from './Node';
import DirectionalLight from './light/Directional';
import PointLight from './light/Point';
import SpotLight from './light/Spot';
import AmbientLight from './light/Ambient';
import AmbientCubemapLight from './light/AmbientCubemap';
import AmbientSHLight from './light/AmbientSH';
import ShadowMapPass from './prePass/ShadowMap';
import LRUCache from './core/LRU';
import * as util from './core/util';
import * as shUtil from './util/sh';
import * as textureUtil from './util/texture';
import * as colorUtil from './core/color';

import { Notifier } from './core';
import GPUResourceManager from './app/GPUResourceManager';
import Camera from './Camera';
import { EventManager, EventTriggers } from './app/EventManager';
import type Renderable from './Renderable';
import Shader, { isTextureUniform } from './Shader';
import { createStandardShader } from './shader/create';
import Geometry from './Geometry';
import { Color } from './core/type';

interface App3DEventOpts {
  /**
   * Container that event will be listened to
   */
  enabled?: boolean;
  trigger?: EventTriggers[];
  container?: HTMLElement;
}
interface App3DGraphicOpts {
  /**
   * If enable shadow
   */
  shadow?: boolean;
  /**
   * If use linear color space
   */
  linear?: boolean;

  /**
   * If enable ACES tone mapping.
   */
  tonemapping?: boolean;
}
interface App3DOpts {
  pixelRatio?: number;
  width?: number;
  height?: number;

  /**
   * If render automatically each frame.
   */
  autoRender?: boolean;

  /**
   * If do auto gc on the gpu resources.
   * Otherwise needs to call gc() manually
   */
  autoGC?: boolean;

  /**
   * If update camera aspect automatically.
   */
  autoUpdateCameraAspect?: boolean;

  /**
   * If not init immediately. Should call init method manually.
   *
   * App will start the loop after promise returned from init resolved.
   */
  lazyInit?: boolean;
  /**
   * If enable mouse/touch event. It will slow down the system if geometries are complex.
   */
  event?: App3DEventOpts | boolean;

  /**
   * Graphic configuration including shadow, color space.
   */
  graphic?: App3DGraphicOpts;

  /**
   * Attributes for creating gl context
   */
  glAttributes?: {
    alpha?: boolean;
    depth?: boolean;
    stencil?: boolean;
    antialias?: boolean;
    premultipliedAlpha?: boolean;
    preserveDrawingBuffer?: boolean;
  };
}

type StandardShader = ReturnType<typeof createStandardShader>;
type CreateMaterialConfig<T extends Material['shader'] = StandardShader> = Partial<MaterialOpts> & {
  shader?: T;
  textureFlipY?: boolean;

  textureLoaded?: (textureName: string, texture: Texture) => void;
  texturesReady?: (textures: Texture[]) => void;
} & {
  // Uniform values
  [key: string]: any;
};
/**
 * Using App3D is a much more convenient way to create and manage your 3D application.
 *
 * It provides the abilities to:
 *
 * + Manage application loop and rendering.
 * + Collect GPU resource automatically without memory leak concern.
 * + Mouse event management.
 * + Create scene objects, materials, textures with simpler code.
 * + Load models with one line of code.
 * + Promised interfaces.
 *
 * Here is a basic example to create a rotating cube.
 *
```js
const app = new App3D('#viewport');
// Create a perspective camera.
// First parameter is the camera position. Which is in front of the cube.
// Second parameter is the camera lookAt target. Which is the origin of the world, and where the cube puts.
const camera = app.createCamera([0, 2, 5], [0, 0, 0]);
// Create a sample cube
const cube = app.createCube();
// Create a directional light. The direction is from top right to left bottom, away from camera.
const mainLight = app.createDirectionalLight([-1, -1, -1]);
app.loop((app) => {
  // Simply rotating the cube every frame.
  this._cube.rotation.rotateY(app.frameTime / 1000);
});
```
 * @param dom Container dom element or a selector string that can be used in `querySelector`
 * @param option Options in creating app3D
 */
class App3D extends Notifier {
  private _container: HTMLElement;

  private _renderer: Renderer;
  private _scene!: Scene;
  private _timeline: Timeline;
  private _shadowPass?: ShadowMapPass;

  private _gpuResourceManager: GPUResourceManager;
  private _eventManager?: EventManager;

  private _geoCache = new LRUCache<Geometry>(20);
  private _texCache = new LRUCache(20);

  private _graphicOpts: App3DGraphicOpts;

  private _inRender = false;
  private _disposed = false;
  private _autoRender;
  private _autoGC;
  private _autoUpdateCameraAspect;
  private _inited = false;

  private _frameTime: number = 0;
  private _elapsedTime: number = 0;

  private _defaultShader = createStandardShader();

  constructor(container: HTMLElement | string, opts?: App3DOpts) {
    super();
    opts = util.assign({}, opts);

    this._autoRender = util.optional(opts.autoRender, true);
    this._autoGC = util.optional(opts.autoGC, true);
    this._autoUpdateCameraAspect = util.optional(opts.autoUpdateCameraAspect, true);

    const graphicOpts = (this._graphicOpts = opts.graphic || {});
    const glAttributes = opts.glAttributes || {};

    if (typeof container === 'string') {
      container = window.document.querySelector(container) as HTMLElement;
    }

    if (!container) {
      throw new Error('Invalid dom');
    }

    this._container = container;

    const isDomCanvas =
      !container.nodeName || // Not in dom environment
      container.nodeName.toUpperCase() === 'CANVAS';

    const rendererOpts: Partial<RendererOpts> = {};
    isDomCanvas && (rendererOpts.canvas = container as HTMLCanvasElement);
    opts.pixelRatio && (rendererOpts.pixelRatio = opts.pixelRatio);

    (
      [
        'alpha',
        'depth',
        'stencil',
        'antialias',
        'premultipliedAlpha',
        'preserveDrawingBuffer'
      ] as const
    ).forEach(function (attrName) {
      if (glAttributes[attrName] != null) {
        rendererOpts[attrName] = glAttributes[attrName];
      }
    });

    const renderer = (this._renderer = new Renderer(rendererOpts));
    const scene = new Scene();

    const width = opts.width || container.clientWidth;
    const height = opts.height || container.clientHeight;

    const timeline = (this._timeline = new Timeline());
    const eventOpts =
      typeof opts.event === 'boolean'
        ? {
            enabled: opts.event
          }
        : opts.event;

    this._gpuResourceManager = new GPUResourceManager(renderer);

    if (graphicOpts.shadow) {
      this._shadowPass = new ShadowMapPass();
    }

    if (eventOpts && eventOpts.enabled) {
      this._eventManager = new EventManager(eventOpts.container || container, renderer, scene);
      this._eventManager.enable(eventOpts.trigger);
    }
    !isDomCanvas && container.appendChild(renderer.canvas);

    // Set scene to initialize.
    this._onBeforeRenderScene = this._onBeforeRenderScene.bind(this);
    this.scene = scene;

    renderer.resize(width, height);

    timeline.start();

    if (!opts.lazyInit) {
      this._doInit();
    }
  }

  get scene() {
    return this._scene;
  }

  set scene(scene: Scene) {
    if (scene === this._scene || this._disposed) {
      return;
    }
    if (this._eventManager) {
      this._eventManager.setScene(scene);
    }

    this._scene && this._scene.off('beforerender', this._onBeforeRenderScene);
    scene.on('beforerender', this._onBeforeRenderScene);

    this._scene = scene;
  }

  get renderer() {
    return this._renderer;
  }

  get container() {
    return this._container;
  }

  get timeline() {
    return this._timeline;
  }

  get frameTime() {
    return this._frameTime;
  }

  get elapsedTime() {
    return this._elapsedTime;
  }

  get width() {
    return this._renderer.getWidth();
  }

  get height() {
    return this._renderer.getHeight();
  }

  getShadowMapPass() {
    return this._shadowPass;
  }

  getEventManager() {
    return this._eventManager;
  }

  /**
   * Init app3D. Only available when lazyInit is set true.
   *
   * @param prepare Prepare before an intialization.
   *  Return a promise that should be resolved when app is ready
   */
  init(prepare?: () => Promise<any>) {
    if (this._inited) {
      console.error('Already inited. Set lazyInit: true.');
      return;
    }

    Promise.resolve(prepare && prepare()).then(() => {
      this._doInit();
    });
  }

  /**
   * Alias for app3D.on('loop')
   */
  loop(cb: (frameTime: number) => void) {
    this.on('loop', cb);
  }

  private _onBeforeRenderScene(
    renderer: Renderer,
    scene: Scene,
    camera: Camera,
    renderList: RenderList
  ) {
    if (this._inRender) {
      // Only update graphic options when using #render function.
      (['opaque', 'transparent'] as const).forEach((type) => {
        this._updateGraphicOptions(this._graphicOpts, renderList[type], false);
      });
    }
  }

  private _doInit() {
    this._inited = true;

    this._frameTime = 0;
    this._elapsedTime = 0;
    this._timeline.on('frame', (frameTime: number) => {
      this._frameTime = frameTime;
      this._elapsedTime += frameTime;

      if (this._autoUpdateCameraAspect) {
        const camera = this._scene.getMainCamera();
        if (camera && camera.projection.type === 'perspective') {
          camera.projection.aspect = this._renderer.getViewportAspect();
        }
      }

      this.trigger('loop', frameTime);

      if (this._autoRender) {
        this.render();
      }

      if (this._autoGC) {
        this._gpuResourceManager.collect(this._scene);
      }
    });
  }

  private _updateGraphicOptions(
    graphicOpts: App3DGraphicOpts,
    list: Renderable[],
    isSkybox?: boolean
  ) {
    const enableTonemapping = !!graphicOpts.tonemapping;
    const isLinearSpace = !!graphicOpts.linear;

    let prevMaterial;

    for (let i = 0; i < list.length; i++) {
      const mat = list[i].material;
      if (mat === prevMaterial) {
        continue;
      }

      enableTonemapping
        ? mat.define('fragment', 'TONEMAPPING')
        : mat.undefine('fragment', 'TONEMAPPING');
      if (isLinearSpace) {
        let decodeSRGB = true;
        if (isSkybox && mat.get('environmentMap') && !mat.get('environmentMap').sRGB) {
          decodeSRGB = false;
        }
        decodeSRGB && mat.define('fragment', 'SRGB_DECODE');
        mat.define('fragment', 'SRGB_ENCODE');
      } else {
        mat.undefine('fragment', 'SRGB_DECODE');
        mat.undefine('fragment', 'SRGB_ENCODE');
      }

      prevMaterial = mat;
    }
  }

  private _doRender(renderer: Renderer, scene: Scene) {
    const camera = scene.getMainCamera();
    renderer.render(scene, camera, undefined, {
      notUpdateScene: true
    });
  }

  /**
   * Do render
   */
  render() {
    this._inRender = true;

    this.trigger('beforerender');
    const scene = this._scene;
    const renderer = this._renderer;
    const shadowPass = this._shadowPass;

    scene.update();

    scene.skybox && this._updateGraphicOptions(this._graphicOpts, [scene.skybox], true);
    // Render shadow pass
    shadowPass && shadowPass.render(renderer, scene, scene.getMainCamera(), true);

    this._doRender(renderer, scene);

    this.trigger('afterrender');
    this._inRender = false;
  }

  /**
   * Collect resources.
   */
  gc() {
    this._gpuResourceManager.collect(this._scene);
  }

  /**
   * Load a texture from image or string.
   * @example
   *  app.loadTexture('diffuseMap.jpg')
   *      .then(function (texture) {
   *          material.set('diffuseMap', texture);
   *      });
   */
  loadTexture(
    urlOrImg: string | TextureImageSource,
    opts: Partial<Texture2DOpts> & {
      exposure?: number;
    },
    useCache?: boolean
  ): Promise<Texture2D> {
    const key = getKeyFromImageLike(urlOrImg);
    const texCache = this._texCache;
    if (useCache) {
      if (texCache.get(key)) {
        return texCache.get(key) as Promise<Texture2D>;
      }
    }
    const promise = new Promise((resolve, reject) => {
      const texture = this.loadTextureSync(urlOrImg, opts);
      texture.checkReady()?.then(
        () => {
          if (!this._disposed) {
            resolve(texture);
          }
        },
        () => {
          if (!this._disposed) {
            reject();
          }
        }
      );
    });
    if (useCache) {
      this._texCache.put(key, promise);
    }
    return promise as Promise<Texture2D>;
  }

  /**
   * Create a texture from image or string synchronously. Texture can be use directly and don't have to wait for it's loaded.
   * @param {ImageLike} img
   * @param {Object} [opts] Texture options.
   * @param {boolean} [opts.flipY=true] If flipY. See {@link clay.Texture.flipY}
   * @param {boolean} [opts.convertToPOT=false] Force convert None Power of Two texture to Power of two so it can be tiled.
   * @param {number} [opts.anisotropic] Anisotropic filtering. See {@link clay.Texture.anisotropic}
   * @param {number} [opts.wrapS=clay.Texture.REPEAT] See {@link clay.Texture.wrapS}
   * @param {number} [opts.wrapT=clay.Texture.REPEAT] See {@link clay.Texture.wrapT}
   * @param {number} [opts.minFilter=clay.Texture.LINEAR_MIPMAP_LINEAR] See {@link clay.Texture.minFilter}
   * @param {number} [opts.magFilter=clay.Texture.LINEAR] See {@link clay.Texture.magFilter}
   * @param {number} [opts.exposure] Only be used when source is a HDR image.
   * @return {clay.Texture2D}
   * @example
   *  const texture = app.loadTexture('diffuseMap.jpg', {
   *      anisotropic: 8,
   *      flipY: false
   *  });
   *  material.set('diffuseMap', texture);
   */
  loadTextureSync(
    urlOrImg: string | TextureImageSource,
    opts?: Partial<Texture2DOpts> & {
      exposure?: number;
    }
  ): Texture2D {
    let texture = new Texture2D(opts);
    if (typeof urlOrImg === 'string') {
      if (urlOrImg.match(/.hdr$|^data:application\/octet-stream/)) {
        texture = textureUtil.loadTextureSync(urlOrImg, {
          exposure: opts && opts.exposure,
          fileType: 'hdr'
        });

        util.assign(texture, opts);
      } else {
        texture.load(urlOrImg);
      }
    } else if (isImageLikeElement(urlOrImg)) {
      texture.source = urlOrImg;
      texture.dynamic = urlOrImg instanceof HTMLVideoElement;
    }
    return texture;
  }

  /**
   * Create a texture from image or string synchronously. Texture can be use directly and don't have to wait for it's loaded.
   * @param {ImageLike} img
   * @param {Object} [opts] Texture options.
   * @param {boolean} [opts.flipY=false] If flipY. See {@link clay.Texture.flipY}
   * @return {Promise}
   * @example
   *  app.loadTextureCube({
   *      px: 'skybox/px.jpg', py: 'skybox/py.jpg', pz: 'skybox/pz.jpg',
   *      nx: 'skybox/nx.jpg', ny: 'skybox/ny.jpg', nz: 'skybox/nz.jpg'
   *  }).then(function (texture) {
   *      skybox.setEnvironmentMap(texture);
   *  })
   */
  loadTextureCube(
    imgList: Record<CubeTarget, string | TextureImageSource>,
    opts?: Partial<TextureCubeOpts>
  ): Promise<TextureCube> {
    const textureCube = this.loadTextureCubeSync(imgList, opts);
    return textureCube.checkReady()!.then(() => textureCube);
  }

  /**
   * Create a texture from image or string synchronously. Texture can be use directly and don't have to wait for it's loaded.
   * @param {ImageLike} img
   * @param {Object} [opts] Texture options.
   * @param {boolean} [opts.flipY=false] If flipY. See {@link clay.Texture.flipY}
   * @return {clay.TextureCube}
   * @example
   *  const texture = app.loadTextureCubeSync({
   *      px: 'skybox/px.jpg', py: 'skybox/py.jpg', pz: 'skybox/pz.jpg',
   *      nx: 'skybox/nx.jpg', ny: 'skybox/ny.jpg', nz: 'skybox/nz.jpg'
   *  });
   *  skybox.setEnvironmentMap(texture);
   */
  loadTextureCubeSync(
    imgList: Record<CubeTarget, string | TextureImageSource>,
    opts?: Partial<TextureCubeOpts>
  ): TextureCube {
    opts = opts || {};
    opts.flipY = opts.flipY || false;
    const textureCube = new TextureCube(opts);
    if (
      !imgList ||
      !imgList.px ||
      !imgList.nx ||
      !imgList.py ||
      !imgList.ny ||
      !imgList.pz ||
      !imgList.nz
    ) {
      throw new Error('Invalid cubemap format. Should be an object including px,nx,py,ny,pz,nz');
    }
    if (typeof imgList.px === 'string') {
      textureCube.load(imgList as Record<CubeTarget, string>);
    } else {
      textureCube.source = util.assign({}, imgList) as Record<CubeTarget, TextureImageSource>;
    }
    return textureCube;
  }

  /**
   * Create a material.
   * @param {Object|StandardMaterialMRConfig} materialConfig. materialConfig contains `shader`, `transparent` and uniforms that used in corresponding uniforms.
   *                                 Uniforms can be `color`, `alpha` `diffuseMap` etc.
   * @param {string|clay.Shader} Default to be standard shader with metalness and roughness workflow.
   * @param {boolean} [transparent=false] If material is transparent.
   * @param {boolean} [textureFlipY=true] If flip y of texture.
   * @param {Function} [textureLoaded] Callback when single texture loaded.
   * @param {Function} [texturesReady] Callback when all texture loaded.
   * @return {clay.Material}
   */
  createMaterial<T extends Material['shader'] = StandardShader>(
    matConfig?: CreateMaterialConfig<T>
  ): Material<T> {
    matConfig = matConfig || {};
    const shader = matConfig.shader || this._defaultShader;
    const material = new Material(shader);
    if (matConfig.name) {
      material.name = matConfig.name;
    }

    const uniforms = material.uniforms;
    const texturesLoading: Promise<Texture>[] = [];
    function makeTextureSetter(key: string) {
      return function (texture: Texture) {
        material.set(key as any, texture);
        matConfig!.textureLoaded && matConfig!.textureLoaded(key, texture);
        return texture;
      };
    }
    util.keys(matConfig).forEach((uniformName) => {
      const val = matConfig![uniformName];
      const uniformObj = (uniforms as any)[uniformName] as GeneralMaterialUniformObject;
      if (uniformObj && val != null) {
        if (
          (isTextureUniform(uniformObj) || isImageLikeElement(val)) &&
          !(val instanceof Texture)
        ) {
          // Try to load a texture.
          texturesLoading.push(
            this.loadTexture(val, {
              flipY: util.optional(matConfig!.textureFlipY, true)
            }).then(makeTextureSetter(uniformName))
          );
        } else {
          material.set(uniformName as any, val);
        }
      }
    });

    const texturesReady = matConfig.texturesReady;
    if (texturesReady) {
      Promise.all(texturesLoading).then(function (textures) {
        texturesReady(textures);
      });
    }
    if (matConfig.transparent) {
      material.depthTest = false;
      material.transparent = true;
    }

    return material as Material<T>;
  }

  /**
   * Create a cube mesh and add it to the scene or the given parent node.
   * @param material
   * @param parentNode Parent node to append. Default to be scene.
   * @param subdivision Subdivision of cube.
   *          Can be a number to represent both width, height and depth dimensions. Or an array to represent them respectively.
   * @example
   *  // Create a white cube.
   *  app.createCube()
   */
  createCube<T extends Material['shader'] = StandardShader>(
    material?: CreateMaterialConfig<T> | Material<T>,
    parentNode?: ClayNode,
    subdiv?: number | number[]
  ) {
    subdiv = subdiv || 1;
    if (typeof subdiv === 'number') {
      subdiv = [subdiv, subdiv, subdiv];
    }

    const geoKey = 'cube-' + subdiv.join('-');
    let cube = this._geoCache.get(geoKey);
    if (!cube) {
      cube = new CubeGeo({
        widthSegments: subdiv[0],
        heightSegments: subdiv[1],
        depthSegments: subdiv[2]
      });
      cube.generateTangents();
      this._geoCache.put(geoKey, cube);
    }
    return this.createMesh(cube, material, parentNode);
  }

  /**
   * Create a cube mesh that camera is inside the cube.
   * @function
   * @param {Object|clay.Material} [material]
   * @param {clay.Node} [parentNode] Parent node to append. Default to be scene.
   * @param {Array.<number>|number} [subdivision=1] Subdivision of cube.
   *          Can be a number to represent both width, height and depth dimensions. Or an array to represent them respectively.
   * @return {clay.Mesh}
   * @example
   *  // Create a white cube inside.
   *  app.createCubeInside()
   */
  createCubeInside<T extends Material['shader'] = StandardShader>(
    material?: CreateMaterialConfig<T> | Material<T>,
    parentNode?: ClayNode,
    subdiv?: number | number[]
  ) {
    if (subdiv == null) {
      subdiv = 1;
    }
    if (typeof subdiv === 'number') {
      subdiv = [subdiv, subdiv, subdiv];
    }
    const geoKey = 'cubeInside-' + subdiv.join('-');
    let cube = this._geoCache.get(geoKey);
    if (!cube) {
      cube = new CubeGeo({
        inside: true,
        widthSegments: subdiv[0],
        heightSegments: subdiv[1],
        depthSegments: subdiv[2]
      });
      cube.generateTangents();
      this._geoCache.put(geoKey, cube);
    }

    return this.createMesh(cube, material, parentNode);
  }

  /**
   * Create a sphere mesh and add it to the scene or the given parent node.
   * @param material
   * @param parentNode Parent node to append. Default to be scene.
   * @param subdivision Subdivision of sphere.
   * @example
   *  // Create a semi-transparent sphere.
   *  app.createSphere({
   *      color: [0, 0, 1],
   *      transparent: true,
   *      alpha: 0.5
   *  })
   */
  createSphere<T extends Material['shader'] = StandardShader>(
    material?: CreateMaterialConfig<T> | Material<T>,
    parentNode?: ClayNode,
    subdiv?: number
  ) {
    if (subdiv == null) {
      subdiv = 20;
    }
    const geoKey = 'sphere-' + subdiv;
    let sphere = this._geoCache.get(geoKey);
    if (!sphere) {
      sphere = new SphereGeo({
        widthSegments: subdiv * 2,
        heightSegments: subdiv
      });
      sphere.generateTangents();
      this._geoCache.put(geoKey, sphere);
    }
    return this.createMesh(sphere, material, parentNode);
  }

  // TODO may be modified?
  /**
   * Create a plane mesh and add it to the scene or the given parent node.
   * @function
   * @param {Object|clay.Material} [material]
   * @param {clay.Node} [parentNode] Parent node to append. Default to be scene.
   * @param {Array.<number>|number} [subdivision=1] Subdivision of plane.
   *          Can be a number to represent both width and height dimensions. Or an array to represent them respectively.
   * @return {clay.Mesh}
   * @example
   *  // Create a red color plane.
   *  app.createPlane({
   *      color: [1, 0, 0]
   *  })
   */
  createPlane<T extends Material['shader'] = StandardShader>(
    material?: CreateMaterialConfig<T> | Material<T>,
    parentNode?: ClayNode,
    subdiv?: number | number[]
  ) {
    if (subdiv == null) {
      subdiv = 1;
    }
    if (typeof subdiv === 'number') {
      subdiv = [subdiv, subdiv];
    }
    const geoKey = 'plane-' + subdiv.join('-');
    let planeGeo = this._geoCache.get(geoKey);
    if (!planeGeo) {
      planeGeo = new PlaneGeo({
        widthSegments: subdiv[0],
        heightSegments: subdiv[1]
      });
      planeGeo.generateTangents();
      this._geoCache.put(geoKey, planeGeo);
    }
    return this.createMesh(planeGeo, material, parentNode);
  }

  /**
   * Create mesh with parametric surface function
   * @param {Object|clay.Material} [material]
   * @param {clay.Node} [parentNode] Parent node to append. Default to be scene.
   * @param {Object} generator
   * @param {Function} generator.x
   * @param {Function} generator.y
   * @param {Function} generator.z
   * @param {Array} [generator.u=[0, 1, 0.05]]
   * @param {Array} [generator.v=[0, 1, 0.05]]
   * @return {clay.Mesh}
   */
  createParametricSurface<T extends Material['shader'] = StandardShader>(
    material?: CreateMaterialConfig<T> | Material<T>,
    parentNode?: ClayNode,
    generator?: ParametricSurfaceGeometryOpts['generator']
  ) {
    const geo = new ParametricSurfaceGeo({
      generator: generator
    });
    geo.generateTangents();
    return this.createMesh(geo, material, parentNode);
  }

  /**
   * Create a general mesh with given geometry instance and material config.
   * @param geometry
   */
  createMesh<T extends Material['shader'] = StandardShader>(
    geometry: Geometry,
    mat?: CreateMaterialConfig<T> | Material<T>,
    parentNode?: ClayNode
  ) {
    const mesh = new Mesh<Material<T>>(
      geometry,
      mat instanceof Material ? mat : this.createMaterial(mat)
    );
    parentNode = parentNode || this._scene;
    parentNode.add(mesh);
    return mesh;
  }

  /**
   * Create an empty node
   * @param {clay.Node} parentNode
   * @return {clay.Node}
   */
  createNode(parentNode?: ClayNode) {
    const node = new ClayNode();
    parentNode = parentNode || this._scene;
    parentNode.add(node);
    return node;
  }

  /**
   * Create a perspective or orthographic camera and add it to the scene.
   * @param position
   * @param target
   * @param type Can be 'perspective' or 'orthographic'(in short 'ortho')
   * @param extent Extent is available only if type is orthographic.
   */
  createCamera(
    position: Vector3 | Vector3['array'],
    target: Vector3 | Vector3['array'],
    type: 'ortho' | 'orthographic',
    extent?: Vector3 | Vector3['array']
  ): Camera<'orthographic'>;
  createCamera(
    position: Vector3 | Vector3['array'],
    target?: Vector3 | Vector3['array'],
    type?: 'perspective'
  ): Camera<'perspective'>;
  createCamera(
    position: Vector3 | Vector3['array'],
    target?: Vector3 | Vector3['array'],
    type?: 'ortho' | 'orthographic' | 'perspective',
    extent?: Vector3 | Vector3['array']
  ): Camera {
    // let CameraCtor;
    // let isOrtho = false;
    if (type === 'ortho') {
      type = 'orthographic';
    }

    const camera = new Camera(type);
    if (position instanceof Vector3) {
      camera.position.copy(position);
    } else if (util.isArray(position)) {
      camera.position.setArray(position);
    }

    if (util.isArray(target)) {
      target = new Vector3(target[0], target[1], target[2]);
    }
    if (target instanceof Vector3) {
      camera.lookAt(target);
    }

    const projParams = camera.projection;
    if (extent && projParams.type === 'orthographic') {
      extent = (extent as Vector3).array || extent;
      projParams.left = -extent[0] / 2;
      projParams.right = extent[0] / 2;
      projParams.top = extent[1] / 2;
      projParams.bottom = -extent[1] / 2;
      projParams.near = 0;
      projParams.far = extent[2];
    } else if (projParams.type === 'perspective') {
      projParams.aspect = this._renderer.getViewportAspect();
    }

    this._scene.add(camera);

    return camera;
  }

  /**
   * Create a directional light and add it to the scene.
   * @param  dir A Vector3 or array to represent the direction.
   * @param {Color} [color='#fff'] Color of directional light, default to be white.
   * @param {number} [intensity] Intensity of directional light, default to be 1.
   *
   * @example
   *  app.createDirectionalLight([-1, -1, -1], '#fff', 2);
   */
  createDirectionalLight(
    dir: Vector3 | Vector3['array'],
    color?: Color | string,
    intensity?: number
  ) {
    const light = new DirectionalLight();
    if (dir instanceof Vector3) {
      dir = dir.array;
    }
    light.position.setArray(dir).negate();
    light.lookAt(Vector3.ZERO);
    if (util.isString(color)) {
      color = colorUtil.parseToFloat(color)!;
    }
    color != null && (light.color = color);
    intensity != null && (light.intensity = intensity);

    this._scene.add(light);
    return light;
  }

  /**
   * Create a spot light and add it to the scene.
   * @param {Array.<number>|clay.Vector3} position Position of the spot light.
   * @param {Array.<number>|clay.Vector3} [target] Target position where spot light points to.
   * @param {number} [range=20] Falloff range of spot light. Default to be 20.
   * @param {Color} [color='#fff'] Color of spot light, default to be white.
   * @param {number} [intensity=1] Intensity of spot light, default to be 1.
   * @param {number} [umbraAngle=30] Umbra angle of spot light. Default to be 30 degree from the middle line.
   * @param {number} [penumbraAngle=45] Penumbra angle of spot light. Default to be 45 degree from the middle line.
   *
   * @example
   *  app.createSpotLight([5, 5, 5], [0, 0, 0], 20, #900);
   */
  createSpotLight(
    position: Vector3 | Vector3['array'],
    target?: Vector3 | Vector3['array'],
    range?: number,
    color?: Color | string,
    intensity?: number,
    umbraAngle?: number,
    penumbraAngle?: number
  ) {
    const light = new SpotLight();
    light.position.setArray(position instanceof Vector3 ? position.array : position);

    if (target instanceof Array) {
      target = new Vector3(target[0], target[1], target[2]);
    }
    if (target instanceof Vector3) {
      light.lookAt(target);
    }

    if (util.isString(color)) {
      color = colorUtil.parseToFloat(color)!;
    }
    range != null && (light.range = range);
    color != null && (light.color = color);
    intensity != null && (light.intensity = intensity);
    umbraAngle != null && (light.umbraAngle = umbraAngle);
    penumbraAngle != null && (light.penumbraAngle = penumbraAngle);

    this._scene.add(light);

    return light;
  }

  /**
   * Create a point light.
   * @param {Array.<number>|clay.Vector3} position Position of point light..
   * @param {number} [range=100] Falloff range of point light.
   * @param {Color} [color='#fff'] Color of point light.
   * @param {number} [intensity=1] Intensity of point light.
   */
  createPointLight(
    position: Vector3 | Vector3['array'],
    range?: number,
    color?: Color | string,
    intensity?: number
  ) {
    const light = new PointLight();
    light.position.setArray(position instanceof Vector3 ? position.array : position);

    if (typeof color === 'string') {
      color = colorUtil.parseToFloat(color);
    }
    range != null && (light.range = range);
    color != null && (light.color = color);
    intensity != null && (light.intensity = intensity);

    this._scene.add(light);

    return light;
  }

  /**
   * Create a ambient light.
   * @param {Color} [color='#fff'] Color of ambient light.
   * @param {number} [intensity=1] Intensity of ambient light.
   */
  createAmbientLight(color: Color | string, intensity?: number) {
    const light = new AmbientLight();

    if (typeof color === 'string') {
      color = colorUtil.parseToFloat(color)!;
    }
    color != null && (light.color = color);
    intensity != null && (light.intensity = intensity);

    this._scene.add(light);

    return light;
  }

  /**
   * Create an cubemap ambient light and an spherical harmonic ambient light
   * for specular and diffuse lighting in PBR rendering
   * @param {ImageLike|TextureCube} [envImage] Panorama environment image, HDR format is better. Or a pre loaded texture cube
   * @param {number} [specularIntenstity=0.7] Intensity of specular light.
   * @param {number} [diffuseIntenstity=0.7] Intensity of diffuse light.
   * @param {number} [exposure=1] Exposure of HDR image. Only if image in first paramter is HDR.
   * @param {number} [prefilteredCubemapSize=32] The size of prefilerted cubemap. Larger value will take more time to do expensive prefiltering.
   * @return {Promise}
   */
  createAmbientCubemapLight(
    envImage: TextureCube | string | TextureImageSource,
    specIntensity?: number,
    diffIntensity?: number,
    exposure?: number,
    prefilteredCubemapSize?: number
  ) {
    exposure = exposure || 0;
    prefilteredCubemapSize = prefilteredCubemapSize || 32;

    const scene = this._scene;

    let loadPromise;
    if ((envImage as TextureCube).textureType === 'textureCube') {
      loadPromise = (envImage as TextureCube).checkReady()!.then(() => envImage);
    } else {
      loadPromise = this.loadTexture(envImage as string | TextureImageSource, {
        exposure
      });
    }

    return (loadPromise as Promise<TextureCube>).then((envTexture) => {
      const specLight = new AmbientCubemapLight({
        intensity: specIntensity != null ? specIntensity : 0.7
      });
      specLight.cubemap = envTexture;
      envTexture.flipY = false;
      // TODO Cache prefilter ?
      specLight.prefilter(this._renderer, 32);

      const diffLight = new AmbientSHLight({
        intensity: diffIntensity != null ? diffIntensity : 0.7,
        coefficients: shUtil.projectEnvironmentMap(this._renderer, specLight.cubemap, {
          lod: 1
        })
      });
      scene.add(specLight);
      scene.add(diffLight);

      return {
        specular: specLight,
        diffuse: diffLight,
        // Original environment map
        environmentMap: envTexture
      };
    });
  }

  /**
   * Load a [glTF](https://github.com/KhronosGroup/glTF) format model.
   * You can convert FBX/DAE/OBJ format models to [glTF](https://github.com/KhronosGroup/glTF) with [fbx2gltf](https://github.com/pissang/claygl#fbx-to-gltf20-converter) python script,
   * or simply using the [Clay Viewer](https://github.com/pissang/clay-viewer) client application.
   * @param {string} url
   * @param {Object} opts
   * @param {string|clay.Shader} [opts.shader='clay.standard'] 'basic'|'lambert'|'standard'.
   * @param {boolean} [opts.waitTextureLoaded=false] If add to scene util textures are all loaded.
   * @param {boolean} [opts.autoPlayAnimation=true] If autoplay the animation of model.
   * @param {boolean} [opts.upAxis='y'] Change model to y up if upAxis is 'z'
   * @param {boolean} [opts.textureFlipY=false]
   * @param {boolean} [opts.textureConvertToPOT=false] If convert texture to power-of-two
   * @param {string} [opts.textureRootPath] Root path of texture. Default to be relative with glTF file.
   * @param {clay.Node} [parentNode] Parent node that model will be mounted. Default to be scene
   * @return {Promise}
   */
  loadModel(
    url: string,
    opts?: {
      shader?: Shader;
      waitTextureLoaded?: boolean;
      autoPlayAnimation?: boolean;
      upAxis?: 'y' | 'z';
      textureFlipY?: boolean;
      textureConvertToPOT?: boolean;
      textureRootPath?: string;
    },
    parentNode?: ClayNode
  ): Promise<GLTFLoadResult> {
    if (typeof url !== 'string') {
      throw new Error('Invalid URL.');
    }

    opts = opts || {};
    const autoPlayAnimation = util.optional(opts.autoPlayAnimation, true);

    const shader = opts.shader || this._defaultShader;

    const loaderOpts = {
      rootNode: new ClayNode(),
      shader: shader,
      textureRootPath: opts.textureRootPath,
      crossOrigin: 'Anonymous',
      textureFlipY: opts.textureFlipY,
      textureConvertToPOT: opts.textureConvertToPOT
    };
    if (opts.upAxis && opts.upAxis.toLowerCase() === 'z') {
      loaderOpts.rootNode.rotation.identity().rotateX(-Math.PI / 2);
    }

    parentNode = parentNode || this._scene;
    const timeline = this._timeline;

    return new Promise((resolve, reject) => {
      const afterLoad = (result: GLTFLoadResult) => {
        if (this._disposed) {
          return;
        }

        parentNode!.add(result.rootNode!);
        if (autoPlayAnimation) {
          result.animators.forEach(function (animator) {
            animator.start();
            timeline.addAnimator(animator);
          });
        }
        resolve(result);
      };

      loadGLTF(url, loaderOpts)
        .then((result) => {
          if (this._disposed) {
            return;
          }

          if (!opts!.waitTextureLoaded) {
            afterLoad(result);
          } else {
            Promise.all(result.textures.map((texture) => texture.checkReady()!.then(() => texture)))
              .then(function () {
                afterLoad(result);
              })
              .catch(function () {
                afterLoad(result);
              });
          }
        })
        .catch(reject);
    });
  }

  // TODO cloneModel

  /**
   * Similar to `app.scene.cloneNode`, except it will mount the cloned node to the scene automatically.
   * See more in {@link clay.Scene#cloneNode}
   *
   * @param node
   * @param parentNode Parent node that new cloned node will be mounted.
   *          Default to have same parent with source node.
   */
  cloneNode<T extends ClayNode>(node: T, parentNode?: ClayNode): T {
    parentNode = parentNode || node.getParent();

    const newNode = this._scene.cloneNode(node);
    if (parentNode) {
      parentNode.add(newNode);
    }

    return newNode;
  }
  /**
   * Resize the application. Will use the container clientWidth/clientHeight if width/height in parameters are not given.
   */
  resize(width?: number, height?: number, pixelRatio?: number) {
    const container = this._container;
    this._renderer.resize(
      width || container.clientWidth,
      height || container.clientHeight,
      pixelRatio
    );
  }

  /**
   * Dispose the application
   * @function
   */
  dispose() {
    this._disposed = true;

    this._timeline.stop();
    this._renderer.disposeScene(this._scene);
    this._shadowPass && this._shadowPass.dispose(this._renderer);
    this._eventManager && this._eventManager.dispose();

    this._container.innerHTML = '';
  }
}

function isImageLikeElement(val: any) {
  return (
    (typeof Image !== 'undefined' && val instanceof Image) ||
    (typeof HTMLCanvasElement !== 'undefined' && val instanceof HTMLCanvasElement) ||
    (typeof HTMLVideoElement !== 'undefined' && val instanceof HTMLVideoElement)
  );
}

function getKeyFromImageLike(val: any) {
  return typeof val === 'string' ? val : val.__key__ || (val.__key__ = util.genGUID());
}

export default App3D;
