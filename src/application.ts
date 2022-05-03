// @ts-nocheck
/**
 * Helpers for creating a common 3d application.
 * @namespace clay.application
 */

/**
 * @typedef {string|HTMLCanvasElement|HTMLImageElement|HTMLVideoElement} ImageLike
 */
/**
 * @typedef {string|HTMLCanvasElement|HTMLImageElement|HTMLVideoElement|clay.Texture2D} TextureLike
 */
/**
 * @typedef {string|Array.<number>} Color
 */
/**
 * @typedef {HTMLElement|string} DomQuery
 */

/**
 * @typedef {Object} GLAttributes
 * @param {boolean} [alpha=true]
 * @param {boolean} [depth=true]
 * @param {boolean} [stencil=true]
 * @param {boolean} [antialias=true]
 * @param {boolean} [premultipliedAlpha=true]
 * @param {boolean} [preserveDrawingBuffer=false]
 */

/**
 * @typedef {Object} App3DNamespace
 * @property {Function} init Initialization callback that will be called when initing app.
 *                      You can return a promise in init to start the loop asynchronously when the promise is resolved.
 * @property {Function} loop Loop callback that will be called each frame.
 * @property {boolean} [autoRender=true] If render automatically each frame.
 * @property {Function} [beforeRender]
 * @property {Function} [afterRender]
 * @property {number} [width] Container width.
 * @property {number} [height] Container height.
 * @property {number} [devicePixelRatio]
 * @property {GLAttributes} [glAttributes] Attributes for creating gl context
 * @property {Object.<string, Function>} [methods] Methods that will be injected to App3D#methods.
 * @property {Object} [graphic] Graphic configuration including shadow, color space.
 * @property {boolean} [graphic.shadow=false] If enable shadow
 * @property {boolean} [graphic.linear=false] If use linear color space
 * @property {boolean} [graphic.tonemapping=false] If enable ACES tone mapping.
 * @property {boolean} [event=false] If enable mouse/touch event. It will slow down the system if geometries are complex.
 */

/**
 * @typedef {Object} StandardMaterialMRConfig
 * @property {string} [name]
 * @property {string} [shader='standardMR']
 * @property {Color} [color]
 * @property {number} [alpha]
 * @property {number} [metalness]
 * @property {number} [roughness]
 * @property {Color} [emission]
 * @property {number} [emissionIntensity]
 * @property {boolean} [transparent]
 * @property {TextureLike} [diffuseMap]
 * @property {TextureLike} [normalMap]
 * @property {TextureLike} [roughnessMap]
 * @property {TextureLike} [metalnessMap]
 * @property {TextureLike} [emissiveMap]
 */

export default {
  App3D: App3D,
  /**
   * Create a 3D application that will manage the app initialization and loop.
   *
   * See more details at {@link clay.application.App3D}
   *
   * @name clay.application.create
   * @method
   * @param {HTMLElement|string} dom Container dom element or a selector string that can be used in `querySelector`
   * @param {App3DNamespace} appNS Options and namespace used in creating app3D
   *
   * @return {clay.application.App3D}
   *
   * @example
   *  clay.application.create('#app', {
   *      init: function (app) {
   *          app.createCube();
   *          const camera = app.createCamera();
   *          camera.position.set(0, 0, 2);
   *      },
   *      loop: function () { // noop }
   *  })
   */
  create: function (dom, appNS) {
    return new App3D(dom, appNS);
  }
};
