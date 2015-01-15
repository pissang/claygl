define(function(require) {

    var Base = require('../core/Base');
    var Vector3 = require('../math/Vector3');
    var Matrix4 = require('../math/Matrix4');
    var Quaternion = require('../math/Quaternion');

    /**
     * @constructor qtek.plugin.FirstPersonControl
     * @example
     *     var control = new qtek.plugin.FirstPersonControl({
     *         target: camera,
     *         domElement: renderer.canvas
     *     });
     *     ...
     *     animation.on('frame', function(frameTime) {
     *         control.update(frameTime);
     *         renderer.render(scene, camera);
     *     });
     */
    var FirstPersonControl = Base.derive(function() {
        return /** @lends qtek.plugin.FirstPersonControl# */ {
            /**
             * Scene node to control, mostly it is a camera
             * @type {qtek.Node}
             */
            target: null,
            
            /**
             * Target dom to bind with mouse events
             * @type {HTMLElement}
             */
            domElement: null,
            
            /**
             * Mouse move sensitivity
             * @type {number}
             */
            sensitivity: 1,
            
            /**
             * Target move speed
             * @type {number}
             */
            speed: 0.4,

            /**
             * Up axis
             * @type {qtek.math.Vector3}
             */
            up: new Vector3(0, 1, 0),

            /**
             * If lock vertical movement
             * @type {boolean}
             */
            verticalMoveLock: false,

            _moveForward: false,
            _moveBackward: false,
            _moveLeft: false,
            _moveRight: false,

            _offsetPitch: 0,
            _offsetRoll: 0
        };
    }, function() {
        this._lockChange = this._lockChange.bind(this);
        this._keyDown = this._keyDown.bind(this);
        this._keyUp = this._keyUp.bind(this);
        this._mouseMove = this._mouseMove.bind(this);

        if (this.domElement) {
            this.enable();
        }
    },
    /** @lends qtek.plugin.FirstPersonControl.prototype */
    {
        /**
         * Enable control
         */
        enable: function() {
            // Use pointer lock
            // http://www.html5rocks.com/en/tutorials/pointerlock/intro/
            var el = this.domElement;

            //Must request pointer lock after click event, can't not do it directly
            //Why ? ?
            el.addEventListener('click', this._requestPointerLock);

            document.addEventListener('pointerlockchange', this._lockChange);
            document.addEventListener('mozpointerlockchange', this._lockChange);
            document.addEventListener('webkitpointerlockchange', this._lockChange);

            document.addEventListener('keydown', this._keyDown);
            document.addEventListener('keyup', this._keyUp);
        },

        /**
         * Disable control
         */
        disable: function() {

            this.target.off('beforeupdate', this._beforeUpdateCamera);

            var el = this.domElement;

            el.exitPointerLock = el.exitPointerLock
                || el.mozExitPointerLock
                || el.webkitExitPointerLock;

            if (el.exitPointerLock) {
                el.exitPointerLock();
            }

            this.domElement.removeEventListener('click', this._requestPointerLock);

            document.removeEventListener('pointerlockchange', this._lockChange);
            document.removeEventListener('mozpointerlockchange', this._lockChange);
            document.removeEventListener('webkitpointerlockchange', this._lockChange);
            
            document.removeEventListener('keydown', this._keyDown);
            document.removeEventListener('keyup', this._keyUp);
        },

        _requestPointerLock: function() {
            var el = this;
            el.requestPointerLock = el.requestPointerLock
                || el.mozRequestPointerLock
                || el.webkitRequestPointerLock;

            el.requestPointerLock();
        },

        /**
         * Control update. Should be invoked every frame
         * @param {number} frameTime Frame time
         */
        update: function(frameTime) {
            var target = this.target;

            var position = this.target.position;
            var xAxis = target.localTransform.x.normalize();
            var zAxis = target.localTransform.z.normalize();

            if (this.verticalMoveLock) {
                zAxis.y = 0;
                zAxis.normalize();
            }

            var speed = this.speed * frameTime / 20;

            if (this._moveForward) {
                // Opposite direction of z
                position.scaleAndAdd(zAxis, -speed);
            }
            if (this._moveBackward) {
                position.scaleAndAdd(zAxis, speed);
            }
            if (this._moveLeft) {
                position.scaleAndAdd(xAxis, -speed / 2);
            }
            if (this._moveRight) {
                position.scaleAndAdd(xAxis, speed / 2);
            }

            target.rotateAround(target.position, this.up, -this._offsetPitch * frameTime * Math.PI / 360);
            var xAxis = target.localTransform.right;
            target.rotateAround(target.position, xAxis, -this._offsetRoll * frameTime * Math.PI / 360);

            this._offsetRoll = this._offsetPitch = 0;
        },

        _lockChange: function() {
            if (
                document.pointerLockElement === this.domElement
                || document.mozPointerLockElement === this.domElement
                || document.webkitPointerLockElement === this.domElement
            ) {
                document.addEventListener('mousemove', this._mouseMove, false);
            } else {
                document.removeEventListener('mousemove', this._mouseMove);
            }
        },

        _mouseMove: function(e) {
            var dx = e.movementX || e.mozMovementX || e.webkitMovementX || 0;
            var dy = e.movementY || e.mozMovementY || e.webkitMovementY || 0;

            this._offsetPitch += dx * this.sensitivity / 200;
            this._offsetRoll += dy * this.sensitivity / 200;
        },

        _keyDown: function(e) {
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

        _keyUp: function(e) {
            this._moveForward = false;
            this._moveBackward = false;
            this._moveLeft = false;
            this._moveRight = false;
        }
    });

    return FirstPersonControl;
});