import './shared';
import Shader from '../Shader.js';
import standardMREssl from './source/standard.glsl.js';

Shader.import(standardMREssl);

class StandardMRShader extends Shader {
  constructor() {
    super(Shader.source('clay.standardMR.vertex'), Shader.source('clay.standardMR.fragment'));
  }
}

export default StandardMRShader;