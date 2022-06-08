import Vector3 from '../math/Vector3';
import vendor from '../core/vendor';
import ClayNode from '../Node';
import Timeline from '../Timeline';
import Notifier from '../core/Notifier';
import { assign } from '../core/util';

const addEvent = vendor.addEventListener;
const removeEvent = vendor.removeEventListener;

interface FreeControlOpts {
  /**
   * Scene node to control, mostly it is a camera
   */
  target?: ClayNode;
  /**
   * Target dom to bind with mouse events
   */
  domElement: HTMLElement;

  /**
   * Mouse move sensitivity
   * @type {number}
   */
  sensitivity: number;

  /**
   * Target move speed
   * @type {number}
   */
  speed: number;

  /**
   * Up axis
   * @type {clay.Vector3}
   */
  up: Vector3;

  /**
   * If lock vertical movement
   * @type {boolean}
   */
  verticalMoveLock: boolean;

  /**
   * @type {clay.Timeline}
   */
  timeline?: Timeline;
}

interface FreeControl extends FreeControlOpts {}
/**
 * @example
 *     const control = new clay.plugin.FreeControl({
 *         target: camera,
 *         domElement: renderer.canvas
 *     });
 *     ...
 *     timeline.on('frame', function(frameTime) {
 *         control.update(frameTime);
 *         renderer.render(scene, camera);
 *     });
 */
class FreeControl extends Notifier {
  private _moveForward = false;
  private _moveBackward = false;
  private _moveLeft = false;
  private _moveRight = false;

  private _offsetPitch = 0;
  private _offsetRoll = 0;

  constructor(
    opts: Omit<Partial<FreeControlOpts>, 'domElement'> & {
      domElement: HTMLElement;
    }
  ) {
    super();

    assign(
      this,
      {
        sensitivity: 1,
        speed: 0.4,
        up: new Vector3(0, 1, 0),
        verticalMoveLock: false
      },
      opts
    );

    this._lockChange = this._lockChange.bind(this);
    this._keyDown = this._keyDown.bind(this);
    this._keyUp = this._keyUp.bind(this);
    this._mouseMove = this._mouseMove.bind(this);

    if (this.domElement) {
      this.init();
    }
  }
  /**
   * init control
   */
  init() {
    // Use pointer lock
    // http://www.html5rocks.com/en/tutorials/pointerlock/intro/
    const el = this.domElement;

    //Must request pointer lock after click event, can't not do it directly
    //Why ? ?
    addEvent(el, 'click', this._requestPointerLock);

    addEvent(document, 'pointerlockchange', this._lockChange);
    addEvent(document, 'mozpointerlockchange', this._lockChange);
    addEvent(document, 'webkitpointerlockchange', this._lockChange);

    addEvent(document, 'keydown', this._keyDown);
    addEvent(document, 'keyup', this._keyUp);

    if (this.timeline) {
      this.timeline.on('frame', this._detectMovementChange, this);
    }
  }

  /**
   * Dispose control
   */
  dispose() {
    const el = this.domElement;

    document.exitPointerLock = document.exitPointerLock || (document as any).mozExitPointerLock;

    if (document.exitPointerLock) {
      document.exitPointerLock();
    }

    removeEvent(el, 'click', this._requestPointerLock);

    removeEvent(document, 'pointerlockchange', this._lockChange);
    removeEvent(document, 'mozpointerlockchange', this._lockChange);
    removeEvent(document, 'webkitpointerlockchange', this._lockChange);

    removeEvent(document, 'keydown', this._keyDown);
    removeEvent(document, 'keyup', this._keyUp);

    if (this.timeline) {
      this.timeline.off('frame', this._detectMovementChange);
    }
  }

  _requestPointerLock() {
    const el = this.domElement;
    el.requestPointerLock = el.requestPointerLock || (el as any).mozRequestPointerLock;

    el.requestPointerLock();
  }

  /**
   * Control update. Should be invoked every frame
   * @param {number} frameTime Frame time
   */
  update(frameTime: number) {
    const target = this.target;
    if (!target) {
      return;
    }

    const position = target.position;
    let xAxis = target.localTransform.x.normalize();
    const zAxis = target.localTransform.z.normalize();

    if (this.verticalMoveLock) {
      zAxis.y = 0;
      zAxis.normalize();
    }

    const speed = (this.speed * frameTime) / 20;

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

    target.rotateAround(target.position, this.up, (-this._offsetPitch * frameTime * Math.PI) / 360);
    xAxis = target.localTransform.x;
    target.rotateAround(target.position, xAxis, (-this._offsetRoll * frameTime * Math.PI) / 360);

    this._offsetRoll = this._offsetPitch = 0;
  }

  _lockChange() {
    if (
      document.pointerLockElement === this.domElement ||
      (document as any).mozPointerLockElement === this.domElement
    ) {
      addEvent(document, 'mousemove', this._mouseMove, false);
    } else {
      removeEvent(document, 'mousemove', this._mouseMove);
    }
  }

  _mouseMove(e: MouseEvent) {
    const dx = e.movementX || (e as any).mozMovementX || 0;
    const dy = e.movementY || (e as any).mozMovementY || 0;

    this._offsetPitch += (dx * this.sensitivity) / 200;
    this._offsetRoll += (dy * this.sensitivity) / 200;

    // Trigger change event to remind renderer do render
    this.trigger('change');
  }

  _detectMovementChange(frameTime: number) {
    if (this._moveForward || this._moveBackward || this._moveLeft || this._moveRight) {
      this.trigger('change');
    }
    this.update(frameTime);
  }

  _keyDown(e: KeyboardEvent) {
    switch (e.keyCode) {
      case 87: //w
      case 38: //up arrow
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
    // Trigger change event to remind renderer do render
    this.trigger('change');
  }

  _keyUp(e: KeyboardEvent) {
    switch (e.keyCode) {
      case 87: //w
      case 38: //up arrow
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
}

export default FreeControl;
