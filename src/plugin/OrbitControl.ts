import Vector2 from '../math/Vector2';
import Vector3 from '../math/Vector3';
import GestureMgr, { PinchEvent } from './GestureMgr';
import vendor from '../core/vendor';
import PerspectiveCamera from '../camera/Perspective';
import Notifier from '../core/Notifier';
import Timeline from '../Timeline';
import ClayNode from '../Node';
import type { vec3 } from '../glmatrix';
import type { AnimationEasing } from '../animation/easing';
import type ProceduralKeyframeAnimator from '../animation/ProceduralKeyframeAnimator';
import OrthographicCamera from '../camera/Orthographic';
import { assign, isArray } from '../core/util';

const addEvent = vendor.addEventListener;
const removeEvent = vendor.removeEventListener;

const MOUSE_BUTTON_KEY_MAP = {
  left: 0,
  middle: 1,
  right: 2
};

function convertToArray(val: number | number[]): number[] {
  if (!isArray(val)) {
    val = [val, val];
  }
  return val;
}

type AnimatableControlOpts = Pick<
  OrbitControlOpts,
  'distance' | 'orthographicSize' | 'alpha' | 'beta' | 'center'
>;

type MouseButtons = 'left' | 'right' | 'middle';
type AltKey = 'alt';
type ShiftKey = 'shift';
type MouseButtonsWithSpecialKey =
  // | `${AltKey}+${MouseButtons}`
  `${ShiftKey}+${MouseButtons}` | MouseButtons;

interface OrbitControlOpts {
  target: ClayNode;
  timeline?: Timeline;
  domElement: HTMLElement;

  /**
   * States of orbit
   */
  distance: number;
  orthographicSize: number;
  alpha: number;
  beta: number;
  center: vec3.Vec3Array;

  /**
   * Minimum distance to the center
   * @type {number}
   * @default 0.5
   */
  minDistance: number;

  /**
   * Maximum distance to the center
   * @type {number}
   * @default 2
   */
  maxDistance: number;

  /**
   * Only available when camera is orthographic
   */
  maxOrthographicSize: number;

  /**
   * Only available when camera is orthographic
   */
  minOrthographicSize: number;

  /**
   * Aspect of orthographic camera
   * Only available when camera is orthographic
   */
  orthographicAspect: number;

  /**
   * Minimum alpha rotation
   */
  minAlpha: number;

  /**
   * Maximum alpha rotation
   */
  maxAlpha: number;

  /**
   * Minimum beta rotation
   */
  minBeta: number;
  /**
   * Maximum beta rotation
   */
  maxBeta: number;

  /**
   * Start auto rotating after still for the given time
   */
  autoRotateAfterStill: number;

  /**
   * Direction of autoRotate. cw or ccw when looking top down.
   */
  autoRotateDirection: 'cw' | 'ccw';

  /**
   * Degree per second
   */
  autoRotateSpeed: number;

  panMouseButton: MouseButtonsWithSpecialKey;
  rotateMouseButton: MouseButtonsWithSpecialKey;

  damping: number;

  rotateSensitivity: number;

  zoomSensitivity: number;

  /**
   * Invert zoom direction?
   */
  invertZoomDirection: false;

  panSensitivity: number;

  autoRotate: boolean;
}

interface OrbitControl
  extends Omit<
    OrbitControlOpts,
    'autoRotate' | 'target' | 'distance' | 'orthographicSize' | 'alpha' | 'beta' | 'center'
  > {}

class OrbitControl extends Notifier {
  private _autoRotate: boolean = false;
  private _target?: ClayNode;
  private _center = new Vector3();

  private _orthoSize?: number;

  private _mode?: 'rotate' | 'pan' = 'rotate';

  private _needsUpdate = false;

  private _rotating = false;

  // Rotation around yAxis
  private _phi = 0;
  // Rotation around xAxis
  private _theta = 0;

  private _mouseX = 0;
  private _mouseY = 0;

  private _rotateVelocity = new Vector2();

  private _panVelocity = new Vector2();

  private _distance = 20;

  private _zoomSpeed = 0;

  private _stillTimeout = 0;

  private _animators: ProceduralKeyframeAnimator[] = [];

  private _gestureMgr = new GestureMgr();

  constructor(
    opts: Omit<Partial<OrbitControlOpts>, 'domElement'> & {
      domElement: HTMLElement;
    }
  ) {
    super();

    this.domElement = opts.domElement;
    this.timeline = opts.timeline;

    this.setOption(
      assign(
        {
          autoRotate: false,
          autoRotateAfterStill: 0,
          autoRotateDirection: 'cw',
          autoRotateSpeed: 60,
          damping: 0.8,
          minDistance: 0.1,
          maxDistance: 1000,
          maxOrthographicSize: 300,
          minOrthographicSize: 30,
          orthographicAspect: 1,
          minAlpha: -90,
          maxAlpha: 90,
          minBeta: -Infinity,
          maxBeta: Infinity,
          panMouseButton: 'middle',
          rotateMouseButton: 'left',
          invertZoomDirection: false,
          rotateSensitivity: 1,
          zoomSensitivity: 1,
          panSensitivity: 1
        },
        opts
      )
    );
    // Set target after option updated.
    this.target = opts.target;

    // Each OrbitControl has it's own handler
    this._mouseDownHandler = this._mouseDownHandler.bind(this);
    this._mouseWheelHandler = this._mouseWheelHandler.bind(this);
    this._mouseMoveHandler = this._mouseMoveHandler.bind(this);
    this._mouseUpHandler = this._mouseUpHandler.bind(this);
    this._pinchHandler = this._pinchHandler.bind(this);

    this.init();
  }

  /**
   * If auto rotate the target
   */
  get autoRotate() {
    return this._autoRotate;
  }

  set autoRotate(val: boolean) {
    this._autoRotate = val;
    this._rotating = val;
  }

  get target(): ClayNode | undefined {
    return this._target;
  }

  set target(val: ClayNode | undefined) {
    if (val && val.target) {
      this.setCenter(val.target.toArray());
    }
    this._target = val;
    this.decomposeTransform();
  }

  /**
   * Initialize.
   * Mouse event binding
   */
  init() {
    const dom = this.domElement;

    addEvent(dom, 'pointerdown', this._mouseDownHandler);
    addEvent(dom, 'wheel', this._mouseWheelHandler);

    if (this.timeline) {
      this.timeline.on('frame', () => this.update());
    }
    if (this.target) {
      this.decomposeTransform();
    }
  }

  /**
   * Dispose.
   * Mouse event unbinding
   */
  dispose() {
    const dom = this.domElement;

    removeEvent(dom, 'pointerdown', this._mouseDownHandler);
    removeEvent(dom, 'pointermove', this._mouseMoveHandler);
    removeEvent(dom, 'pointerup', this._mouseUpHandler);

    removeEvent(dom, 'wheel', this._mouseWheelHandler);
    removeEvent(dom, 'pointerout', this._mouseUpHandler);

    if (this.timeline) {
      this.timeline.off('frame', this.update);
    }
    this.stopAllAnimation();
  }

  /**
   * Get distance
   * @return {number}
   */
  getDistance() {
    return this._distance;
  }

  /**
   * Set distance
   * @param {number} distance
   */
  setDistance(distance: number) {
    this._distance = distance;
    this._needsUpdate = true;
  }

  /**
   * Get size of orthographic viewing volume
   * @return {number}
   */
  getOrthographicSize() {
    return this._orthoSize;
  }

  /**
   * Set size of orthographic viewing volume
   * @param {number} size
   */
  setOrthographicSize(size: number) {
    this._orthoSize = size;
    this._needsUpdate = true;
  }

  /**
   * Get alpha rotation
   * Alpha angle for top-down rotation. Positive to rotate to top.
   *
   * Which means camera rotation around x axis.
   */
  getAlpha() {
    return (this._theta / Math.PI) * 180;
  }

  /**
   * Get beta rotation
   * Beta angle for left-right rotation. Positive to rotate to right.
   *
   * Which means camera rotation around y axis.
   */
  getBeta() {
    return (-this._phi / Math.PI) * 180;
  }

  /**
   * Get control center
   * @return {Array.<number>}
   */
  getCenter() {
    return this._center.toArray();
  }

  /**
   * Set alpha rotation angle
   * @param {number} alpha
   */
  setAlpha(alpha: number) {
    alpha = Math.max(Math.min(this.maxAlpha, alpha), this.minAlpha);

    this._theta = (alpha / 180) * Math.PI;
    this._needsUpdate = true;
  }

  /**
   * Set beta rotation angle
   * @param {number} beta
   */
  setBeta(beta: number) {
    beta = Math.max(Math.min(this.maxBeta, beta), this.minBeta);

    this._phi = (-beta / 180) * Math.PI;
    this._needsUpdate = true;
  }

  /**
   * Set control center
   * @param {Array.<number>} center
   */
  setCenter(centerArr: vec3.Vec3Array) {
    this._center.setArray(centerArr);
  }

  setOption(opts?: Partial<OrbitControlOpts>) {
    opts = opts || {};

    (
      [
        'autoRotate',
        'autoRotateAfterStill',
        'autoRotateDirection',
        'autoRotateSpeed',
        'damping',
        'minDistance',
        'maxDistance',
        'minOrthographicSize',
        'maxOrthographicSize',
        'orthographicAspect',
        'minAlpha',
        'maxAlpha',
        'minBeta',
        'maxBeta',
        'panMouseButton',
        'rotateMouseButton',
        'invertZoomDirection',
        'rotateSensitivity',
        'zoomSensitivity',
        'panSensitivity'
      ] as const
    ).forEach((key) => {
      if (opts![key] != null) {
        (this as any)[key] = opts![key];
      }
    });

    if (opts.distance != null) {
      this.setDistance(opts.distance);
    }
    if (opts.orthographicSize != null) {
      this.setOrthographicSize(opts.orthographicSize);
    }

    if (opts.alpha != null) {
      this.setAlpha(opts.alpha);
    }
    if (opts.beta != null) {
      this.setBeta(opts.beta);
    }

    if (opts.center) {
      this.setCenter(opts.center);
    }

    this._updateTransform();
    if (this.target) {
      this.target.update();
    }
  }

  animateTo(
    opts: Partial<
      AnimatableControlOpts & {
        duration: number;
        easing: AnimationEasing;
        done: () => void;
      }
    >
  ) {
    const self = this;

    const obj = {} as AnimatableControlOpts;
    const target = {} as AnimatableControlOpts;
    const timeline = this.timeline;
    if (!timeline) {
      return;
    }
    if (opts.distance != null) {
      obj.distance = this.getDistance();
      target.distance = opts.distance;
    }
    if (opts.orthographicSize != null) {
      obj.orthographicSize = this.getOrthographicSize() as number;
      target.orthographicSize = opts.orthographicSize;
    }
    if (opts.alpha != null) {
      obj.alpha = this.getAlpha();
      target.alpha = opts.alpha;
    }
    if (opts.beta != null) {
      obj.beta = this.getBeta();
      target.beta = opts.beta;
    }
    if (opts.center != null) {
      obj.center = this.getCenter();
      target.center = opts.center;
    }

    return this._addAnimator(
      timeline
        .animate(obj)
        .when(opts.duration || 1000, target)
        .during(function () {
          if (obj.alpha != null) {
            self.setAlpha(obj.alpha);
          }
          if (obj.beta != null) {
            self.setBeta(obj.beta);
          }
          if (obj.distance != null) {
            self.setDistance(obj.distance);
          }
          if (obj.orthographicSize != null) {
            self.setOrthographicSize(obj.orthographicSize);
          }
          if (obj.center != null) {
            self.setCenter(obj.center);
          }
          self._needsUpdate = true;
        })
        .done(opts.done)
    ).start(opts.easing || 'linear');
  }

  /**
   * Stop all animations
   */
  stopAllAnimation() {
    for (let i = 0; i < this._animators.length; i++) {
      this._animators[i].stop();
    }
    this._animators.length = 0;
  }

  _isAnimating() {
    return this._animators.length > 0;
  }
  /**
   * Call update each frame
   * @param  {number} deltaTime Frame time
   */
  update(deltaTime?: number) {
    deltaTime = deltaTime || 16;

    if (this._rotating) {
      const radian =
        (((this.autoRotateDirection === 'cw' ? 1 : -1) * this.autoRotateSpeed) / 180) * Math.PI;
      this._phi -= (radian * deltaTime) / 1000;
      this._needsUpdate = true;
    } else if (this._rotateVelocity.len() > 0) {
      this._needsUpdate = true;
    }

    if (Math.abs(this._zoomSpeed) > 0.01 || this._panVelocity.len() > 0) {
      this._needsUpdate = true;
    }

    if (!this._needsUpdate) {
      return;
    }

    // Fixed deltaTime
    this._updateDistanceOrSize(Math.min(deltaTime, 50));
    this._updatePan(Math.min(deltaTime, 50));

    this._updateRotate(Math.min(deltaTime, 50));

    this._updateTransform();

    if (this.target) {
      this.target.update();
    }

    this.trigger('update');

    this._needsUpdate = false;
  }

  _updateRotate(deltaTime: number) {
    const velocity = this._rotateVelocity;
    this._phi = (velocity.y * deltaTime) / 20 + this._phi;
    this._theta = (velocity.x * deltaTime) / 20 + this._theta;

    this.setAlpha(this.getAlpha());
    this.setBeta(this.getBeta());

    this._vectorDamping(velocity, this.damping);
  }

  _updateDistanceOrSize(deltaTime: number) {
    this._setDistance(this._distance + (this._zoomSpeed * deltaTime) / 20);
    if (!(this.target instanceof PerspectiveCamera)) {
      this._setOrthoSize((this._orthoSize as number) + (this._zoomSpeed * deltaTime) / 20);
    }

    this._zoomSpeed *= Math.pow(this.damping, deltaTime / 16);
  }

  _setDistance(distance: number) {
    this._distance = Math.max(Math.min(distance, this.maxDistance), this.minDistance);
  }

  _setOrthoSize(size: number) {
    this._orthoSize = Math.max(Math.min(size, this.maxOrthographicSize), this.minOrthographicSize);
    const camera = this.target as OrthographicCamera;
    const cameraHeight = this._orthoSize;
    // TODO
    const cameraWidth = cameraHeight * this.orthographicAspect;
    camera.left = -cameraWidth / 2;
    camera.right = cameraWidth / 2;
    camera.top = cameraHeight / 2;
    camera.bottom = -cameraHeight / 2;
  }

  _updatePan(deltaTime: number) {
    const velocity = this._panVelocity;
    const len = this._distance;

    const target = this.target;
    if (!target) {
      return;
    }
    const yAxis = target.worldTransform.y;
    const xAxis = target.worldTransform.x;

    // PENDING
    this._center
      .scaleAndAdd(xAxis, (-velocity.x * len) / 200)
      .scaleAndAdd(yAxis, (-velocity.y * len) / 200);

    this._vectorDamping(velocity, 0);

    velocity.x = velocity.y = 0;
  }

  _updateTransform() {
    const camera = this.target;
    if (!camera) {
      return;
    }

    const dir = new Vector3();
    const theta = this._theta + Math.PI / 2;
    const phi = this._phi + Math.PI / 2;
    const r = Math.sin(theta);

    dir.x = r * Math.cos(phi);
    dir.y = -Math.cos(theta);
    dir.z = r * Math.sin(phi);

    camera.position.copy(this._center).scaleAndAdd(dir, this._distance);
    camera.rotation
      .identity()
      // First around y, then around x
      .rotateY(-this._phi)
      .rotateX(-this._theta);
  }

  _startCountingStill() {
    clearTimeout(this._stillTimeout);

    const time = this.autoRotateAfterStill;
    const self = this;
    if (!isNaN(time) && time > 0) {
      this._stillTimeout = setTimeout(function () {
        self._rotating = true;
      }, time * 1000) as any;
    }
  }

  _vectorDamping(v: Vector2, damping: number) {
    let speed = v.len();
    speed = speed * damping;
    if (speed < 1e-4) {
      speed = 0;
    }
    v.normalize().scale(speed);
  }

  decomposeTransform() {
    if (!this.target) {
      return;
    }

    this.target.updateWorldTransform();

    const forward = this.target.worldTransform.z;
    const alpha = Math.asin(forward.y);
    const beta = Math.atan2(forward.x, forward.z);

    this._theta = alpha;
    this._phi = -beta;

    this.setBeta(this.getBeta());
    this.setAlpha(this.getAlpha());

    this._setDistance(this.target.position.dist(this._center));
    if (this.target instanceof OrthographicCamera) {
      this._setOrthoSize(this.target.top - this.target.bottom);
    }
  }

  _mouseDownHandler(e: MouseEvent | TouchEvent) {
    if (this._isAnimating()) {
      return;
    }
    let x = (e as MouseEvent).clientX;
    let y = (e as MouseEvent).clientY;
    // Touch
    if ((e as TouchEvent).targetTouches) {
      const touch = (e as TouchEvent).targetTouches[0];
      x = touch.clientX;
      y = touch.clientY;

      this._mode = 'rotate';

      this._processGesture(e as TouchEvent, 'start');
    } else {
      const { rotateMouseButton, panMouseButton } = this;
      const rotateMouseBtnKey =
        MOUSE_BUTTON_KEY_MAP[rotateMouseButton.split('+').pop()!.trim() as MouseButtons];
      const panMouseBtnKey =
        MOUSE_BUTTON_KEY_MAP[panMouseButton.split('+').pop()!.trim() as MouseButtons];

      const needsCheckShiftKey =
        rotateMouseButton.includes('shift') || panMouseButton.includes('shift');

      function checkShift(buttonName: MouseButtonsWithSpecialKey) {
        if (!needsCheckShiftKey) {
          return true;
        }
        return buttonName.includes('shift') === e.shiftKey;
      }

      if ((e as MouseEvent).button === rotateMouseBtnKey && checkShift(rotateMouseButton)) {
        this._mode = 'rotate';
      } else if ((e as MouseEvent).button === panMouseBtnKey && checkShift(panMouseButton)) {
        this._mode = 'pan';

        /**
         * Vendors like Mozilla provide a mouse-driven panning feature
         * that is activated when the middle mouse button is pressed.
         *
         * @see https://w3c.github.io/uievents/#event-type-mousedown
         */
        e.preventDefault();
      } else {
        this._mode = undefined;
      }
    }

    const dom = this.domElement;

    addEvent(dom, 'pointermove', this._mouseMoveHandler);
    addEvent(dom, 'pointerup', this._mouseUpHandler);
    addEvent(dom, 'pointerout', this._mouseUpHandler);

    // Reset rotate velocity
    this._rotateVelocity.set(0, 0);
    this._rotating = false;
    if (this.autoRotate) {
      this._startCountingStill();
    }

    this._mouseX = x;
    this._mouseY = y;
  }

  _mouseMoveHandler(e: MouseEvent | TouchEvent) {
    if (this._isAnimating()) {
      return;
    }
    let x = (e as MouseEvent).clientX;
    let y = (e as MouseEvent).clientY;

    let haveGesture;
    // Touch
    if ((e as TouchEvent).targetTouches) {
      const touch = (e as TouchEvent).targetTouches[0];
      x = touch.clientX;
      y = touch.clientY;

      haveGesture = this._processGesture(e as TouchEvent, 'change');
    }

    const panSensitivity = convertToArray(this.panSensitivity);
    const rotateSensitivity = convertToArray(this.rotateSensitivity);

    if (!haveGesture) {
      if (this._mode === 'rotate') {
        this._rotateVelocity.y +=
          ((x - this._mouseX) / this.domElement.clientWidth) * 2 * rotateSensitivity[0];
        this._rotateVelocity.x +=
          ((y - this._mouseY) / this.domElement.clientHeight) * 2 * rotateSensitivity[1];
      } else if (this._mode === 'pan') {
        this._panVelocity.x +=
          ((x - this._mouseX) / this.domElement.clientWidth) * panSensitivity[0] * 400;
        this._panVelocity.y +=
          ((-y + this._mouseY) / this.domElement.clientHeight) * panSensitivity[1] * 400;
      }
    }

    this._mouseX = x;
    this._mouseY = y;

    e.preventDefault && e.preventDefault();
  }

  _mouseWheelHandler(e: WheelEvent) {
    if (this._isAnimating()) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    const delta = e.deltaY;
    if (delta === 0) {
      return;
    }

    if (this.invertZoomDirection) {
      this._zoomHandler(e, delta > 0 ? -1 : 1);
    } else {
      this._zoomHandler(e, delta > 0 ? 1 : -1);
    }
  }

  _pinchHandler(e: PinchEvent) {
    if (this._isAnimating()) {
      return;
    }
    this._zoomHandler(e as any, e.pinchScale > 1 ? 0.4 : -0.4);
  }

  _zoomHandler(e: WheelEvent, delta: number) {
    let speed;
    if (this.target instanceof PerspectiveCamera) {
      speed = Math.max(
        Math.max(Math.min(this._distance - this.minDistance, this.maxDistance - this._distance)) /
          20,
        0.5
      );
    } else {
      speed = Math.max(
        Math.max(
          Math.min(
            (this._orthoSize as number) - this.minOrthographicSize,
            this.maxOrthographicSize - (this._orthoSize as number)
          )
        ) / 20,
        0.5
      );
    }

    this._zoomSpeed = (delta > 0 ? -1 : 1) * speed * this.zoomSensitivity;

    this._rotating = false;

    if (this.autoRotate && this._mode === 'rotate') {
      this._startCountingStill();
    }

    e.preventDefault && e.preventDefault();
  }

  _mouseUpHandler(event: MouseEvent | TouchEvent) {
    const dom = this.domElement;
    removeEvent(dom, 'pointermove', this._mouseMoveHandler);
    removeEvent(dom, 'pointerup', this._mouseUpHandler);
    removeEvent(dom, 'pointerout', this._mouseUpHandler);

    this._processGesture(event as TouchEvent, 'end');
  }

  _addAnimator(animator: ProceduralKeyframeAnimator) {
    const animators = this._animators;
    animators.push(animator);
    animator.done(function () {
      const idx = animators.indexOf(animator);
      if (idx >= 0) {
        animators.splice(idx, 1);
      }
    });
    return animator;
  }

  _processGesture(event: TouchEvent, stage: 'start' | 'end' | 'change') {
    const gestureMgr = this._gestureMgr;

    stage === 'start' && gestureMgr.clear();

    const gestureInfo = gestureMgr.recognize(event, null, this.domElement);

    stage === 'end' && gestureMgr.clear();

    // Do not do any preventDefault here. Upper application do that if necessary.
    if (gestureInfo) {
      const type = gestureInfo.type;
      (event as any).gestureEvent = type;

      this._pinchHandler(gestureInfo.event);
    }

    return gestureInfo;
  }
}

export default OrbitControl;
