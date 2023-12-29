import Vector3 from './Vector3';
import * as mat4 from '../glmatrix/mat4';
import * as vec3 from '../glmatrix/vec3';
import * as vec4 from '../glmatrix/vec4';
import type Matrix4 from './Matrix4';
import type Frustum from './Frustum';

const rd = vec3.create();
const inverseTranspose = mat4.create();
const normalv4 = vec4.create();
const pointv4 = vec4.create();
pointv4[3] = 1;

class Plane {
  /**
   * Normal of the plane
   */
  normal: Vector3;
  /**
   * Constant of the plane equation, used as distance to the origin
   */
  distance: number;
  constructor(normal?: Vector3, distance?: number) {
    this.normal = normal || new Vector3(0, 1, 0);

    this.distance = distance || 0;
  }

  /**
   * Distance from a given point to the plane
   * @param point
   */
  distanceToPoint(point: Vector3) {
    return vec3.dot(point.array, this.normal.array) - this.distance;
  }

  /**
   * Calculate the projection point on the plane
   * @param point
   * @param out
   */
  projectPoint(point: Vector3, out: Vector3) {
    if (!out) {
      out = new Vector3();
    }
    const d = this.distanceToPoint(point);
    vec3.scaleAndAdd(out.array, point.array, this.normal.array, -d);
    return out;
  }

  /**
   * Normalize the plane's normal and calculate the distance
   */
  normalize() {
    const normal = this.normal;
    const invLen = 1 / normal.len();
    normal.scale(invLen);
    this.distance *= invLen;
  }

  /**
   * If the plane intersect a frustum
   * @param Frustum
   */
  intersectFrustum(frustum: Frustum) {
    // Check if all coords of frustum is on plane all under plane
    const coords = frustum.vertices;
    const normal = this.normal.array;
    const onPlane = vec3.dot(coords[0], normal) > this.distance;
    for (let i = 1; i < 8; i++) {
      if (vec3.dot(coords[i], normal) > this.distance != onPlane) {
        return true;
      }
    }
  }

  /**
   * Calculate the intersection point between plane and a given line
   * @function
   * @param start start point of line
   * @param end end point of line
   * @param out
   */
  intersectLine(start: Vector3, end: Vector3, out?: Vector3) {
    const d0 = this.distanceToPoint(start);
    const d1 = this.distanceToPoint(end);
    if ((d0 > 0 && d1 > 0) || (d0 < 0 && d1 < 0)) {
      return null;
    }
    // Ray intersection
    const pn = this.normal.array;
    const d = this.distance;
    const ro = start.array;
    // direction
    vec3.sub(rd, end.array, start.array);
    vec3.normalize(rd, rd);

    const divider = vec3.dot(pn, rd);
    // ray is parallel to the plane
    if (divider === 0) {
      return null;
    }
    if (!out) {
      out = new Vector3();
    }
    const t = (vec3.dot(pn, ro) - d) / divider;
    vec3.scaleAndAdd(out.array, ro, rd, -t);
    return out;
  }

  /**
   * Apply an affine transform matrix to plane
   * @function
   */
  applyTransform(m4: Matrix4) {
    const m4a = m4.array;
    // Transform point on plane
    vec3.scale(pointv4 as unknown as vec3.Vec3Array, this.normal.array, this.distance);
    vec4.transformMat4(pointv4, pointv4, m4a);

    // Transform plane normal
    mat4.invert(inverseTranspose, m4a);
    mat4.transpose(inverseTranspose, inverseTranspose);
    normalv4[3] = 0;
    vec3.copy(normalv4 as unknown as vec3.Vec3Array, this.normal.array);
    vec4.transformMat4(normalv4, normalv4, inverseTranspose);
    vec3.copy(this.normal.array, normalv4 as unknown as vec3.Vec3Array);

    this.distance = vec3.dot(pointv4 as unknown as vec3.Vec3Array, this.normal.array);
  }

  /**
   * Copy from another plane
   * @param plane
   */
  copy(plane: Plane) {
    vec3.copy(this.normal.array, plane.normal.array);
    this.distance = plane.distance;
  }

  /**
   * Clone a new plane
   */
  clone() {
    const plane = new Plane();
    plane.copy(this);
    return plane;
  }
}

export default Plane;
