import Ray from '../math/Ray';
import Vector2 from '../math/Vector2';
import Vector3 from '../math/Vector3';
import Matrix4 from '../math/Matrix4';
import { mat4, vec3, vec4 } from '../glmatrix';
import * as constants from '../core/constants';
import type Renderable from '../Renderable';
import type Renderer from '../Renderer';
import type Scene from '../Scene';
import type Camera from '../Camera';
import type ClayNode from '../Node';
import type { GeometryAttribute } from '../GeometryBase';

/**
 * Pick all intersection objects, wich will be sorted from near to far
 * @param  x Mouse position x
 * @param  y Mouse position y
 * @param  output
 * @param  forcePickAll ignore ignorePicking
 */
export function pickAll(
  renderer: Renderer,
  scene: Scene,
  camera: Camera,
  x: number,
  y: number,
  output?: Intersection[],
  forcePickAll?: boolean
): Intersection[] {
  const ray = new Ray();
  const ndc = new Vector2();
  renderer.screenToNDC(x, y, ndc);
  camera.castRay(ndc, ray);

  output = output || [];

  intersectNode(renderer, camera, ray, ndc, scene, output, forcePickAll || false);

  output.sort(intersectionCompareFunc);

  return output;
}

/**
 * Pick the nearest intersection object in the scene
 * @param  x Mouse position x
 * @param  y Mouse position y
 * @param  forcePickAll ignore ignorePicking
 */
export function pick(
  renderer: Renderer,
  scene: Scene,
  camera: Camera,
  x: number,
  y: number,
  forcePickAll?: boolean
): Intersection | undefined {
  return pickAll(renderer, scene, camera, x, y, [], forcePickAll)[0];
}

function intersectNode(
  renderer: Renderer,
  camera: Camera,
  ray: Ray,
  ndc: Vector2,

  node: ClayNode,
  out: Intersection[],
  forcePickAll: boolean
) {
  if (node.isRenderable && node.isRenderable()) {
    if (
      (!node.ignorePicking || forcePickAll) &&
      // Only triangle mesh support ray picking
      ((node.mode === constants.TRIANGLES && node.geometry.isUseIndices()) ||
        // Or if geometry has it's own pickByRay, pick, implementation
        node.geometry.pickByRay ||
        node.geometry.pick)
    ) {
      intersectRenderable(renderer, camera, ray, ndc, node, out);
    }
  }
  const childrenRef = node.childrenRef();
  for (let i = 0; i < childrenRef.length; i++) {
    intersectNode(renderer, camera, ray, ndc, childrenRef[i], out, forcePickAll);
  }
}

const v1 = new Vector3();
const v2 = new Vector3();
const v3 = new Vector3();
const ray = new Ray();
const worldInverse = new Matrix4();

function intersectRenderable(
  renderer: Renderer,
  camera: Camera,
  rawRay: Ray,
  ndc: Vector2,
  renderable: Renderable,
  out: Intersection[]
) {
  const isSkinnedMesh = renderable.isSkinnedMesh();
  ray.copy(rawRay);
  Matrix4.invert(worldInverse, renderable.worldTransform);

  // Skinned mesh will ignore the world transform.
  if (!isSkinnedMesh) {
    ray.applyTransform(worldInverse);
  }

  const geometry = renderable.geometry;

  const bbox = isSkinnedMesh ? renderable.skeleton.boundingBox : geometry.boundingBox;

  if (bbox && !ray.intersectBoundingBox(bbox)) {
    return;
  }
  // Use user defined picking algorithm
  if (geometry.pick) {
    geometry.pick(ndc.x, ndc.y, renderer, camera, renderable, out);
    return;
  }
  // Use user defined ray picking algorithm
  else if (geometry.pickByRay) {
    geometry.pickByRay(ray, renderable, out);
    return;
  }

  const cullBack =
    (renderable.cullFace === constants.BACK && renderable.frontFace === constants.CCW) ||
    (renderable.cullFace === constants.FRONT && renderable.frontFace === constants.CW);

  let point;
  const indices = geometry.indices;
  const positionAttr = geometry.attributes.position;
  const weightAttr = geometry.attributes.weight;
  const jointAttr = geometry.attributes.joint;
  let skinMatricesArray;
  const skinMatrices: mat4.Mat4Array[] = [];
  // Check if valid.
  if (!positionAttr || !positionAttr.value || !indices) {
    return;
  }
  if (isSkinnedMesh) {
    skinMatricesArray = renderable.skeleton.getSubSkinMatrices(renderable.uid, renderable.joints);
    for (let i = 0; i < renderable.joints.length; i++) {
      skinMatrices[i] = skinMatrices[i] || [];
      for (let k = 0; k < 16; k++) {
        skinMatrices[i][k] = skinMatricesArray[i * 16 + k];
      }
    }
    const pos = vec3.create();
    const weight = vec4.create();
    const joint = vec4.create();
    const skinnedPos = vec3.create();
    const tmp = vec3.create();
    let skinnedPositionAttr = geometry.attributes.skinnedPosition as GeometryAttribute<3>;
    if (!skinnedPositionAttr || !skinnedPositionAttr.value) {
      geometry.createAttribute('skinnedPosition', 'float', 3);
      skinnedPositionAttr = geometry.attributes.skinnedPosition as GeometryAttribute<3>;
      skinnedPositionAttr.init(geometry.vertexCount);
    }
    for (let i = 0; i < geometry.vertexCount; i++) {
      positionAttr.get(i, pos);
      weightAttr.get(i, weight);
      jointAttr.get(i, joint);
      weight[3] = 1 - weight[0] - weight[1] - weight[2];
      vec3.set(skinnedPos, 0, 0, 0);
      for (let k = 0; k < 4; k++) {
        if (joint[k] >= 0 && weight[k] > 1e-4) {
          vec3.transformMat4(tmp, pos, skinMatrices[joint[k]]);
          vec3.scaleAndAdd(skinnedPos, skinnedPos, tmp, weight[k]);
        }
      }
      skinnedPositionAttr.set(i, skinnedPos);
    }
  }

  for (let i = 0; i < indices.length; i += 3) {
    const i1 = indices[i];
    const i2 = indices[i + 1];
    const i3 = indices[i + 2];
    const finalPosAttr = isSkinnedMesh ? geometry.attributes.skinnedPosition : positionAttr;
    finalPosAttr.get(i1, v1.array);
    finalPosAttr.get(i2, v2.array);
    finalPosAttr.get(i3, v3.array);

    if (cullBack) {
      point = ray.intersectTriangle(v1, v2, v3, renderable.culling);
    } else {
      point = ray.intersectTriangle(v1, v3, v2, renderable.culling);
    }
    if (point) {
      const pointW = new Vector3();
      if (!isSkinnedMesh) {
        Vector3.transformMat4(pointW, point, renderable.worldTransform);
      } else {
        // TODO point maybe not right.
        Vector3.copy(pointW, point);
      }
      out.push(
        new Intersection(
          point,
          pointW,
          renderable,
          [i1, i2, i3],
          i / 3,
          Vector3.dist(pointW, ray.origin)
        )
      );
    }
  }
}

function intersectionCompareFunc(a: Intersection, b: Intersection) {
  return a.distance - b.distance;
}

export class Intersection {
  /**
   * Intersection point in local transform coordinates
   */
  point: Vector3;
  /**
   * Intersection point in world transform coordinates
   */
  pointWorld: Vector3;
  /**
   * Intersection scene node
   */
  target: ClayNode;
  /**
   * Intersection triangle, which is an array of vertex index
   */
  triangle: number[];
  /**
   * Index of intersection triangle.
   */
  triangleIndex: number;
  /**
   * Distance from intersection point to ray origin
   */
  distance: number;

  constructor(
    point: Vector3,
    pointWorld: Vector3,
    target: ClayNode,
    triangle: number[],
    triangleIndex: number,
    distance: number
  ) {
    this.point = point;
    this.pointWorld = pointWorld;
    this.target = target;
    this.triangle = triangle;
    this.triangleIndex = triangleIndex;
    this.distance = distance;
  }
}
