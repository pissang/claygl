import ClayNode, { ClayNodeOpts } from './Node';
import Light from './Light';
import Camera from './Camera';
import BoundingBox from './math/BoundingBox';
import * as util from './core/util';
import * as mat4 from './glmatrix/mat4';
import LRUCache from './core/LRU';
import Matrix4 from './math/Matrix4';
import type Renderable from './Renderable';
import type Material from './Material';
import Mesh from './Mesh';
import { ShaderUniform, UniformType } from './Shader';
import Renderer from './Renderer';
import GLProgram from './gpu/GLProgram';
import Skybox from './plugin/Skybox';

const IDENTITY = mat4.create();
const WORLDVIEW = mat4.create();

const programKeyCache: Record<string, string> = {};

const cullingBoundingBox = new BoundingBox();
const cullingMatrix = new Matrix4();

function getProgramKey(lightNumbers: Record<string, number>) {
  const defineStr = [];
  const lightTypes = Object.keys(lightNumbers);
  lightTypes.sort();
  for (let i = 0; i < lightTypes.length; i++) {
    const lightType = lightTypes[i];
    defineStr.push(lightType + ' ' + lightNumbers[lightType]);
  }
  const key = defineStr.join('\n');

  if (programKeyCache[key]) {
    return programKeyCache[key];
  }

  const id = util.genGUID() + '';
  programKeyCache[key] = id;
  return id;
}

function setUniforms(
  uniforms: Record<string, ShaderUniform>,
  program: GLProgram,
  renderer: Renderer
) {
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

export class RenderList {
  opaque: Renderable[] = [];
  transparent: Renderable[] = [];

  private _opaqueCount = 0;
  private _transparentCount = 0;

  startCount() {
    this._opaqueCount = 0;
    this._transparentCount = 0;
  }

  add(object: Renderable, isTransparent?: boolean) {
    if (isTransparent) {
      this.transparent[this._transparentCount++] = object;
    } else {
      this.opaque[this._opaqueCount++] = object;
    }
  }

  endCount() {
    this.transparent.length = this._transparentCount;
    this.opaque.length = this._opaqueCount;
  }
}

interface SceneOpts extends ClayNodeOpts {
  /**
   * Global material of scene
   */
  material?: Material;
}

interface Scene extends SceneOpts {}
class Scene extends ClayNode {
  lights: Light[] = [];

  /**
   * Scene bounding box in view space.
   * Used when camera needs to adujst the near and far plane automatically
   * so that the view frustum contains the visible objects as tightly as possible.
   * Notice:
   *  It is updated after rendering (in the step of frustum culling passingly). So may be not so accurate, but saves a lot of calculation
   */
  viewBoundingBoxLastFrame = new BoundingBox();

  // Uniforms for shadow map.
  shadowUniforms: Record<string, ShaderUniform> = {};

  skybox?: Skybox;

  private _cameraList: Camera[] = [];

  // Properties to save the light information in the scene
  // Will be set in the render function
  private _lightUniforms: Record<string, Record<string, ShaderUniform>> = {};

  private _previousLightNumber: Record<string, Record<string, number>> = {};

  private _lightNumber: Record<string, Record<string, number>> = {
    // groupId: {
    // POINT_LIGHT: 0,
    // DIRECTIONAL_LIGHT: 0,
    // SPOT_LIGHT: 0,
    // AMBIENT_LIGHT: 0,
    // AMBIENT_SH_LIGHT: 0
    // }
  };

  private _lightProgramKeys: Record<string, string> = {};

  // TODO Remove?
  private _nodeRepository: Record<string, ClayNode> = {};

  private _renderLists = new LRUCache<RenderList>(20);

  constructor(opts?: Partial<SceneOpts>) {
    super(opts);

    this.material = opts && opts.material;

    this._scene = this;
  }

  // Add node to scene
  addToScene(node: ClayNode) {
    if (node instanceof Camera) {
      if (this._cameraList.length > 0) {
        console.warn('Found multiple camera in one scene. Use the fist one.');
      }
      this._cameraList.push(node);
    } else if (node instanceof Light) {
      this.lights.push(node);
    }
  }

  // Remove node from scene
  removeFromScene(node: ClayNode) {
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
  }

  /**
   * Set main camera of the scene.
   * @param {claygl.Camera} camera
   */
  setMainCamera(camera: Camera) {
    const cameraList = this._cameraList;
    const idx = cameraList.indexOf(camera);
    if (idx >= 0) {
      cameraList.splice(idx, 1);
    }
    cameraList.unshift(camera);
  }
  /**
   * Get main camera of the scene.
   */
  getMainCamera() {
    return this._cameraList[0];
  }

  getLights() {
    return this.lights;
  }

  updateLights() {
    const lights = this.lights;
    this._previousLightNumber = this._lightNumber;

    const lightNumber: Record<string, Record<string, number>> = {};
    for (let i = 0; i < lights.length; i++) {
      const light = lights[i];
      if (light.invisible) {
        continue;
      }
      const group = light.group + '';
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
  }

  /**
   * Clone a node and it's children, including mesh, camera, light, etc.
   * Unlike using `Node#clone`. It will clone skeleton and remap the joints. Material will also be cloned.
   *
   */
  cloneNode(node: ClayNode) {
    const newNode = node.clone();
    const clonedNodesMap: Record<number, ClayNode> = {};
    function buildNodesMap(sNode: ClayNode, tNode: ClayNode) {
      clonedNodesMap[sNode.__uid__] = tNode;

      const sChildren = sNode.childrenRef();
      const tChildren = tNode.childrenRef();
      for (let i = 0; i < sChildren.length; i++) {
        const sChild = sChildren[i];
        const tChild = tChildren[i];
        buildNodesMap(sChild, tChild);
      }
    }
    buildNodesMap(node, newNode);

    newNode.traverse(function (newChild: Mesh) {
      if (newChild.skeleton) {
        newChild.skeleton = newChild.skeleton.clone(clonedNodesMap);
      }
      if (newChild.material) {
        newChild.material = newChild.material.clone();
      }
    });

    return newNode;
  }

  /**
   * Traverse the scene and add the renderable object to the render list.
   * It needs camera for the frustum culling.
   *
   * @param {clay.Camera} camera
   * @param {boolean} updateSceneBoundingBox
   * @return {clay.Scene.RenderList}
   */
  updateRenderList(camera: Camera, updateSceneBoundingBox?: boolean) {
    const id = camera.__uid__ + '';
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
  }

  /**
   * Get render list. Used after {@link clay.Scene#updateRenderList}
   * @param {clay.Camera} camera
   * @return {clay.Scene.RenderList}
   */
  getRenderList(camera: Camera) {
    return this._renderLists.get(camera.__uid__ + '');
  }

  _doUpdateRenderList(
    parent: ClayNode,
    camera: Camera,
    sceneMaterialTransparent: boolean,
    renderList: RenderList,
    updateSceneBoundingBox?: boolean
  ) {
    if (parent.invisible) {
      return;
    }
    const children = parent.childrenRef();
    // TODO Optimize
    for (let i = 0; i < children.length; i++) {
      const child = children[i];

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
      if (child.childrenRef().length > 0) {
        this._doUpdateRenderList(
          child,
          camera,
          sceneMaterialTransparent,
          renderList,
          updateSceneBoundingBox
        );
      }
    }
  }

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
  isFrustumCulled(object: Renderable, camera: Camera, worldViewMat: mat4.Mat4Array) {
    // Frustum culling
    // http://www.cse.chalmers.se/~uffe/vfc_bbox.pdf
    // Bounding box can be a property of object(like light) or renderable.geometry
    // PENDING
    let geoBBox = object.boundingBox;
    if (!geoBBox) {
      if ((object as Mesh).skeleton && (object as Mesh).skeleton.boundingBox) {
        geoBBox = (object as Mesh).skeleton.boundingBox;
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
  }

  _updateLightUniforms() {
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
            value: []
          } as ShaderUniform;
        }
        const lu = lightUniforms[group][symbol];
        lu.type = (uniformTpl.type + 'v') as UniformType;
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
  }

  getLightGroups() {
    const lightGroups = [];
    for (const groupId in this._lightNumber) {
      lightGroups.push(groupId);
    }
    return lightGroups;
  }

  getNumberChangedLightGroups() {
    const lightGroups = [];
    for (const groupId in this._lightNumber) {
      if (this._isLightNumberChanged(groupId)) {
        lightGroups.push(groupId);
      }
    }
    return lightGroups;
  }

  // Determine if light group is different with since last frame
  // Used to determine whether to update shader and scene's uniforms in Renderer.render
  private _isLightNumberChanged(lightGroup: string) {
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
  }

  getLightsNumbers(lightGroup: number) {
    return this._lightNumber[lightGroup];
  }

  getProgramKey(lightGroup: number) {
    return this._lightProgramKeys[lightGroup];
  }

  setLightUniforms(program: GLProgram, lightGroup: number, renderer: Renderer) {
    setUniforms(this._lightUniforms[lightGroup], program, renderer);
    // Set shadows
    setUniforms(this.shadowUniforms, program, renderer);
  }

  /**
   * Dispose self, clear all the scene objects
   * But resources of gl like texuture, shader will not be disposed.
   * Mostly you should use disposeScene method in Renderer to do dispose.
   */
  dispose() {
    this.material = undefined;
    this._renderLists.clear();

    this.lights = [];

    this._lightUniforms = {};

    this._lightNumber = {};
  }
}

function lightSortFunc(a: Light, b: Light) {
  if (b.castShadow && !a.castShadow) {
    return 1;
  }
  return 0;
}

export default Scene;
