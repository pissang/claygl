import { Renderer, FullscreenQuadPass, Shader } from 'claygl';
import { outputTextureFragment } from 'claygl/shaders';
import { parseRGBE } from '../src/util/hdr';

fetch('assets/textures/hdr/pisa.hdr')
  .then((response) => response.arrayBuffer())
  .then((data) => {
    const texture = parseRGBE(data);

    const renderer = new Renderer({
      canvas: document.getElementById('Main') as HTMLCanvasElement
    });
    const pass = new FullscreenQuadPass(outputTextureFragment);
    pass.material.set('texture', texture);
    pass.render(renderer);
  });
