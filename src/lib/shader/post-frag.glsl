uniform sampler2D tDiffuse;
uniform float uMosaicProgress;
uniform float uTileSize;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 texSize = vec2(textureSize(tDiffuse, 0));

  if (uMosaicProgress > 0.0) {
    vec2 fragCoord = gl_FragCoord.xy;
    vec2 mosaicCoord = floor(fragCoord / uTileSize) * uTileSize;
    mosaicCoord.y += uTileSize - 1.0;

    if (hash(mosaicCoord) < uMosaicProgress) {
      vec2 uv = mosaicCoord / texSize;
      vec3 color = texture2D(tDiffuse, uv).rgb;

      gl_FragColor = linearToOutputTexel(vec4(color, 1.0));
      return;
    }
  }

  vec2 uv = gl_FragCoord.xy / texSize;
  gl_FragColor = linearToOutputTexel(texture2D(tDiffuse, uv));
}
