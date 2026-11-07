#include <tonemapping_pars_fragment>

uniform sampler2D tWorldDepth;
uniform mat4 uProjectionInverse;
uniform mat4 uProjection;
uniform bool uAmbientOcclusion;
uniform bool uFilmic;

vec3 viewPosition(vec2 sampleUv, float depth) {
  vec4 position = uProjectionInverse * vec4(sampleUv * 2.0 - 1.0, depth * 2.0 - 1.0, 1.0);
  return position.xyz / position.w;
}

float ambientVisibility(vec3 position, vec3 normal) {
  if (dot(normal, -position) < 0.0) {
    normal = -normal;
  }
  float radius = 1.5;
  float projectedRadius = clamp(radius * uProjection[1][1] * 0.5 / max(-position.z, 0.1), texelSize.y * 2.0, 0.06);
  float occlusion = 0.0;
  for (int n = 0; n < 12; ++n) {
    float angle = float(n) * 2.39996323;
    float distanceScale = sqrt((float(n) + 0.5) / 12.0);
    vec2 offset = vec2(cos(angle) * texSize.y / texSize.x, sin(angle)) * projectedRadius * distanceScale;
    vec2 sampleUv = uv + offset;
    if (any(lessThan(sampleUv, vec2(0.0))) || any(greaterThan(sampleUv, vec2(1.0)))) {
      continue;
    }
    float depth = texture(tWorldDepth, sampleUv).r;
    if (depth >= 0.999999) {
      continue;
    }
    vec3 delta = viewPosition(sampleUv, depth) - position;
    float distanceToSample = length(delta);
    float horizon = max(dot(normal, delta / max(distanceToSample, 0.001)) - 0.12, 0.0);
    occlusion += horizon * (1.0 - smoothstep(0.0, radius, distanceToSample));
  }
  return clamp(1.0 - occlusion * 0.09, 0.65, 1.0);
}

void mainImage(const in vec4 inputColor, out vec4 outputColor) {
  outputColor = inputColor;
  float depth = texture(tWorldDepth, uv).r;
  vec3 position = viewPosition(uv, depth);
  vec3 normal = normalize(cross(dFdx(position), dFdy(position)));
  if (uAmbientOcclusion && depth < 0.999999 && inputColor.a > 0.0) {
    outputColor.rgb *= ambientVisibility(position, normal);
  }
  if (uFilmic) {
    outputColor.rgb = ACESFilmicToneMapping(outputColor.rgb);
  }
}
