import * as rayPicking from '../picking/rayPicking';
import vendor from '../core/vendor';
import type Renderer from '../Renderer';
import type ClayNode from '../Node';
import Scene from '../Scene';
import { assign } from '../core/util';

// TODO Use pointer event
const EVENT_NAMES = [
  'click',
  'dblclick',
  'mouseover',
  'mouseout',
  'mousemove',
  'mousedown',
  'mouseup',
  'touchstart',
  'touchend',
  'touchmove',
  'mousewheel'
] as const;

type ClayEventType =
  | 'click'
  | 'dblclick'
  | 'mousewheel'
  | 'pointerdown'
  | 'pointermove'
  | 'pointerup'
  | 'pointerover'
  | 'pointerout';

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
  constructor(container: HTMLElement, renderer: Renderer, scene: Scene) {
    this._container = container;
    this._renderer = renderer;
    this._scene = scene;
  }

  init() {
    const dom = this._container;
    const scene = this._scene;
    const renderer = this._renderer;
    const mainCamera = scene.getMainCamera();

    let oldTarget: ClayNode | undefined;
    EVENT_NAMES.forEach((domEveType) => {
      vendor.addEventListener(
        dom,
        domEveType,
        ((this as any)[makeHandlerName(domEveType)] = (e: MouseEvent | TouchEvent) => {
          if (!mainCamera) {
            // Not have camera yet.
            return;
          }
          e.preventDefault && e.preventDefault();

          const box = dom.getBoundingClientRect();
          let offsetX, offsetY;
          let eveType: ClayEventType;

          if (domEveType.indexOf('touch') >= 0) {
            const touch =
              domEveType !== 'touchend'
                ? (e as TouchEvent).targetTouches[0]
                : (e as TouchEvent).changedTouches[0];

            offsetX = touch.clientX - box.left;
            offsetY = touch.clientY - box.top;
          } else {
            offsetX = (e as MouseEvent).clientX - box.left;
            offsetY = (e as MouseEvent).clientY - box.top;
          }

          const pickResult = rayPicking.pick(renderer, scene, mainCamera, offsetX, offsetY);

          let delta;
          if (domEveType === 'mousewheel') {
            delta = (e as any).wheelDelta ? (e as any).wheelDelta / 120 : -(e.detail || 0) / 3;
          }

          if (pickResult) {
            // Just ignore silent element.
            if (pickResult.target.silent) {
              return;
            }

            if (domEveType === 'mousemove' || domEveType === 'touchmove') {
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
              eveType =
                domEveType === 'mousedown' || domEveType === 'touchstart'
                  ? 'pointerdown'
                  : domEveType === 'mouseup' || domEveType === 'touchend'
                  ? 'pointerup'
                  : domEveType === 'mouseover'
                  ? 'pointerover'
                  : domEveType === 'mouseout'
                  ? 'pointerout'
                  : domEveType;
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

  dispose() {
    EVENT_NAMES.forEach((eveType) => {
      const handler = (this as any)[makeHandlerName(eveType)];
      handler && vendor.removeEventListener(this._container, eveType, handler);
    });
  }
}
