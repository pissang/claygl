@export buildin.compositor.gaussian_blur_h

uniform sampler2D texture; // the texture with the scene you want to blur
varying vec2 v_Texcoord;
 
uniform float blurSize : 2.0; 
uniform float textureWidth : 512.0;

void main(void)
{
   vec4 sum = vec4(0.0);
   float blurOffset = blurSize / textureWidth;
   // blur in y (vertical)
   // take nine samples, with the distance blurSize between them
   sum += texture2D(texture, vec2(max(v_Texcoord.x - 4.0*blurOffset, 0.0), v_Texcoord.y)) * 0.05;
   sum += texture2D(texture, vec2(max(v_Texcoord.x - 3.0*blurOffset, 0.0), v_Texcoord.y)) * 0.09;
   sum += texture2D(texture, vec2(max(v_Texcoord.x - 2.0*blurOffset, 0.0), v_Texcoord.y)) * 0.12;
   sum += texture2D(texture, vec2(max(v_Texcoord.x - blurOffset, 0.0), v_Texcoord.y)) * 0.15;
   sum += texture2D(texture, vec2(v_Texcoord.x, v_Texcoord.y)) * 0.18;
   sum += texture2D(texture, vec2(min(v_Texcoord.x + blurOffset, 1.0), v_Texcoord.y)) * 0.15;
   sum += texture2D(texture, vec2(min(v_Texcoord.x + 2.0*blurOffset, 1.0), v_Texcoord.y)) * 0.12;
   sum += texture2D(texture, vec2(min(v_Texcoord.x + 3.0*blurOffset, 1.0), v_Texcoord.y)) * 0.09;
   sum += texture2D(texture, vec2(min(v_Texcoord.x + 4.0*blurOffset, 1.0), v_Texcoord.y)) * 0.05;
 
   gl_FragColor = sum;
}

@end

@export buildin.compositor.gaussian_blur_v

uniform sampler2D texture;
varying vec2 v_Texcoord;
 
uniform float blurSize : 2.0;
uniform float textureHeight : 512.0;
 
void main(void)
{
   vec4 sum = vec4(0.0);
   float blurOffset = blurSize / textureHeight;
   // blur in y (vertical)
   // take nine samples, with the distance blurSize between them
   sum += texture2D(texture, vec2(v_Texcoord.x, max(v_Texcoord.y - 4.0*blurOffset, 0.0))) * 0.05;
   sum += texture2D(texture, vec2(v_Texcoord.x, max(v_Texcoord.y - 3.0*blurOffset, 0.0))) * 0.09;
   sum += texture2D(texture, vec2(v_Texcoord.x, max(v_Texcoord.y - 2.0*blurOffset, 0.0))) * 0.12;
   sum += texture2D(texture, vec2(v_Texcoord.x, max(v_Texcoord.y - blurOffset, 0.0))) * 0.15;
   sum += texture2D(texture, vec2(v_Texcoord.x, v_Texcoord.y)) * 0.18;
   sum += texture2D(texture, vec2(v_Texcoord.x, min(v_Texcoord.y + blurOffset, 1.0))) * 0.15;
   sum += texture2D(texture, vec2(v_Texcoord.x, min(v_Texcoord.y + 2.0*blurOffset, 1.0))) * 0.12;
   sum += texture2D(texture, vec2(v_Texcoord.x, min(v_Texcoord.y + 3.0*blurOffset, 1.0))) * 0.09;
   sum += texture2D(texture, vec2(v_Texcoord.x, min(v_Texcoord.y + 4.0*blurOffset, 1.0))) * 0.05;
 
   gl_FragColor = sum;
}

@end

@export buildin.compositor.box_blur

uniform sampler2D texture;
varying vec2 v_Texcoord;

uniform float blurSize : 3.0;
uniform vec2 textureSize : [512.0, 512.0];

void main(void){

   vec4 tex = texture2D(texture, v_Texcoord);
   vec2 offset = blurSize / textureSize;

   tex += texture2D(texture, v_Texcoord + vec2(offset.x, 0.0) );
   tex += texture2D(texture, v_Texcoord + vec2(offset.x, offset.y) );
   tex += texture2D(texture, v_Texcoord + vec2(-offset.x, offset.y) );
   tex += texture2D(texture, v_Texcoord + vec2(0.0, offset.y) );
   tex += texture2D(texture, v_Texcoord + vec2(-offset.x, 0.0) );
   tex += texture2D(texture, v_Texcoord + vec2(-offset.x, -offset.y) );
   tex += texture2D(texture, v_Texcoord + vec2(offset.x, -offset.y) );
   tex += texture2D(texture, v_Texcoord + vec2(0.0, -offset.y) );

   tex /= 9.0;

   gl_FragColor = tex;
}

@end

// http://www.slideshare.net/DICEStudio/five-rendering-ideas-from-battlefield-3-need-for-speed-the-run
@export buildin.compositor.hexagonal_blur_mrt_1

// MRT in chrome
// https://www.khronos.org/registry/webgl/sdk/tests/conformance/extensions/webgl-draw-buffers.html
#extension GL_EXT_draw_buffers : require

uniform sampler2D texture;
varying vec2 v_Texcoord;

uniform float blurSize : 2.0;

uniform vec2 textureSize : [512.0, 512.0];

void main(void){
   vec2 offset = blurSize / textureSize;

   vec4 color = vec4(0.0);
   // Top
   for(int i = 0; i < 10; i++){
      color += 1.0/10.0 * texture2D(texture, v_Texcoord + vec2(0.0, offset.y * float(i)) );
   }
   gl_FragData[0] = color;
   vec4 color2 = vec4(0.0);
   // Down left
   for(int i = 0; i < 10; i++){
      color2 += 1.0/10.0 * texture2D(texture, v_Texcoord - vec2(offset.x * float(i), offset.y * float(i)) );
   }
   gl_FragData[1] = (color + color2) / 2.0;
}

@end

@export buildin.compositor.hexagonal_blur_mrt_2

uniform sampler2D texture0;
uniform sampler2D texture1;

varying vec2 v_Texcoord;

uniform float blurSize : 2.0;

uniform vec2 textureSize : [512.0, 512.0];

void main(void){
   vec2 offset = blurSize / textureSize;

   vec4 color1 = vec4(0.0);
   // Down left
   for(int i = 0; i < 10; i++){
      color1 += 1.0/10.0 * texture2D(texture0, v_Texcoord - vec2(offset.x * float(i), offset.y * float(i)) );
   }
   vec4 color2 = vec4(0.0);
   // Down right
   for(int i = 0; i < 10; i++){
      color2 += 1.0/10.0 * texture2D(texture1, v_Texcoord + vec2(offset.x * float(i), -offset.y * float(i)) );
   }

   gl_FragColor = (color1 + color2) / 2.0;
}

@end


@export buildin.compositor.hexagonal_blur_1

#define KERNEL_SIZE 10

uniform sampler2D texture;
varying vec2 v_Texcoord;

uniform float blurSize : 1.0;

uniform vec2 textureSize : [512.0, 512.0];

void main(void){
   vec2 offset = blurSize / textureSize;

   vec4 color = vec4(0.0);
   float fKernelSize = float(KERNEL_SIZE);
   // Top
   for(int i = 0; i < KERNEL_SIZE; i++){
      color += 1.0 / fKernelSize * texture2D(texture, v_Texcoord + vec2(0.0, offset.y * float(i)) );
   }
   gl_FragColor = color;
}

@end

@export buildin.compositor.hexagonal_blur_2

#define KERNEL_SIZE 10

uniform sampler2D texture;
varying vec2 v_Texcoord;

uniform float blurSize : 1.0;

uniform vec2 textureSize : [512.0, 512.0];

void main(void){
   vec2 offset = blurSize / textureSize;
   offset.y /= 2.0;

   vec4 color = vec4(0.0);
   float fKernelSize = float(KERNEL_SIZE);
   // Down left
   for(int i = 0; i < KERNEL_SIZE; i++){
      color += 1.0/fKernelSize * texture2D(texture, v_Texcoord - vec2(offset.x * float(i), offset.y * float(i)) );
   }
   gl_FragColor = color;
}
@end

@export buildin.compositor.hexagonal_blur_3

#define KERNEL_SIZE 10

uniform sampler2D texture1;
uniform sampler2D texture2;

varying vec2 v_Texcoord;

uniform float blurSize : 1.0;

uniform vec2 textureSize : [512.0, 512.0];

void main(void){
   vec2 offset = blurSize / textureSize;
   offset.y /= 2.0;

   vec4 color1 = vec4(0.0);
   float fKernelSize = float(KERNEL_SIZE);
   // Down left
   for(int i = 0; i < KERNEL_SIZE; i++){
      color1 += 1.0/fKernelSize * texture2D(texture1, v_Texcoord - vec2(offset.x * float(i), offset.y * float(i)) );
   }
   vec4 color2 = vec4(0.0);
   // Down right
   for(int i = 0; i < KERNEL_SIZE; i++){
      color2 += 1.0/fKernelSize * texture2D(texture1, v_Texcoord + vec2(offset.x * float(i), -offset.y * float(i)) );
   }

   vec4 color3 = vec4(0.0);
   // Down right
   for(int i = 0; i < KERNEL_SIZE; i++){
      color3 += 1.0/fKernelSize * texture2D(texture2, v_Texcoord + vec2(offset.x * float(i), -offset.y * float(i)) );
   }

   gl_FragColor = (color1 + color2 + color3) / 3.0;
}

@end