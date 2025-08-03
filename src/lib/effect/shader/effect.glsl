uniform sampler2D tDiffuse;
uniform float uTime;

out vec4 fragColor;

vec2 texSize;
vec2 texelSize;
vec2 uv;

/// EFFECTS

void main() {
  texSize = vec2(textureSize(tDiffuse, 0));
  texelSize = 1.0 / texSize;
  uv = gl_FragCoord.xy / texSize;

  vec4 inputColor = texture(tDiffuse, uv);
  vec4 outputColor = inputColor;

  /// PIPELINE

  fragColor = outputColor;
}
