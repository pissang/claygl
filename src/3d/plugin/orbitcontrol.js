/**
 * @export{class} OrbitControl
 */
define(function(require) {

    var Base = require("core/base");
    var Vector3 = require("core/vector3");
    var Matrix4 = require("core/matrix4");
    var Quaternion = require("core/quaternion");

    var OrbitControl = Base.derive(function() {
        return {
            
            camera : null,
            canvas : null,

            sensitivity : 1,

            origin : new Vector3(),

            up : new Vector3(0, 1, 0),
            // Rotate around origin
            _offsetPitch : 0,
            _offsetRoll : 0,

            // Pan the origin
            _panX : 0,
            _panY : 0,

            // Offset of mouse move
            _offsetX : 0,
            _offsetY : 0,

            // Zoom with mouse wheel
            _forward : 0,

            _op : 0  //0 : ROTATE, 1 : PAN
        }
    }, {

        enable : function() {

            this.camera.on("beforeupdate", this._beforeUpdateCamera, this);

            this.canvas.addEventListener("mousedown", bindOnce(this._mouseDown, this), false);
            this.canvas.addEventListener("mousewheel", bindOnce(this._mouseWheel, this), false);
            this.canvas.addEventListener("DOMMouseScroll", bindOnce(this._mouseWheel, this), false);
        },

        disable : function() {
            this.camera.off("beforeupdate", this._beforeUpdateCamera);
            this.canvas.removeEventListener("mousedown", bindOnce(this._mouseDown, this));
            this.canvas.removeEventListener("mousewheel", bindOnce(this._mouseWheel, this));
            this.canvas.removeEventListener("DOMMouseScroll", bindOnce(this._mouseWheel, this));
            this._mouseUp();
        },

        _mouseWheel : function(e) {
            e.preventDefault();
            var delta = e.wheelDelta // Webkit 
                        || -e.detail; // Firefox

            this._forward += delta * this.sensitivity;
        },

        _mouseDown : function(e) {
            document.addEventListener("mousemove", bindOnce(this._mouseMove, this), false);
            document.addEventListener("mouseup", bindOnce(this._mouseUp, this), false);
            document.addEventListener("mouseout", bindOnce(this._mouseOut, this), false);

            this._offsetX = e.pageX;
            this._offsetY = e.pageY;

            // Rotate
            if (e.button === 0) {
                this._op = 0;
            } else if (e.button === 1) {
                this._op = 1;
            }
        },

        _mouseMove : function(e) {
            var dx = e.pageX - this._offsetX,
                dy = e.pageY - this._offsetY;

            if (this._op === 0) {
                this._offsetPitch += dx * this.sensitivity / 100;
                this._offsetRoll += dy * this.sensitivity / 100;
            } else if (this._op === 1) {
                var len = this.origin.distance(this.camera.position);
                var tmp = Math.sin(this.camera.fov/2) / 100;
                this._panX -= dx * this.sensitivity * len * tmp;
                this._panY -= dy * this.sensitivity * len * tmp;
            }

            this._offsetX = e.pageX;
            this._offsetY = e.pageY;
        },

        _mouseUp : function() {

            document.removeEventListener("mousemove", bindOnce(this._mouseMove, this));
            document.removeEventListener("mouseup", bindOnce(this._mouseUp, this));
            document.removeEventListener("mouseout", bindOnce(this._mouseOut, this));

            this._op = -1;
        },

        _mouseOut : function() {
            this._mouseUp();
        },

        _beforeUpdateCamera : function() {

            var camera = this.camera;

            if (this._op === 0) {
                // Rotate
                camera.rotateAround(this.origin, this.up, -this._offsetPitch);            
                var xAxis = camera.matrix.right;
                camera.rotateAround(this.origin, xAxis, -this._offsetRoll);
                this._offsetRoll = this._offsetPitch = 0;
            } else if (this._op === 1) {
                // Pan
                var xAxis = camera.matrix.right.normalize().scale(-this._panX);
                var yAxis = camera.matrix.up.normalize().scale(this._panY);
                camera.position.add(xAxis).add(yAxis);
                this.origin.add(xAxis).add(yAxis);
                this._panX = this._panY = 0;
            }
            
            // Zoom
            var zAxis = camera.matrix.forward.normalize();
            var distance = camera.position.distance(this.origin);
            camera.position.scaleAndAdd(zAxis, distance * this._forward / 2000);
            this._forward = 0;

        }
    });

    function bindOnce(func, context) {
        if (!func.__bindfuc__) {
            func.__bindfuc__ = function() {
                return func.apply(context, arguments); 
            }
        }
        return func.__bindfuc__;
    }

    return OrbitControl;
} )