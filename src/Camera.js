import Node from './Node';
import Matrix4 from './math/Matrix4';
import Frustum from './math/Frustum';
import Ray from './math/Ray';

import vec4 from './glmatrix/vec4';
import vec3 from './glmatrix/vec3';


/**
 * @constructor clay.Camera
 * @extends clay.Node
 */
var Camera = Node.extend(function () {
    return /** @lends clay.Camera# */ {
        /**
         * Camera projection matrix
         * @type {clay.Matrix4}
         */
        projectionMatrix: new Matrix4(),

        /**
         * Inverse of camera projection matrix
         * @type {clay.Matrix4}
         */
        invProjectionMatrix: new Matrix4(),

        /**
         * View matrix, equal to inverse of camera's world matrix
         * @type {clay.Matrix4}
         */
        viewMatrix: new Matrix4(),

        /**
         * Camera frustum in view space
         * @type {clay.Frustum}
         */
        frustum: new Frustum()
    };
}, function () {
    this.update(true);
},
/** @lends clay.Camera.prototype */
{

    update: function (force) {
        Node.prototype.update.call(this, force);
        Matrix4.invert(this.viewMatrix, this.worldTransform);

        this.updateProjectionMatrix();
        Matrix4.invert(this.invProjectionMatrix, this.projectionMatrix);

        this.frustum.setFromProjection(this.projectionMatrix);
    },

    /**
     * Set camera view matrix
     */
    setViewMatrix: function (viewMatrix) {
        Matrix4.copy(this.viewMatrix, viewMatrix);
        Matrix4.invert(this.worldTransform, viewMatrix);
        this.decomposeWorldTransform();
    },

    /**
     * Decompose camera projection matrix
     */
    decomposeProjectionMatrix: function () {},

    /**
     * Set camera projection matrix
     * @param {clay.Matrix4} projectionMatrix
     */
    setProjectionMatrix: function (projectionMatrix) {
        Matrix4.copy(this.projectionMatrix, projectionMatrix);
        Matrix4.invert(this.invProjectionMatrix, projectionMatrix);
        this.decomposeProjectionMatrix();
    },
    /**
     * Update projection matrix, called after update
     */
    updateProjectionMatrix: function () {},

    /**
     * Cast a picking ray from camera near plane to far plane
     * @function
     * @param {clay.Vector2} ndc
     * @param {clay.Ray} [out]
     * @return {clay.Ray}
     */
    castRay: (function () {
        var v4 = vec4.create();
        return function (ndc, out) {
            var ray = out !== undefined ? out : new Ray();
            var x = ndc.array[0];
            var y = ndc.array[1];
            vec4.set(v4, x, y, -1, 1);
            vec4.transformMat4(v4, v4, this.invProjectionMatrix.array);
            vec4.transformMat4(v4, v4, this.worldTransform.array);
            vec3.scale(ray.origin.array, v4, 1 / v4[3]);

            vec4.set(v4, x, y, 1, 1);
            vec4.transformMat4(v4, v4, this.invProjectionMatrix.array);
            vec4.transformMat4(v4, v4, this.worldTransform.array);
            vec3.scale(v4, v4, 1 / v4[3]);
            vec3.sub(ray.direction.array, v4, ray.origin.array);

            vec3.normalize(ray.direction.array, ray.direction.array);
            ray.direction._dirty = true;
            ray.origin._dirty = true;

            return ray;
        };
    })(),

    /**
     * @function
     * @name clone
     * @return {clay.Camera}
     * @memberOf clay.Camera.prototype
     */
});

export default Camera;
