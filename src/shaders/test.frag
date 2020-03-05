uniform sampler2D texturePosition;
uniform sampler2D textureVelocity;

varying vec2 vUv;

void main() {
    vec4 col = texture2D(textureVelocity, vec2(0.5));
    gl_FragColor = vec4(col.rgb, 1.0);
}