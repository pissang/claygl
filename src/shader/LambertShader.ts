import Shader from '../Shader.js';
import { lambertFragment, lambertVertex } from './source/lambert.glsl';
class LambertShader extends Shader<typeof lambertVertex, typeof lambertFragment> {
  constructor() {
    super(lambertVertex, lambertFragment);
  }
}

export default LambertShader;
