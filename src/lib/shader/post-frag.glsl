uniform sampler2D tDiffuse;
uniform float uMosaicProgress;
uniform float uTileSize;
uniform float uVibrance;
uniform float uSaturation;
uniform float uContrast;
uniform float uBrightness;
uniform float uDistortion;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

vec3 adjustVibrance(vec3 color, float vibrance) {
  float luminance = dot(color, vec3(0.299, 0.587, 0.114));
  float saturation = distance(color, vec3(luminance));
  vec3 gray = vec3(luminance);
  return mix(gray, color, 1.0 + vibrance * (1.0 - saturation));
}

vec3 adjustSaturation(vec3 color, float saturation) {
  float luminance = dot(color, vec3(0.299, 0.587, 0.114));
  return mix(vec3(luminance), color, saturation);
}

vec3 adjustContrast(vec3 color, float contrast) {
  return (color - 0.5) * contrast + 0.5;
}

vec3 enhanceColor(vec3 color) {
  color = adjustVibrance(color, uVibrance);
  color = adjustSaturation(color, uSaturation);
  color = adjustContrast(color, uContrast);
  color = color * uBrightness;
  return clamp(color, 0.0, 1.0);
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
      color = enhanceColor(color);

      gl_FragColor = linearToOutputTexel(vec4(color, 1.0));
      return;
    }
  }

  vec2 uv = gl_FragCoord.xy / texSize;
  vec2 direction = uv - 0.5;
  float distortion = length(direction) * uDistortion;

  vec2 redUV = uv + direction * distortion;
  vec2 greenUV = uv;
  vec2 blueUV = uv - direction * distortion;

  float r = texture2D(tDiffuse, redUV).r;
  float g = texture2D(tDiffuse, greenUV).g;
  float b = texture2D(tDiffuse, blueUV).b;

  vec3 color = vec3(r, g, b);
  color = enhanceColor(color);
  gl_FragColor = linearToOutputTexel(vec4(color, 1.0));
}
