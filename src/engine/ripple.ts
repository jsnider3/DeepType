// Water ripple ("Enable Fx" option): each pixel row of the water is shifted
// horizontally by (sin(a1) + sin(a2)) * amp, with a1/a2 advancing over time and rows.

import { Filter, GlProgram } from 'pixi.js';

const vertex = `
in vec2 aPosition;
out vec2 vTextureCoord;
uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition(void) {
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
  return vec4(position, 0.0, 1.0);
}

void main(void) {
  gl_Position = filterVertexPosition();
  vTextureCoord = aPosition * (uOutputFrame.zw * uInputSize.zw);
}`;

const fragment = `
in vec2 vTextureCoord;
out vec4 finalColor;
uniform sampler2D uTexture;
uniform highp vec4 uInputSize; // must match the vertex shader's precision or linking fails
uniform float uT1;
uniform float uT2;
uniform float uAmp;
uniform float uPxPerUnit;

void main(void) {
  float row = floor(vTextureCoord.y * uInputSize.y / uPxPerUnit);
  // The original's sine table is sin(i / pi), indexed with (t + row) >> 3 and >> 2.
  float a1 = mod(floor((uT1 + row) / 8.0), 360.0) / 3.14159265;
  float a2 = mod(floor((uT2 + row) / 4.0), 360.0) / 3.14159265;
  float off = floor((sin(a1) + sin(a2)) * uAmp + 0.5) * uPxPerUnit;
  finalColor = texture(uTexture, vTextureCoord + vec2(off * uInputSize.z, 0.0));
}`;

export class RippleFilter extends Filter {
  private t = 0;
  private ampDir = 1;

  constructor() {
    super({
      glProgram: GlProgram.from({ vertex, fragment, name: 'water-ripple' }),
      resources: {
        rippleUniforms: {
          uT1: { value: 0, type: 'f32' },
          uT2: { value: 0, type: 'f32' },
          uAmp: { value: 4, type: 'f32' },
          uPxPerUnit: { value: 1, type: 'f32' },
        },
      },
    });
  }

  /** One 10 ms game tick: t1 every 2 ticks, t2 every 4, amp ping-pongs 4..5. */
  tick(pxPerUnit: number) {
    const u = this.resources.rippleUniforms.uniforms;
    this.t++;
    if (this.t % 2 === 0) {
      u.uT1 += 1;
      u.uAmp += 0.004 * this.ampDir;
      if (u.uAmp >= 5 || u.uAmp <= 4) this.ampDir = -this.ampDir;
    }
    if (this.t % 4 === 0) u.uT2 += 1;
    u.uPxPerUnit = pxPerUnit;
  }
}
