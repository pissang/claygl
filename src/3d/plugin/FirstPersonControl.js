define(function(require) {

    var Base = require("core/Base");
    var Vector3 = require("core/Vector3");
    var Matrix4 = require("core/Matrix4");
    var Quaternion = require("core/Quaternion");

    var FirstPersonControl = Base.derive(function() {
        return {
            target : null,
            domElement : null,

            sensitivity : 1,
            speed : 0.4,

            up : new Vector3(0, 1, 0),

            _moveForward : false,
            _moveBackward : false,
            _moveLeft : false,
            _moveRight : false,

            _offsetPitch : 0,
            _offsetRoll : 0
        }
    }, function() {
        this.enable();
    }, {
        enable : function() {
            this.target.eulerOrder = ["Y", "X", "Z"];
            // Use pointer lock
            // http://www.html5rocks.com/en/tutorials/pointerlock/intro/
            var el = this.domElement;

            //Must request pointer lock after click event, can't not do it directly
            //Why ? ?
            el.addEventListener("click", this.requestPointerLock);

            document.addEventListener("pointerlockchange", bindOnce(this._lockChange, this), false);
            document.addEventListener("mozpointerlockchange", bindOnce(this._lockChange, this), false);
            document.addEventListener("webkitpointerlockchange", bindOnce(this._lockChange, this), false);

            document.addEventListener("keydown", bindOnce(this._keyDown, this), false);
            document.addEventListener("keyup", bindOnce(this._keyUp, this), false);
        },

        disable : function() {

            this.target.off('beforeupdate', this._beforeUpdateCamera);

            var el = this.domElement;

            el.exitPointerLock = el.exitPointerLock ||
                                    el.mozExitPointerLock ||
                                    el.webkitExitPointerLock

            if (el.exitPointerLock) {
                el.exitPointerLock();
            }
            document.removeEventListener("pointerlockchange", bindOnce(this._lockChange, this));
            document.removeEventListener("mozpointerlockchange", bindOnce(this._lockChange, this));
            document.removeEventListener("webkitpointerlockchange", bindOnce(this._lockChange, this));
        
        },

        requestPointerLock : function() {
            var el = this;
            el.requestPointerLock = el.requestPointerLock ||
                                    el.mozRequestPointerLock ||
                                    el.webkitRequestPointerLock;

            el.requestPointerLock();
        },

        update : (function() {

            var rotateQuat = new Quaternion();
            
            return function(deltaTime) {
                
                var target = this.target;

                var position = this.target.position,
                    xAxis = target.localTransform.right.normalize(),
                    zAxis = target.localTransform.forward.normalize();

                if (this._moveForward) {
                    // Opposite direction of z
                    position.scaleAndAdd(zAxis, -this.speed);
                }
                if (this._moveBackward) {
                    position.scaleAndAdd(zAxis, this.speed);
                }
                if (this._moveLeft) {
                    position.scaleAndAdd(xAxis, -this.speed/2);
                }
                if (this._moveRight) {
                    position.scaleAndAdd(xAxis, this.speed/2);
                }


                target.rotateAround(target.position, this.up, -this._offsetPitch * Math.PI / 180);
                var xAxis = target.localTransform.right;
                target.rotateAround(target.position, xAxis, -this._offsetRoll * Math.PI / 180);

                this._offsetRoll = this._offsetPitch = 0;
            }

        })(),

        _lockChange : function() {
            if (document.pointerlockElement === this.domElement ||
                document.mozPointerlockElement === this.domElement ||
                document.webkitPointerLockElement === this.domElement) {

                document.addEventListener('mousemove', bindOnce(this._mouseMove, this), false);
            }else{
                document.removeEventListener('mousemove', bindOnce(this._mouseMove, this), false);
            }
        },

        _mouseMove : function(e) {
            var dx = e.movementX || 
                    e.mozMovementX ||
                    e.webkitMovementX || 0;
            var dy = e.movementY ||
                    e.mozMovementY ||
                    e.webkitMovementY || 0;

            this._offsetPitch += dx * this.sensitivity / 10;
            this._offsetRoll += dy * this.sensitivity / 10;
            
        },

        _keyDown : function(e) {
            switch(e.keyCode) {
                case 87: //w
                case 37: //up arrow
                    this._moveForward = true;
                    break;
                case 83: //s
                case 40: //down arrow
                    this._moveBackward = true;
                    break;
                case 65: //a
                case 37: //left arrow
                    this._moveLeft = true;
                    break;
                case 68: //d
                case 39: //right arrow
                    this._moveRight = true;
                    break; 
            }
        },

        _keyUp : function(e) {
            switch(e.keyCode) {
                case 87: //w
                case 37: //up arrow
                    this._moveForward = false;
                    break;
                case 83: //s
                case 40: //down arrow
                    this._moveBackward = false;
                    break;
                case 65: //a
                case 37: //left arrow
                    this._moveLeft = false;
                    break;
                case 68: //d
                case 39: //right arrow
                    this._moveRight = false;
                    break; 
            }
        }
    })

    function bindOnce(func, context) {
        if (!func.__bindfuc__) {
            func.__bindfuc__ = function() {
                return func.apply(context, arguments); 
            }
        }
        return func.__bindfuc__;
    }

    return FirstPersonControl;
})