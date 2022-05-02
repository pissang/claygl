import './shared';
import Shader from '../Shader.js';
import skyboxEssl from './source/skybox.glsl.js';

Shader.import(skyboxEssl);

class SkyboxShader extends Shader {
  constructor() {
    super(Shader.source('clay.skybox.vertex'), Shader.source('clay.skybox.fragment'));
  }
}

export default SkyboxShader;