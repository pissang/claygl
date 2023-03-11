import { Light } from 'claygl';

export const RECT_AREA_LIGHT_TYPE = 'RECT_LIGHT';
class RectAreaLight extends Light {
  readonly type = RECT_AREA_LIGHT_TYPE;

  width = 1;
  height = 1;

  constructor() {
    super();
  }

  clone() {
    const light = super.clone();
    light.width = this.width;
    light.height = this.height;
    return light;
  }
}

export default RectAreaLight;
