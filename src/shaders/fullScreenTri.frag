precision highp float;
uniform sampler2D uScene;
uniform vec2 uResolution;
uniform float uTime;
// uniform vec2 mousePos;

float map(float value, float min1, float max1, float min2, float max2) {
  return min2 + (value - min1) * (max2 - min2) / (max1 - min1);
}

void main() {
    vec2 uv = gl_FragCoord.xy / uResolution.xy;
    vec4 color = vec4(0.0);

    float distToEdge = 1.0 - smoothstep(0.0, 0.1, uv.x);
    distToEdge += smoothstep(0.9, 1.0, uv.x);
    distToEdge += 1.0 - smoothstep(0.0, 0.1, uv.y);
    distToEdge += smoothstep(0.9, 1.0, uv.y);

    vec4 color1 = texture2D(uScene, uv + (0.002 * distToEdge));
    vec4 color2 = texture2D(uScene, uv - (0.004 * distToEdge));
    vec4 color3 = texture2D(uScene, uv + (0.006 * distToEdge));

    gl_FragColor = vec4(color1.r, color2.g, color3.b, 1.0);
    // gl_FragColor = vec4(distToEdge, distToEdge, distToEdge, 1.0);
}