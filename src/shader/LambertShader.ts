import { importShared } from './shared';
import Shader from '../Shader.js';
import lambertEssl from './source/lambert.glsl.js';

importShared();
Shader.import(lambertEssl);

class LambertShader extends Shader {
  constructor() {
    super(Shader.source('clay.lambert.vertex'), Shader.source('clay.lambert.fragment'));
  }
}

export default LambertShader;
