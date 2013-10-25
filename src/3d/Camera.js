define(function(require) {

    var Node = require("./Node");
    var Matrix4 = require("core/Matrix4");

    var Camera = Node.derive(function() {
        return {
            projectionMatrix : new Matrix4(),
        }
    }, function() {
        this.update();
    }, {
        
        update : function(_gl) {
            Node.prototype.update.call(this, _gl);
            
            this.updateProjectionMatrix();
        }
    });

    return Camera;
})