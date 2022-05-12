import { Renderer, FullscreenQuadPass, Shader, registerBuiltinCompositeShaders } from 'claygl';
import { parseRGBE } from '../src/util/hdr';

registerBuiltinCompositeShaders(Shader);

fetch('assets/textures/hdr/pisa.hdr')
  .then((response) => response.arrayBuffer())
  .then((data) => {
    const texture = parseRGBE(data);

    const renderer = new Renderer({
      canvas: document.getElementById('Main') as HTMLCanvasElement
    });
    const pass = new FullscreenQuadPass(Shader.source('clay.compositor.output'));
    pass.setUniform('texture', texture);
    pass.render(renderer);
  });
