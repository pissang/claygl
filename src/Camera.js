define(function(require) {

    var Node = require("./Node");
    var Matrix4 = require("./math/Matrix4");
    var Frustum = require("./math/Frustum");
    var BoundingBox = require("./math/BoundingBox");
    var Ray = require("./math/Ray");

    var glMatrix = require('glmatrix');
    var mat4 = glMatrix.mat4;
    var vec3 = glMatrix.vec3;
    var vec4 = glMatrix.vec4;

    var Camera = Node.derive(function() {
        return {
            
            projectionMatrix : new Matrix4(),

            invProjectionMatrix : new Matrix4(),

            viewMatrix : new Matrix4(),

            // Frustum bounding box in view space
            frustum : new Frustum(),

            // Scene bounding box in view space
            // mainly for the camera to adujst the near and far plane,
            // so that the view frustum contains the visible objects as tightly as possible.
            // Notice:
            //  updated after rendering (in the step of frustum culling passingly)
            //  So may be not so accurate, but saved a lot of calculation !!
            //  TODO : In case of one camera to multiple scenes
            sceneBoundingBoxLastFrame : new BoundingBox()
        }
    }, function() {
        this.update(true);
    }, {
        
        update : function(force) {
            Node.prototype.update.call(this, force);
            mat4.invert(this.viewMatrix._array, this.worldTransform._array);
            
            this.updateProjectionMatrix();
            mat4.invert(this.invProjectionMatrix._array, this.projectionMatrix._array);

            this.frustum.setFromProjection(this.projectionMatrix);
        },
        updateProjectionMatrix : function(){},

        castRay : (function() {
            var v4 = vec4.create();
            return function(ndc) {
                var ray = new Ray();
                
                vec4.set(v4, ndc._array[0], ndc._array[1], -1, 1);
                vec4.transformMat4(v4, v4, this.invProjectionMatrix._array);
                vec4.transformMat4(v4, v4, this.worldTransform._array);
                vec3.scale(ray.origin._array, v4, 1 / v4[3]);

                vec4.set(v4, ndc._array[0], ndc._array[1], 1, 1);
                vec4.transformMat4(v4, v4, this.invProjectionMatrix._array);
                vec4.transformMat4(v4, v4, this.worldTransform._array);
                vec3.scale(ray.direction._array, v4, 1 / v4[3]);
                vec3.sub(ray.direction._array, ray.direction._array, ray.origin._array);

                vec3.normalize(ray.direction._array, ray.direction._array);
                
                return ray;
            }
        })()
    });

    return Camera;
})