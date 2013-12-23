define(function(require) {

    var Node = require("./Node");
    var Matrix4 = require("core/Matrix4");
    var Frustum = require("./Frustum");
    var BoundingBox = require("./BoundingBox");

    var Camera = Node.derive(function() {
        return {
            
            projectionMatrix : new Matrix4(),

            // Frustum bounding box in view space
            frustum : new Frustum(),

            // Scene bounding box in view space
            // mainly for the camera to adujst the near and far plane,
            // so that the view frustum contains the visible objects as tightly as possible.
            // Notice:
            //  updated after rendering (in the step of frustum culling passingly)
            //  So may be not so accurate, but saved a lot of calculation !!
            //  TODO : In case of on camera to multiple scenes
            sceneBoundingBoxLastFrame : new BoundingBox()
        }
    }, function() {
        this.update();
    }, {
        
        update : function() {
            Node.prototype.update.call(this);
            
            this.updateProjectionMatrix();
            this.frustum.setFromProjection(this.projectionMatrix);
        },
        updateProjectionMatrix : function(){}
    });

    return Camera;
})