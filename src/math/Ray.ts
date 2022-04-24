import Vector3 from './Vector3';
import * as vec3 from '../glmatrix/vec3';
import Plane from './Plane';
import BoundingBox from './BoundingBox';
import Matrix4 from './Matrix4';

const EPSILON = 1e-5;

const v = vec3.create();

const eBA = vec3.create();
const eCA = vec3.create();
const AO = vec3.create();
const vCross = vec3.create();

class Ray {
  origin: Vector3;
  direction: Vector3;

  constructor(origin?: Vector3, direction?: Vector3) {
    this.origin = origin || new Vector3();
    this.direction = direction || new Vector3();
  }

  // http://www.siggraph.org/education/materials/HyperGraph/raytrace/rayplane_intersection.htm
  /**
   * Calculate intersection point between ray and a give plane
   * @param plane
   * @param out
   */
  intersectPlane(plane: Plane, out?: Vector3) {
    const pn = plane.normal.array;
    const d = plane.distance;
    const ro = this.origin.array;
    const rd = this.direction.array;

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
   * Mirror the ray against plane
   * @param plane
   */
  mirrorAgainstPlane(plane: Plane) {
    // Distance to plane
    const d = vec3.dot(plane.normal.array, this.direction.array);
    vec3.scaleAndAdd(this.direction.array, this.direction.array, plane.normal.array, -d * 2);
  }

  distanceToPoint(point: Vector3) {
    vec3.sub(v, point.array, this.origin.array);
    // Distance from projection point to origin
    const b = vec3.dot(v, this.direction.array);
    if (b < 0) {
      return vec3.distance(this.origin.array, point.array);
    }
    // Squared distance from center to origin
    const c2 = vec3.squaredLength(v);
    // Squared distance from center to projection point
    return Math.sqrt(c2 - b * b);
  }

  /**
   * Calculate intersection point between ray and sphere
   * @param center
   * @param radius
   * @param out
   */
  intersectSphere(center: Vector3, radius: number, out?: Vector3) {
    const origin = this.origin.array;
    const direction = this.direction.array;
    vec3.sub(v, center.array, origin);
    // Distance from projection point to origin
    const b = vec3.dot(v, direction);
    // Squared distance from center to origin
    const c2 = vec3.squaredLength(v);
    // Squared distance from center to projection point
    const d2 = c2 - b * b;

    const r2 = radius * radius;
    // No intersection
    if (d2 > r2) {
      return;
    }

    const a = Math.sqrt(r2 - d2);
    // First intersect point
    const t0 = b - a;
    // Second intersect point
    const t1 = b + a;

    if (!out) {
      out = new Vector3();
    }
    if (t0 < 0) {
      if (t1 < 0) {
        return null;
      } else {
        vec3.scaleAndAdd(out.array, origin, direction, t1);
        return out;
      }
    } else {
      vec3.scaleAndAdd(out.array, origin, direction, t0);
      return out;
    }
  }

  // http://www.scratchapixel.com/lessons/3d-basic-lessons/lesson-7-intersecting-simple-shapes/ray-box-intersection/
  /**
   * Calculate intersection point between ray and bounding box
   * @param bbox
   * @param out
   */
  intersectBoundingBox(bbox: BoundingBox, out?: Vector3) {
    const dir = this.direction.array;
    const origin = this.origin.array;
    const min = bbox.min.array;
    const max = bbox.max.array;

    const invdirx = 1 / dir[0];
    const invdiry = 1 / dir[1];
    const invdirz = 1 / dir[2];

    let tmin, tmax, tymin, tymax, tzmin, tzmax;
    if (invdirx >= 0) {
      tmin = (min[0] - origin[0]) * invdirx;
      tmax = (max[0] - origin[0]) * invdirx;
    } else {
      tmax = (min[0] - origin[0]) * invdirx;
      tmin = (max[0] - origin[0]) * invdirx;
    }
    if (invdiry >= 0) {
      tymin = (min[1] - origin[1]) * invdiry;
      tymax = (max[1] - origin[1]) * invdiry;
    } else {
      tymax = (min[1] - origin[1]) * invdiry;
      tymin = (max[1] - origin[1]) * invdiry;
    }

    if (tmin > tymax || tymin > tmax) {
      return null;
    }

    if (tymin > tmin || tmin !== tmin) {
      tmin = tymin;
    }
    if (tymax < tmax || tmax !== tmax) {
      tmax = tymax;
    }

    if (invdirz >= 0) {
      tzmin = (min[2] - origin[2]) * invdirz;
      tzmax = (max[2] - origin[2]) * invdirz;
    } else {
      tzmax = (min[2] - origin[2]) * invdirz;
      tzmin = (max[2] - origin[2]) * invdirz;
    }

    if (tmin > tzmax || tzmin > tmax) {
      return null;
    }

    if (tzmin > tmin || tmin !== tmin) {
      tmin = tzmin;
    }
    if (tzmax < tmax || tmax !== tmax) {
      tmax = tzmax;
    }
    if (tmax < 0) {
      return null;
    }

    const t = tmin >= 0 ? tmin : tmax;

    if (!out) {
      out = new Vector3();
    }
    vec3.scaleAndAdd(out.array, origin, dir, t);
    return out;
  }

  // http://en.wikipedia.org/wiki/M%C3%B6ller%E2%80%93Trumbore_intersection_algorithm
  /**
   * Calculate intersection point between ray and three triangle vertices
   * @param a
   * @param b
   * @param c
   * @param singleSided, CW triangle will be ignored
   * @param out
   * @param barycenteric barycentric coords
   */
  intersectTriangle(
    aIn: Vector3,
    bIn: Vector3,
    cIn: Vector3,
    singleSided: boolean,
    out?: Vector3,
    barycenteric?: Vector3
  ) {
    const dir = this.direction.array;
    const origin = this.origin.array;
    const a = aIn.array;
    const b = bIn.array;
    const c = cIn.array;

    vec3.sub(eBA, b, a);
    vec3.sub(eCA, c, a);

    vec3.cross(vCross, eCA, dir);

    const det = vec3.dot(eBA, vCross);

    if (singleSided) {
      if (det > -EPSILON) {
        return null;
      }
    } else {
      if (det > -EPSILON && det < EPSILON) {
        return null;
      }
    }

    vec3.sub(AO, origin, a);
    const u = vec3.dot(vCross, AO) / det;
    if (u < 0 || u > 1) {
      return null;
    }

    vec3.cross(vCross, eBA, AO);
    const v = vec3.dot(dir, vCross) / det;

    if (v < 0 || v > 1 || u + v > 1) {
      return null;
    }

    vec3.cross(vCross, eBA, eCA);
    const t = -vec3.dot(AO, vCross) / det;

    if (t < 0) {
      return null;
    }

    if (!out) {
      out = new Vector3();
    }
    if (barycenteric) {
      Vector3.set(barycenteric, 1 - u - v, u, v);
    }
    vec3.scaleAndAdd(out.array, origin, dir, t);

    return out;
  }

  /**
   * Apply an affine transform matrix to the ray
   */
  applyTransform(matrix: Matrix4) {
    Vector3.add(this.direction, this.direction, this.origin);
    Vector3.transformMat4(this.origin, this.origin, matrix);
    Vector3.transformMat4(this.direction, this.direction, matrix);

    Vector3.sub(this.direction, this.direction, this.origin);
    Vector3.normalize(this.direction, this.direction);
  }

  /**
   * Copy values from another ray
   * @param ray
   */
  copy(ray: Ray) {
    Vector3.copy(this.origin, ray.origin);
    Vector3.copy(this.direction, ray.direction);
  }

  /**
   * Clone a new ray
   */
  clone() {
    const ray = new Ray();
    ray.copy(this);
    return ray;
  }
}

export default Ray;
