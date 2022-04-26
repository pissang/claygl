import Joint from './Joint';
import Texture2D from './Texture2D';
import Texture from './Texture';
import BoundingBox from './math/BoundingBox';
import Matrix4 from './math/Matrix4';

import * as mat4 from './glmatrix/mat4';
import * as vec3 from './glmatrix/vec3';
import * as quat from './glmatrix/quat';
import type ClayNode from './Node';
import type SkinningClip from './animation/SkinningClip';
import type Geometry from './Geometry';

const tmpBoundingBox = new BoundingBox();
const tmpMat4 = new Matrix4();
const tmpMat4Arr = tmpMat4.array;

const boundingBoxUpdateMap = new WeakMap<BoundingBox, boolean>();
/**
 * @constructor clay.Skeleton
 */

class Skeleton {
  /**
   * Relative root node that not affect transform of joint.
   */
  relativeRootNode?: ClayNode;
  /**
   * Name
   */
  name: string;

  /**
   * joints
   */
  joints: Joint[] = [];

  /**
   * bounding box with bound geometry.
   */
  boundingBox?: BoundingBox;

  private _clips: {
    maps: number[];
    clip: SkinningClip;
  }[] = [];

  // Matrix to joint space (relative to root joint)
  private _invBindPoseMatricesArray?: Float32Array;

  // Use subarray instead of copy back each time computing matrix
  // http://jsperf.com/subarray-vs-copy-for-array-transform/5
  private _jointMatricesSubArrays?: Float32Array[];

  // jointMatrix * currentPoseMatrix
  // worldTransform is relative to the root bone
  // still in model space not world space
  private _skinMatricesArray?: Float32Array;

  private _skinMatricesSubArrays?: Float32Array[] = [];

  private _subSkinMatricesArray?: Record<string, Float32Array> = {};
  private _jointsBoundingBoxes?: BoundingBox[];

  private _skinMatricesTexture?: Texture2D;

  constructor(name?: string) {
    this.name = name || '';
  }

  /**
   * Add a skinning clip and create a map between clip and skeleton
   * @param clip
   * @param mapRule Map between joint name in skeleton and joint name in clip
   */
  addClip(clip: SkinningClip, mapRule?: Record<string, string>) {
    // Clip have been exists in
    for (let i = 0; i < this._clips.length; i++) {
      if (this._clips[i].clip === clip) {
        return;
      }
    }
    // Map the joint index in skeleton to joint pose index in clip
    const maps = [];
    for (let i = 0; i < this.joints.length; i++) {
      maps[i] = -1;
    }
    // Create avatar
    for (let i = 0; i < clip.tracks.length; i++) {
      for (let j = 0; j < this.joints.length; j++) {
        const joint = this.joints[j];
        const track = clip.tracks[i];
        let jointName = joint.name;
        if (mapRule) {
          jointName = mapRule[jointName];
        }
        if (track.name === jointName) {
          maps[j] = i;
          break;
        }
      }
    }

    this._clips.push({
      maps: maps,
      clip: clip
    });

    return this._clips.length - 1;
  }

  /**
   * @param clip
   */
  removeClip(clip: SkinningClip) {
    let idx = -1;
    for (let i = 0; i < this._clips.length; i++) {
      if (this._clips[i].clip === clip) {
        idx = i;
        break;
      }
    }
    if (idx > 0) {
      this._clips.splice(idx, 1);
    }
  }
  /**
   * Remove all clips
   */
  removeClipsAll() {
    this._clips = [];
  }

  /**
   * Get clip by index
   * @param index
   */
  getClip(index: number) {
    if (this._clips[index]) {
      return this._clips[index].clip;
    }
  }

  /**
   * Return clips number
   */
  getClipsCount() {
    return this._clips.length;
  }

  /**
   * Calculate joint matrices from node transform
   * @function
   */
  updateJointMatrices() {
    this._invBindPoseMatricesArray = new Float32Array(this.joints.length * 16);
    this._skinMatricesArray = new Float32Array(this.joints.length * 16);

    for (let i = 0; i < this.joints.length; i++) {
      const joint = this.joints[i];
      if (joint.node) {
        mat4.copy(tmpMat4Arr, joint.node.worldTransform.array);
        mat4.invert(tmpMat4Arr, tmpMat4Arr);

        const offset = i * 16;
        for (let j = 0; j < 16; j++) {
          this._invBindPoseMatricesArray[offset + j] = tmpMat4Arr[j];
        }
      }
    }

    this.updateMatricesSubArrays();
  }

  /**
   * Update boundingBox of each joint bound to geometry.
   * ASSUME skeleton and geometry joints are matched.
   * @param {clay.Geometry} geometry
   */
  updateJointsBoundingBoxes(geometry: Geometry) {
    const attributes = geometry.attributes;
    const positionAttr = attributes.position;
    const jointAttr = attributes.joint;
    const weightAttr = attributes.weight;

    const jointsBoundingBoxes = [];
    for (let i = 0; i < this.joints.length; i++) {
      jointsBoundingBoxes[i] = new BoundingBox();
      boundingBoxUpdateMap.set(jointsBoundingBoxes[i], false);
    }

    const vtxJoint = vec3.create();
    const vtxPos = vec3.create();
    const vtxWeight = vec3.create();
    let maxJointIdx = 0;
    for (let i = 0; i < geometry.vertexCount; i++) {
      jointAttr.get(i, vtxJoint);
      positionAttr.get(i, vtxPos);
      weightAttr.get(i, vtxWeight);

      for (let k = 0; k < 4; k++) {
        if (vtxWeight[k] > 0.01) {
          const jointIdx = vtxJoint[k];
          maxJointIdx = Math.max(maxJointIdx, jointIdx);

          let min = jointsBoundingBoxes[jointIdx].min.array;
          let max = jointsBoundingBoxes[jointIdx].max.array;

          boundingBoxUpdateMap.set(jointsBoundingBoxes[jointIdx], true);

          min = vec3.min(min, min, vtxPos);
          max = vec3.max(max, max, vtxPos);
        }
      }
    }

    this._jointsBoundingBoxes = jointsBoundingBoxes;

    this.boundingBox = new BoundingBox();

    if (maxJointIdx < this.joints.length - 1) {
      console.warn("Geometry joints and skeleton joints don't match");
    }
  }

  setJointMatricesArray(arr: Float32Array) {
    this._invBindPoseMatricesArray = arr;
    this._skinMatricesArray = new Float32Array(arr.length);
    this.updateMatricesSubArrays();
  }

  updateMatricesSubArrays() {
    if (!this._invBindPoseMatricesArray) {
      // Not updated yet.
      return;
    }

    this._jointMatricesSubArrays = [];
    this._skinMatricesSubArrays = [];
    for (let i = 0; i < this.joints.length; i++) {
      this._jointMatricesSubArrays[i] = this._invBindPoseMatricesArray.subarray(
        i * 16,
        (i + 1) * 16
      );
      this._skinMatricesSubArrays[i] = this._skinMatricesArray!.subarray(i * 16, (i + 1) * 16);
    }
  }

  /**
   * Update skinning matrices
   */
  update() {
    if (!this._skinMatricesArray) {
      this.updateJointMatrices();
    }
    this._setPose();

    const jointsBoundingBoxes = this._jointsBoundingBoxes!;

    for (let i = 0; i < this.joints.length; i++) {
      const joint = this.joints[i];
      if (joint.node) {
        mat4.multiply(
          this._skinMatricesSubArrays![i] as unknown as mat4.Mat4Array,
          joint.node.worldTransform.array,
          this._jointMatricesSubArrays![i] as unknown as mat4.Mat4Array
        );
      }
    }
    if (this.boundingBox) {
      this.boundingBox.min.set(Infinity, Infinity, Infinity);
      this.boundingBox.max.set(-Infinity, -Infinity, -Infinity);
      for (let i = 0; i < this.joints.length; i++) {
        const bbox = jointsBoundingBoxes[i];
        if (boundingBoxUpdateMap.get(bbox)) {
          tmpBoundingBox.copy(bbox);
          tmpMat4.array = this._skinMatricesSubArrays![i] as unknown as mat4.Mat4Array;
          tmpBoundingBox.applyTransform(tmpMat4);

          this.boundingBox.union(tmpBoundingBox);
        }
      }
    }
  }

  getSubSkinMatrices(meshId: number, joints: number[]) {
    let subArray = this._subSkinMatricesArray![meshId];
    if (!subArray) {
      subArray = this._subSkinMatricesArray![meshId] = new Float32Array(joints.length * 16);
    }
    let cursor = 0;
    for (let i = 0; i < joints.length; i++) {
      const idx = joints[i];
      for (let j = 0; j < 16; j++) {
        subArray[cursor++] = this._skinMatricesArray![idx * 16 + j];
      }
    }
    return subArray;
  }

  getSubSkinMatricesTexture(meshId: number, joints: number[]) {
    const skinMatrices = this.getSubSkinMatrices(meshId, joints);
    let size;
    const numJoints = this.joints.length;
    if (numJoints > 256) {
      size = 64;
    } else if (numJoints > 64) {
      size = 32;
    } else if (numJoints > 16) {
      size = 16;
    } else {
      size = 8;
    }

    const texture = (this._skinMatricesTexture =
      this._skinMatricesTexture ||
      new Texture2D({
        type: Texture.FLOAT,
        minFilter: Texture.NEAREST,
        magFilter: Texture.NEAREST,
        useMipmap: false,
        flipY: false
      }));
    texture.width = size;
    texture.height = size;

    if (!texture.pixels || texture.pixels.length !== size * size * 4) {
      texture.pixels = new Float32Array(size * size * 4);
    }
    texture.pixels.set(skinMatrices);
    texture.dirty();

    return texture;
  }

  getSkinMatricesTexture() {
    return this._skinMatricesTexture;
  }

  _setPose() {
    if (this._clips[0]) {
      const clip = this._clips[0].clip;
      const maps = this._clips[0].maps;

      for (let i = 0; i < this.joints.length; i++) {
        const joint = this.joints[i];
        if (maps[i] === -1) {
          continue;
        }
        const pose = clip.tracks[maps[i]];
        const node = joint.node;
        if (node) {
          // Not update if there is no data.
          // PENDING If sync pose.position, pose.rotation, pose.scale
          if (pose.channels.position) {
            vec3.copy(node.position.array, pose.position);
          }
          if (pose.channels.rotation) {
            quat.copy(node.rotation.array, pose.rotation);
          }
          if (pose.channels.scale) {
            vec3.copy(node.scale.array, pose.scale);
          }
        }
      }
    }
  }

  clone(clonedNodesMap: Record<number, ClayNode>) {
    const skeleton = new Skeleton();
    skeleton.name = this.name;

    for (let i = 0; i < this.joints.length; i++) {
      const newJoint = new Joint();
      const joint = this.joints[i];
      newJoint.name = joint.name;
      newJoint.index = joint.index;

      if (clonedNodesMap && joint.node) {
        const newNode = clonedNodesMap[joint.node.__uid__];

        if (!newNode) {
          // PENDING
          console.warn("Can't find node");
        }

        newJoint.node = newNode || joint.node;
      } else {
        newJoint.node = joint.node;
      }

      skeleton.joints.push(newJoint);
    }

    if (this._invBindPoseMatricesArray) {
      const len = this._invBindPoseMatricesArray.length;
      skeleton._invBindPoseMatricesArray = new Float32Array(len);
      for (let i = 0; i < len; i++) {
        skeleton._invBindPoseMatricesArray[i] = this._invBindPoseMatricesArray[i];
      }

      skeleton._skinMatricesArray = new Float32Array(len);

      skeleton.updateMatricesSubArrays();
    }

    skeleton._jointsBoundingBoxes = (this._jointsBoundingBoxes || []).map(function (
      bbox: BoundingBox
    ) {
      return bbox.clone();
    });

    skeleton.update();

    return skeleton;
  }
}

export default Skeleton;
