

#pragma glslify: snoise2 = require(glsl-noise/simplex/2d)


// varying vec2 vUv;
// uniform float screenWidth;
// uniform float screenHeight;
uniform float delta;
uniform float feed;
uniform float kill;
uniform vec2 brush;
uniform float diffRateA;
uniform float diffRateB;
uniform float time;
// uniform float brushSize;

/*
    you have access to:
    vec2 resolution;
    sampler2D texture1;
    sampler2D texture2
*/

vec2 texel = vec2(1.0/resolution.x, 1.0/resolution.y);
float step_x = 1.0/resolution.x;
float step_y = 1.0/resolution.y;

float map(float value, float min1, float max1, float min2, float max2) {
  return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

void main()
{
    vec2 vUv = gl_FragCoord.xy / resolution.xy;

    // if(brush.x < -5.0)
    // {
    //     gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    //     return;
    // }
    


    float brushSize = map(snoise2(vec2(time * 0.00005)), -1.0, 1.0, 5.0, 2000.0);
    
    vec2 uv = texture2D(texture1, vUv).rg;
    vec2 uv0 = texture2D(texture1, vUv+vec2(-step_x, 0.0)).rg;
    vec2 uv1 = texture2D(texture1, vUv+vec2(step_x, 0.0)).rg;
    vec2 uv2 = texture2D(texture1, vUv+vec2(0.0, -step_y)).rg;
    vec2 uv3 = texture2D(texture1, vUv+vec2(0.0, step_y)).rg;
    
    vec2 lapl = (uv0 + uv1 + uv2 + uv3 - 4.0*uv);
    // float du = /*0.00002*/0.2097*lapl.r - uv.r*uv.g*uv.g + feed*(1.0 - uv.r);
    // float dv = /*0.00001*/0.105*lapl.g + uv.r*uv.g*uv.g - (feed+kill)*uv.g;
    float du = diffRateA*lapl.r - uv.r*uv.g*uv.g + feed*(1.0 - uv.r);
    float dv = diffRateB*lapl.g + uv.r*uv.g*uv.g - (feed+kill)*uv.g;
    vec2 dst = uv + delta*vec2(du, dv);
    
    if(brush.x > 0.0)
    {
        vec2 diff = (vUv - brush)/texel;
        float dist = dot(diff, diff);
        if(dist < brushSize)
            dst.g = 0.9;
    }
    
    gl_FragColor = vec4(dst.r, dst.g, 0.0, 1.0);
}