define(function(require) {

    var Base = require("core/Base");
    var Vector3 = require("core/Vector3");
    var Matrix4 = require("core/Matrix4");
    var Quaternion = require("core/Quaternion");

    var OrbitControl = Base.derive(function() {
        return {
            
            target : null,
            domElement : null,

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
            this.target.on("beforeupdate", this._beforeUpdateCamera, this);
            this.domElement.addEventListener("mousedown", bindOnce(this._mouseDown, this), false);
            this.domElement.addEventListener("mousewheel", bindOnce(this._mouseWheel, this), false);
            this.domElement.addEventListener("DOMMouseScroll", bindOnce(this._mouseWheel, this), false);
        },

        disable : function() {
            this.target.off("beforeupdate", this._beforeUpdateCamera);
            this.domElement.removeEventListener("mousedown", bindOnce(this._mouseDown, this));
            this.domElement.removeEventListener("mousewheel", bindOnce(this._mouseWheel, this));
            this.domElement.removeEventListener("DOMMouseScroll", bindOnce(this._mouseWheel, this));
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
                var len = this.origin.distance(this.target.position);
                var tmp = Math.sin(this.target.fov/2) / 100;
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

            var target = this.target;

            if (this._op === 0) {
                // Rotate
                target.rotateAround(this.origin, this.up, -this._offsetPitch);            
                var xAxis = target.localTransform.right;
                target.rotateAround(this.origin, xAxis, -this._offsetRoll);
                this._offsetRoll = this._offsetPitch = 0;
            } else if (this._op === 1) {
                // Pan
                var xAxis = target.localTransform.right.normalize().scale(-this._panX);
                var yAxis = target.localTransform.up.normalize().scale(this._panY);
                target.position.add(xAxis).add(yAxis);
                this.origin.add(xAxis).add(yAxis);
                this._panX = this._panY = 0;
            }
            
            // Zoom
            var zAxis = target.localTransform.forward.normalize();
            var distance = target.position.distance(this.origin);
            target.position.scaleAndAdd(zAxis, distance * this._forward / 2000);
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