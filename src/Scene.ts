// @ts-nocheck
import Node from './Node';
import Light from './Light';
import Camera from './Camera';
import BoundingBox from './math/BoundingBox';
import util from './core/util';
import mat4 from './glmatrix/mat4';
import LRUCache from './core/LRU';
import Matrix4 from './math/Matrix4';

let IDENTITY = mat4.create();
const WORLDVIEW = mat4.create();

const programKeyCache = {};

function getProgramKey(lightNumbers) {
  const defineStr = [];
  const lightTypes = Object.keys(lightNumbers);
  lightTypes.sort();
  for (let i = 0; i < lightTypes.length; i++) {
    const lightType = lightTypes[i];
    defineStr.push(lightType + ' ' + lightNumbers[lightType]);
  }
  let key = defineStr.join('\n');

  if (programKeyCache[key]) {
    return programKeyCache[key];
  }

  let id = util.genGUID();
  programKeyCache[key] = id;
  return id;
}

function RenderList() {
  this.opaque = [];
  this.transparent = [];

  this._opaqueCount = 0;
  this._transparentCount = 0;
}

RenderList.prototype.startCount = function () {
  this._opaqueCount = 0;
  this._transparentCount = 0;
};

RenderList.prototype.add = function (object, isTransparent) {
  if (isTransparent) {
    this.transparent[this._transparentCount++] = object;
  } else {
    this.opaque[this._opaqueCount++] = object;
  }
};

RenderList.prototype.endCount = function () {
  this.transparent.length = this._transparentCount;
  this.opaque.length = this._opaqueCount;
};

/**
 * @typedef {Object} clay.Scene.RenderList
 * @property {Array.<clay.Renderable>} opaque
 * @property {Array.<clay.Renderable>} transparent
 */

/**
 * @constructor clay.Scene
 * @extends clay.Node
 */
const Scene = Node.extend(
  function () {
    return /** @lends clay.Scene# */ {
      /**
       * Global material of scene
       * @type {clay.Material}
       */
      material: null,

      lights: [],

      /**
       * Scene bounding box in view space.
       * Used when camera needs to adujst the near and far plane automatically
       * so that the view frustum contains the visible objects as tightly as possible.
       * Notice:
       *  It is updated after rendering (in the step of frustum culling passingly). So may be not so accurate, but saves a lot of calculation
       *
       * @type {clay.BoundingBox}
       */
      viewBoundingBoxLastFrame: new BoundingBox(),

      // Uniforms for shadow map.
      shadowUniforms: {},

      _cameraList: [],

      // Properties to save the light information in the scene
      // Will be set in the render function
      _lightUniforms: {},

      _previousLightNumber: {},

      _lightNumber: {
        // groupId: {
        // POINT_LIGHT: 0,
        // DIRECTIONAL_LIGHT: 0,
        // SPOT_LIGHT: 0,
        // AMBIENT_LIGHT: 0,
        // AMBIENT_SH_LIGHT: 0
        // }
      },

      _lightProgramKeys: {},

      _nodeRepository: {},

      _renderLists: new LRUCache(20)
    };
  },
  function () {
    this._scene = this;
  },
  /** @lends clay.Scene.prototype. */
  {
    // Add node to scene
    addToScene: function (node) {
      if (node instanceof Camera) {
        if (this._cameraList.length > 0) {
          console.warn('Found multiple camera in one scene. Use the fist one.');
        }
        this._cameraList.push(node);
      } else if (node instanceof Light) {
        this.lights.push(node);
      }
      if (node.name) {
        this._nodeRepository[node.name] = node;
      }
    },

    // Remove node from scene
    removeFromScene: function (node) {
      let idx;
      if (node instanceof Camera) {
        idx = this._cameraList.indexOf(node);
        if (idx >= 0) {
          this._cameraList.splice(idx, 1);
        }
      } else if (node instanceof Light) {
        idx = this.lights.indexOf(node);
        if (idx >= 0) {
          this.lights.splice(idx, 1);
        }
      }
      if (node.name) {
        delete this._nodeRepository[node.name];
      }
    },

    /**
     * Get node by name
     * @param  {string} name
     * @return {Node}
     * @DEPRECATED
     */
    getNode: function (name) {
      return this._nodeRepository[name];
    },

    /**
     * Set main camera of the scene.
     * @param {claygl.Camera} camera
     */
    setMainCamera: function (camera) {
      let idx = this._cameraList.indexOf(camera);
      if (idx >= 0) {
        this._cameraList.splice(idx, 1);
      }
      this._cameraList.unshift(camera);
    },
    /**
     * Get main camera of the scene.
     */
    getMainCamera: function () {
      return this._cameraList[0];
    },

    getLights: function () {
      return this.lights;
    },

    updateLights: function () {
      const lights = this.lights;
      this._previousLightNumber = this._lightNumber;

      const lightNumber = {};
      for (let i = 0; i < lights.length; i++) {
        const light = lights[i];
        if (light.invisible) {
          continue;
        }
        const group = light.group;
        if (!lightNumber[group]) {
          lightNumber[group] = {};
        }
        // User can use any type of light
        lightNumber[group][light.type] = lightNumber[group][light.type] || 0;
        lightNumber[group][light.type]++;
      }
      this._lightNumber = lightNumber;

      for (const groupId in lightNumber) {
        this._lightProgramKeys[groupId] = getProgramKey(lightNumber[groupId]);
      }

      this._updateLightUniforms();
    },

    /**
     * Clone a node and it's children, including mesh, camera, light, etc.
     * Unlike using `Node#clone`. It will clone skeleton and remap the joints. Material will also be cloned.
     *
     * @param {clay.Node} node
     * @return {clay.Node}
     */
    cloneNode: function (node) {
      const newNode = node.clone();
      const clonedNodesMap = {};
      function buildNodesMap(sNode, tNode) {
        clonedNodesMap[sNode.__uid__] = tNode;

        for (let i = 0; i < sNode._children.length; i++) {
          const sChild = sNode._children[i];
          const tChild = tNode._children[i];
          buildNodesMap(sChild, tChild);
        }
      }
      buildNodesMap(node, newNode);

      newNode.traverse(function (newChild) {
        if (newChild.skeleton) {
          newChild.skeleton = newChild.skeleton.clone(clonedNodesMap);
        }
        if (newChild.material) {
          newChild.material = newChild.material.clone();
        }
      });

      return newNode;
    },

    /**
     * Traverse the scene and add the renderable object to the render list.
     * It needs camera for the frustum culling.
     *
     * @param {clay.Camera} camera
     * @param {boolean} updateSceneBoundingBox
     * @return {clay.Scene.RenderList}
     */
    updateRenderList: function (camera, updateSceneBoundingBox) {
      const id = camera.__uid__;
      let renderList = this._renderLists.get(id);
      if (!renderList) {
        renderList = new RenderList();
        this._renderLists.put(id, renderList);
      }
      renderList.startCount();

      if (updateSceneBoundingBox) {
        this.viewBoundingBoxLastFrame.min.set(Infinity, Infinity, Infinity);
        this.viewBoundingBoxLastFrame.max.set(-Infinity, -Infinity, -Infinity);
      }

      const sceneMaterialTransparent = (this.material && this.material.transparent) || false;
      this._doUpdateRenderList(
        this,
        camera,
        sceneMaterialTransparent,
        renderList,
        updateSceneBoundingBox
      );

      renderList.endCount();

      return renderList;
    },

    /**
     * Get render list. Used after {@link clay.Scene#updateRenderList}
     * @param {clay.Camera} camera
     * @return {clay.Scene.RenderList}
     */
    getRenderList: function (camera) {
      return this._renderLists.get(camera.__uid__);
    },

    _doUpdateRenderList: function (
      parent,
      camera,
      sceneMaterialTransparent,
      renderList,
      updateSceneBoundingBox
    ) {
      if (parent.invisible) {
        return;
      }
      // TODO Optimize
      for (let i = 0; i < parent._children.length; i++) {
        const child = parent._children[i];

        if (child.isRenderable()) {
          // Frustum culling
          const worldM = child.isSkinnedMesh() ? IDENTITY : child.worldTransform.array;
          const geometry = child.geometry;

          mat4.multiplyAffine(WORLDVIEW, camera.viewMatrix.array, worldM);
          if (
            (updateSceneBoundingBox && !geometry.boundingBox) ||
            !this.isFrustumCulled(child, camera, WORLDVIEW)
          ) {
            renderList.add(child, child.material.transparent || sceneMaterialTransparent);
          }
        }
        if (child._children.length > 0) {
          this._doUpdateRenderList(
            child,
            camera,
            sceneMaterialTransparent,
            renderList,
            updateSceneBoundingBox
          );
        }
      }
    },

    /**
     * If an scene object is culled by camera frustum
     *
     * Object can be a renderable or a light
     *
     * @param {clay.Node} object
     * @param {clay.Camera} camera
     * @param {Array.<number>} worldViewMat represented with array
     * @param {Array.<number>} projectionMat represented with array
     */
    isFrustumCulled: (function () {
      // Frustum culling
      // http://www.cse.chalmers.se/~uffe/vfc_bbox.pdf
      const cullingBoundingBox = new BoundingBox();
      const cullingMatrix = new Matrix4();
      return function (object, camera, worldViewMat) {
        // Bounding box can be a property of object(like light) or renderable.geometry
        // PENDING
        let geoBBox = object.boundingBox;
        if (!geoBBox) {
          if (object.skeleton && object.skeleton.boundingBox) {
            geoBBox = object.skeleton.boundingBox;
          } else {
            geoBBox = object.geometry.boundingBox;
          }
        }

        if (!geoBBox) {
          return false;
        }

        cullingMatrix.array = worldViewMat;
        cullingBoundingBox.transformFrom(geoBBox, cullingMatrix);

        // Passingly update the scene bounding box
        // FIXME exclude very large mesh like ground plane or terrain ?
        // FIXME Only rendererable which cast shadow ?

        // FIXME boundingBox becomes much larger after transformd.
        if (object.castShadow) {
          this.viewBoundingBoxLastFrame.union(cullingBoundingBox);
        }
        // Ignore frustum culling if object is skinned mesh.
        if (object.frustumCulling) {
          if (!cullingBoundingBox.intersectBoundingBox(camera.frustum.boundingBox)) {
            return true;
          }

          cullingMatrix.array = camera.projectionMatrix.array;
          if (cullingBoundingBox.max.array[2] > 0 && cullingBoundingBox.min.array[2] < 0) {
            // Clip in the near plane
            cullingBoundingBox.max.array[2] = -1e-20;
          }

          cullingBoundingBox.applyProjection(cullingMatrix);

          const min = cullingBoundingBox.min.array;
          const max = cullingBoundingBox.max.array;

          if (max[0] < -1 || min[0] > 1 || max[1] < -1 || min[1] > 1 || max[2] < -1 || min[2] > 1) {
            return true;
          }
        }

        return false;
      };
    })(),

    _updateLightUniforms: function () {
      const lights = this.lights;
      // Put the light cast shadow before the light not cast shadow
      lights.sort(lightSortFunc);

      const lightUniforms = this._lightUniforms;
      for (const group in lightUniforms) {
        for (const symbol in lightUniforms[group]) {
          lightUniforms[group][symbol].value.length = 0;
        }
      }
      for (let i = 0; i < lights.length; i++) {
        const light = lights[i];

        if (light.invisible) {
          continue;
        }

        const group = light.group;

        for (const symbol in light.uniformTemplates) {
          const uniformTpl = light.uniformTemplates[symbol];
          const value = uniformTpl.value(light);
          if (value == null) {
            continue;
          }
          if (!lightUniforms[group]) {
            lightUniforms[group] = {};
          }
          if (!lightUniforms[group][symbol]) {
            lightUniforms[group][symbol] = {
              type: '',
              value: []
            };
          }
          const lu = lightUniforms[group][symbol];
          lu.type = uniformTpl.type + 'v';
          switch (uniformTpl.type) {
            case '1i':
            case '1f':
            case 't':
              lu.value.push(value);
              break;
            case '2f':
            case '3f':
            case '4f':
              for (let j = 0; j < value.length; j++) {
                lu.value.push(value[j]);
              }
              break;
            default:
              console.error('Unkown light uniform type ' + uniformTpl.type);
          }
        }
      }
    },

    getLightGroups: function () {
      const lightGroups = [];
      for (const groupId in this._lightNumber) {
        lightGroups.push(groupId);
      }
      return lightGroups;
    },

    getNumberChangedLightGroups: function () {
      const lightGroups = [];
      for (const groupId in this._lightNumber) {
        if (this.isLightNumberChanged(groupId)) {
          lightGroups.push(groupId);
        }
      }
      return lightGroups;
    },

    // Determine if light group is different with since last frame
    // Used to determine whether to update shader and scene's uniforms in Renderer.render
    isLightNumberChanged: function (lightGroup) {
      const prevLightNumber = this._previousLightNumber;
      const currentLightNumber = this._lightNumber;
      // PENDING Performance
      for (const type in currentLightNumber[lightGroup]) {
        if (!prevLightNumber[lightGroup]) {
          return true;
        }
        if (currentLightNumber[lightGroup][type] !== prevLightNumber[lightGroup][type]) {
          return true;
        }
      }
      for (const type in prevLightNumber[lightGroup]) {
        if (!currentLightNumber[lightGroup]) {
          return true;
        }
        if (currentLightNumber[lightGroup][type] !== prevLightNumber[lightGroup][type]) {
          return true;
        }
      }
      return false;
    },

    getLightsNumbers: function (lightGroup) {
      return this._lightNumber[lightGroup];
    },

    getProgramKey: function (lightGroup) {
      return this._lightProgramKeys[lightGroup];
    },

    setLightUniforms: (function () {
      function setUniforms(uniforms, program, renderer) {
        for (const symbol in uniforms) {
          const lu = uniforms[symbol];
          if (lu.type === 'tv') {
            if (!program.hasUniform(symbol)) {
              continue;
            }
            const texSlots = [];
            for (let i = 0; i < lu.value.length; i++) {
              const texture = lu.value[i];
              const slot = program.takeCurrentTextureSlot(renderer, texture);
              texSlots.push(slot);
            }
            program.setUniform(renderer.gl, '1iv', symbol, texSlots);
          } else {
            program.setUniform(renderer.gl, lu.type, symbol, lu.value);
          }
        }
      }

      return function (program, lightGroup, renderer) {
        setUniforms(this._lightUniforms[lightGroup], program, renderer);
        // Set shadows
        setUniforms(this.shadowUniforms, program, renderer);
      };
    })(),

    /**
     * Dispose self, clear all the scene objects
     * But resources of gl like texuture, shader will not be disposed.
     * Mostly you should use disposeScene method in Renderer to do dispose.
     */
    dispose: function () {
      this.material = null;
      this._opaqueList = [];
      this._transparentList = [];

      this.lights = [];

      this._lightUniforms = {};

      this._lightNumber = {};
      this._nodeRepository = {};
    }
  }
);

function lightSortFunc(a, b) {
  if (b.castShadow && !a.castShadow) {
    return true;
  }
}

export default Scene;
