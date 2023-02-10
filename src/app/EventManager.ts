import * as rayPicking from '../picking/rayPicking';
import vendor from '../core/vendor';
import type Renderer from '../Renderer';
import type ClayNode from '../Node';
import Scene from '../Scene';
import { assign } from '../core/util';
import Camera from '../Camera';

const HOVER_EVENTS = ['pointerout', 'pointermove'] as const;
const CLICK_EVENTS = ['click', 'dblclick', 'pointerdown', 'pointerup'] as const;
const WHEEL_EVENTS = ['wheel'] as const;

type ListenedEvents =
  | typeof HOVER_EVENTS[number]
  | typeof CLICK_EVENTS[number]
  | typeof WHEEL_EVENTS[number];

type ClayEventType =
  | 'click'
  | 'dblclick'
  | 'wheel'
  | 'pointerdown'
  | 'pointermove'
  | 'pointerup'
  | 'pointerover'
  | 'pointerout';

export type EventTriggers = 'hover' | 'click' | 'wheel';

// TODO only mouseout event only have target property from Itersection
export interface ClayMouseEvent extends Partial<rayPicking.Intersection> {
  target: ClayNode;
  type: ClayEventType;
  offsetX: number;
  offsetY: number;
  wheelDelta?: number;
  cancelBubble?: boolean;
}

function packageEvent(
  eventType: ClayEventType,
  pickResult: Partial<rayPicking.Intersection>,
  offsetX: number,
  offsetY: number,
  wheelDelta?: number
) {
  return assign(
    {
      type: eventType,
      offsetX: offsetX,
      offsetY: offsetY,
      wheelDelta: wheelDelta
    },
    pickResult
  ) as ClayMouseEvent;
}

function bubblingEvent(target: ClayNode | undefined, event: ClayMouseEvent) {
  while (target && !event.cancelBubble) {
    target.trigger(event.type, event);
    target = target.getParent();
  }
}

function makeHandlerName(eveType: string) {
  return '_' + eveType + 'Handler';
}

export class EventManager {
  private _renderer: Renderer;
  private _container: HTMLElement;
  private _scene: Scene;
  private _camera: Camera | undefined;

  private _listenedEvents: ListenedEvents[] = [];

  constructor(container: HTMLElement, renderer: Renderer, scene: Scene, camera?: Camera) {
    this._container = container;
    this._renderer = renderer;
    this._scene = scene;
    this._camera = camera;
  }

  setCamera(camera?: Camera) {
    this._camera = camera;
  }

  enable(enabledTriggers?: EventTriggers[]) {
    // Disable before enable.
    this.disable();

    const dom = this._container;
    const scene = this._scene;
    const renderer = this._renderer;

    enabledTriggers = enabledTriggers || ['click', 'hover', 'wheel'];

    const eventNames = [
      ...(enabledTriggers.indexOf('click') >= 0 ? CLICK_EVENTS : []),
      ...(enabledTriggers.indexOf('hover') >= 0 ? HOVER_EVENTS : []),
      ...(enabledTriggers.indexOf('wheel') >= 0 ? WHEEL_EVENTS : [])
    ];

    this._listenedEvents = eventNames;

    let oldTarget: ClayNode | undefined;
    let downTarget: ClayNode | undefined;
    eventNames.forEach((domEveType) => {
      vendor.addEventListener(
        dom,
        domEveType,
        ((this as any)[makeHandlerName(domEveType)] = (e: MouseEvent | TouchEvent) => {
          const mainCamera = this._camera || scene.getMainCamera();
          if (!mainCamera) {
            // Not have camera yet.
            return;
          }

          const box = dom.getBoundingClientRect();
          let offsetX, offsetY;
          let eveType: ClayEventType;

          if ((e as TouchEvent).targetTouches) {
            const touch =
              domEveType !== 'pointerup'
                ? (e as TouchEvent).targetTouches[0]
                : (e as TouchEvent).changedTouches[0];

            offsetX = touch.clientX - box.left;
            offsetY = touch.clientY - box.top;
          } else {
            offsetX = (e as MouseEvent).clientX - box.left;
            offsetY = (e as MouseEvent).clientY - box.top;
          }

          const pickResultAll = rayPicking.pickAll(renderer, scene, mainCamera, offsetX, offsetY);
          // Just ignore silent element.
          const pickResult = pickResultAll.find((result) => !result.target.silent);

          if (domEveType === 'pointerdown') {
            downTarget = pickResult && pickResult.target;
          }

          let delta;
          if (domEveType === 'wheel') {
            delta = (e as WheelEvent).deltaY / 120;
          }

          if (pickResult) {
            if (domEveType === 'click') {
              // Not trigger click event if target is changed.
              if (pickResult.target !== downTarget) {
                return;
              }
            }

            if (domEveType === 'pointermove') {
              // PENDING touchdown should trigger mouseover event ?
              const targetChanged = pickResult.target !== oldTarget;
              if (targetChanged) {
                oldTarget &&
                  bubblingEvent(
                    oldTarget,
                    packageEvent(
                      'pointerout',
                      {
                        target: oldTarget
                      },
                      offsetX,
                      offsetY
                    )
                  );
              }
              bubblingEvent(
                pickResult.target,
                packageEvent('pointermove', pickResult, offsetX, offsetY)
              );
              if (targetChanged) {
                bubblingEvent(
                  pickResult.target,
                  packageEvent('pointerover', pickResult, offsetX, offsetY)
                );
              }
            } else {
              // Map events
              eveType = domEveType;
              bubblingEvent(
                pickResult.target,
                packageEvent(eveType, pickResult, offsetX, offsetY, delta)
              );
            }
            oldTarget = pickResult.target;
          } else if (oldTarget) {
            bubblingEvent(
              oldTarget,
              packageEvent(
                'pointerout',
                {
                  target: oldTarget
                },
                offsetX,
                offsetY
              )
            );
            oldTarget = undefined;
          }
        })
      );
    });
  }

  disable() {
    this._listenedEvents.forEach((eveType) => {
      const handler = (this as any)[makeHandlerName(eveType)];
      handler && vendor.removeEventListener(this._container, eveType, handler);
    });
    this._listenedEvents = [];
  }

  dispose() {
    this.disable();
  }
}
