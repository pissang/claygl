import Vector3 from './math/Vector3';
import Quaternion from './math/Quaternion';
import Matrix4 from './math/Matrix4';
import * as mat4 from './glmatrix/mat4';
import BoundingBox from './math/BoundingBox';
import Notifier from './core/Notifier';
import { genGUID } from './core/util';
import type Scene from './Scene';
import type Mesh from './Mesh';
import type Geometry from './Geometry';
import type Renderable from './Renderable';
import type Skeleton from './Skeleton';
import type Renderer from './Renderer';
import type InstancedMesh from './InstancedMesh';

let nameId = 0;
const tmpMat4Arr = mat4.create();
const tmpBBox = new BoundingBox();
const tmpMat4 = new Matrix4();
const tmpVec3 = new Vector3();
const RTMatrix = new Matrix4();

export type GetBoundingBoxFilter = (
  el: ClayNode & {
    geometry: Geometry;
  }
) => boolean;

function defaultBoundingBoxNodeFilter(el: ClayNode) {
  return !el.invisible;
}
export interface ClayNodeOpts {
  /**
   * Scene node name
   */
  name: string;
  /**
   * Position relative to its parent node. aka translation.
   */
  position: Vector3;
  /**
   * Rotation relative to its parent node. Represented by a quaternion
   */
  rotation: Quaternion;
  /**
   * Scale relative to its parent node
   */
  scale: Vector3;
  /**
   * If the local transform is update from SRT(scale, rotation, translation, which is position here) each frame
   */
  autoUpdateLocalTransform: boolean;

  /**
   * If node and its chilren invisible
   */
  invisible?: boolean;
}

interface ClayNode extends ClayNodeOpts {
  dispose(renderer: Renderer): void;
}
class ClayNode extends Notifier {
  readonly __uid__: number = genGUID();

  readonly type: string = '';

  /**
   * Affine transform matrix relative to its root scene.
   */
  worldTransform = new Matrix4();
  /**
   * Affine transform matrix relative to its parent node.
   * Composited with position, rotation and scale.
   */
  localTransform = new Matrix4();

  /**
   * target of ClayNode
   */
  target?: Vector3;

  protected _children: ClayNode[] = [];

  /**
   * Parent of current scene node
   */
  protected _parent?: ClayNode;
  /**
   * The root scene mounted. Null if it is a isolated node
   */
  protected _scene?: Scene;

  private _inIterating = false;

  constructor(opts?: Partial<ClayNodeOpts>) {
    super();

    opts = opts || {};

    this.name = (this.type || 'NODE') + '_' + nameId++;

    this.position = opts.position || new Vector3();
    this.rotation = opts.rotation || new Quaternion();
    this.scale = opts.scale || new Vector3(1, 1, 1);

    this.worldTransform = new Matrix4();
    this.localTransform = new Matrix4();

    this._children = [];
  }

  /**
   * If Node is a skinned mesh
   * @return {boolean}
   */
  isSkinnedMesh(): this is Mesh & {
    skeleton: Skeleton;
  } {
    return false;
  }
  /**
   * Return true if it is a renderable scene node, like Mesh and ParticleSystem
   * @return {boolean}
   */
  isRenderable(): this is Renderable {
    return false;
  }
  isInstancedMesh(): this is InstancedMesh {
    return false;
  }

  /**
   * Set the name of the scene node
   * @param {string} name
   */
  setName(name: string) {
    this.name = name;
  }

  /**
   * Add a child node
   * @param {clay.Node} node
   */
  add(node: ClayNode) {
    const originalParent = node._parent;
    if (originalParent === this) {
      return;
    }
    if (originalParent) {
      originalParent.remove(node);
    }
    node._parent = this;
    this._children.push(node);

    const scene = this._scene;
    if (scene && scene !== node._scene) {
      node.traverse((child) => this._addSelfToScene(child));
    }
  }

  /**
   * Remove the given child scene node
   * @param {clay.Node} node
   */
  remove(node: ClayNode) {
    const children = this._children;
    const idx = children.indexOf(node);
    if (idx < 0) {
      return;
    }

    children.splice(idx, 1);
    node._parent = undefined;

    if (this._scene) {
      node.traverse((child) => this._removeSelfFromScene(child));
    }
  }

  /**
   * Remove all children
   */
  removeAll() {
    const children = this._children;

    for (let idx = 0; idx < children.length; idx++) {
      children[idx]._parent = undefined;

      if (this._scene) {
        children[idx].traverse((child) => this._removeSelfFromScene(child));
      }
    }

    this._children = [];
  }

  /**
   * Get the scene mounted
   * @return {clay.Scene}
   */
  getScene() {
    return this._scene;
  }

  /**
   * Get parent node
   * @return {clay.Scene}
   */
  getParent() {
    return this._parent;
  }

  _removeSelfFromScene(descendant: ClayNode) {
    descendant._scene!.removeFromScene(descendant);
    descendant._scene = undefined;
  }

  _addSelfToScene(descendant: ClayNode) {
    this._scene!.addToScene(descendant);
    descendant._scene = this._scene;
  }

  /**
   * Return true if it is ancestor of the given scene node
   * @param {clay.Node} node
   */
  isAncestor(node: ClayNode) {
    let parent = node._parent;
    while (parent) {
      if (parent === this) {
        return true;
      }
      parent = parent._parent;
    }
    return false;
  }

  /**
   * Get a new created array of all children nodes
   * @return {clay.Node[]}
   */
  children() {
    return this._children.slice();
  }

  /**
   * Get the ref to children.
   */
  childrenRef() {
    return this._children;
  }

  /**
   * Get child scene node at given index.
   * @param {number} idx
   * @return {clay.Node}
   */
  childAt(idx: number): ClayNode | undefined {
    return this._children[idx];
  }

  /**
   * Get first child with the given name
   * @param {string} name
   * @return {clay.Node}
   */
  getChildByName(name: string): ClayNode | undefined {
    const children = this._children;
    for (let i = 0; i < children.length; i++) {
      if (children[i].name === name) {
        return children[i];
      }
    }
  }

  /**
   * Get first descendant have the given name
   * @param {string} name
   * @return {clay.Node}
   */
  getDescendantByName(name: string): ClayNode | undefined {
    const children = this._children;
    for (let i = 0; i < children.length; i++) {
      const child = children[i];
      if (child.name === name) {
        return child;
      } else {
        const res = child.getDescendantByName(name);
        if (res) {
          return res;
        }
      }
    }
  }

  /**
   * Query descendant node by path
   * @param {string} path
   * @return {clay.Node}
   * @example
   *  node.queryNode('root/parent/child');
   */
  queryNode(path: string): ClayNode | undefined {
    if (!path) {
      return;
    }
    // TODO Name have slash ?
    const pathArr = path.split('/');
    let current = this as ClayNode;
    for (let i = 0; i < pathArr.length; i++) {
      const name = pathArr[i];
      // Skip empty
      if (!name) {
        continue;
      }
      let found = false;
      const children = current._children;
      for (let j = 0; j < children.length; j++) {
        const child = children[j];
        if (child.name === name) {
          current = child;
          found = true;
          break;
        }
      }
      // Early return if not found
      if (!found) {
        return;
      }
    }

    return current;
  }

  /**
   * Get query path, relative to rootNode(default is scene)
   * @param {clay.Node} [rootNode]
   * @return {string}
   */
  getPath(rootNode: ClayNode) {
    if (!this._parent) {
      return '/';
    }

    let current = this._parent;
    let path = this.name;
    while (current._parent) {
      path = current.name + '/' + path;
      if (current._parent == rootNode) {
        break;
      }
      current = current._parent;
    }
    if (!current._parent && rootNode) {
      return null;
    }
    return path;
  }

  /**
   * Depth first traverse all its descendant scene nodes.
   *
   * **WARN** Don't do `add`, `remove` operation in the callback during traverse.
   * @param {Function} callback
   */
  traverse(callback: (node: ClayNode) => void) {
    callback(this);
    const children = this._children;
    for (let i = 0, len = children.length; i < len; i++) {
      children[i].traverse(callback);
    }
  }

  /**
   * Traverse all children nodes.
   *
   * **WARN** DON'T do `add`, `remove` operation in the callback during iteration.
   *
   * @param {Function} callback
   */
  eachChild(callback: (node: ClayNode, i: number) => void) {
    const children = this._children;
    for (let i = 0, len = children.length; i < len; i++) {
      const child = children[i];
      callback(child, i);
    }
  }

  /**
   * Set the local transform and decompose to SRT
   * @param {clay.Matrix4} matrix
   */
  setLocalTransform(matrix: Matrix4) {
    mat4.copy(this.localTransform.array, matrix.array);
    this.decomposeLocalTransform();
  }

  /**
   * Decompose the local transform to SRT
   */
  decomposeLocalTransform(keepScale?: boolean) {
    const scale = !keepScale ? this.scale : undefined;
    this.localTransform.decomposeMatrix(scale, this.rotation, this.position);
  }

  /**
   * Set the world transform and decompose to SRT
   * @param {clay.Matrix4} matrix
   */
  setWorldTransform(matrix: Matrix4) {
    mat4.copy(this.worldTransform.array, matrix.array);
    this.decomposeWorldTransform();
  }

  /**
   * Decompose the world transform to SRT
   * @function
   */
  decomposeWorldTransform(keepScale?: boolean) {
    const localTransform = this.localTransform;
    const worldTransform = this.worldTransform;
    // Assume world transform is updated
    if (this._parent) {
      mat4.invert(tmpMat4Arr, this._parent.worldTransform.array);
      mat4.multiply(localTransform.array, tmpMat4Arr, worldTransform.array);
    } else {
      mat4.copy(localTransform.array, worldTransform.array);
    }
    const scale = !keepScale ? this.scale : undefined;
    localTransform.decomposeMatrix(scale, this.rotation, this.position);
  }

  /**
   * Update local transform from SRT
   * Notice that local transform will not be updated if _dirty mark of position, rotation, scale is all false
   */
  updateLocalTransform() {
    const position = this.position;
    const rotation = this.rotation;
    const scale = this.scale;

    const m = this.localTransform.array;

    // Transform order, scale->rotation->position
    mat4.fromRotationTranslation(m, rotation.array, position.array);

    mat4.scale(m, m, scale.array);
  }

  /**
   * Update world transform, assume its parent world transform have been updated
   * @private
   */
  _updateWorldTransformTopDown() {
    const localTransform = this.localTransform.array;
    const worldTransform = this.worldTransform.array;
    if (this._parent) {
      mat4.multiplyAffine(worldTransform, this._parent.worldTransform.array, localTransform);
    } else {
      mat4.copy(worldTransform, localTransform);
    }
  }

  /**
   * Update world transform before whole scene is updated.
   */
  updateWorldTransform() {
    let transformNode: ClayNode | undefined = this;
    const ancestors: ClayNode[] = [];
    while (transformNode) {
      ancestors.push(transformNode);
      transformNode = transformNode.getParent();
    }

    // Update from topdown.
    while ((transformNode = ancestors.pop())) {
      transformNode._updateWorldTransformTopDown();
    }
  }

  /**
   * Update local transform and world transform recursively
   */
  update() {
    if (this.autoUpdateLocalTransform) {
      this.updateLocalTransform();
    }

    this._updateWorldTransformTopDown();

    const children = this._children;
    for (let i = 0, len = children.length; i < len; i++) {
      children[i].update();
    }
  }

  /**
   * Get bounding box of node
   * @param  {Function} [filter]
   * @param  {clay.BoundingBox} [out]
   * @return {clay.BoundingBox}
   */
  // TODO Skinning
  getBoundingBox(filter?: GetBoundingBoxFilter, out?: BoundingBox): BoundingBox {
    out = out || new BoundingBox();
    const meshFilter = filter || defaultBoundingBoxNodeFilter;
    const invWorldTransform = tmpMat4;

    if (this._parent) {
      Matrix4.invert(invWorldTransform, this._parent.worldTransform);
    } else {
      Matrix4.identity(invWorldTransform);
    }

    this.traverse(function (mesh) {
      const geo = (mesh as Mesh).geometry;
      if (geo && geo.boundingBox && meshFilter(mesh as Mesh)) {
        tmpBBox.copy(geo.boundingBox);
        Matrix4.multiply(tmpMat4, invWorldTransform, mesh.worldTransform);
        tmpBBox.applyTransform(tmpMat4);
        out!.union(tmpBBox);
      }
    });

    return out;
  }

  /**
   * Get world position, extracted from world transform
   * @param  {clay.Vector3} [out]
   * @return {clay.Vector3}
   */
  getWorldPosition(out?: Vector3): Vector3 {
    // PENDING
    this.updateWorldTransform();
    const m = this.worldTransform.array;
    if (out) {
      const arr = out.array;
      arr[0] = m[12];
      arr[1] = m[13];
      arr[2] = m[14];
      return out;
    } else {
      return new Vector3(m[12], m[13], m[14]);
    }
  }

  /**
   * Clone a new node
   * @return {Node}
   */
  clone() {
    const node = new (this as any).constructor();

    const children = this._children;

    node.setName(this.name);
    node.position.copy(this.position);
    node.rotation.copy(this.rotation);
    node.scale.copy(this.scale);

    for (let i = 0; i < children.length; i++) {
      node.add(children[i].clone());
    }

    return node;
  }

  /**
   * Rotate the node around a axis by angle degrees, axis passes through point
   * @param {clay.Vector3} point Center point
   * @param {clay.Vector3} axis  Center axis
   * @param {number}       angle Rotation angle
   * @see http://docs.unity3d.com/Documentation/ScriptReference/Transform.RotateAround.html
   * @function
   */
  rotateAround(point: Vector3, axis: Vector3, angle: number) {
    tmpVec3.copy(this.position).subtract(point);

    const localTransform = this.localTransform;
    localTransform.identity();
    // parent node
    localTransform.translate(point);
    localTransform.rotate(angle, axis);

    RTMatrix.fromRotationTranslation(this.rotation, tmpVec3);
    localTransform.multiply(RTMatrix);
    localTransform.scale(this.scale);

    this.decomposeLocalTransform();
  }

  /**
   * @param {clay.Vector3} target
   * @param {clay.Vector3} [up]
   * @see http://www.opengl.org/sdk/docs/man2/xhtml/gluLookAt.xml
   * @function
   */
  lookAt(target: Vector3, up: Vector3) {
    tmpMat4.lookAt(this.position, target, up || this.localTransform.y).invert();
    this.setLocalTransform(tmpMat4);

    this.target = target;
  }
}

export default ClayNode;
