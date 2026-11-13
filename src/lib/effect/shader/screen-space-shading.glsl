precision highp float;

uniform sampler2D tDepth;
uniform mat4 uProjection;
uniform mat4 uProjectionInverse;
uniform vec3 uContactDirection;
uniform bool uAmbientOcclusion;
uniform bool uContactShadows;
uniform vec2 uSize;

out vec4 outColor;

vec2 depthTexel;

vec3 viewPosition(vec2 sampleUv, float depth) {
  float reciprocalW = 1.0 / (uProjectionInverse[2][3] * (depth * 2.0 - 1.0) + uProjectionInverse[3][3]);
  vec2 plane = (sampleUv * 2.0 - 1.0) * vec2(uProjectionInverse[0][0], uProjectionInverse[1][1]) + uProjectionInverse[3].xy;
  return vec3(plane, -1.0) * reciprocalW;
}

vec3 surfaceNormal(vec2 sampleUv, vec3 center) {
  vec3 left = viewPosition(sampleUv - vec2(depthTexel.x, 0.0), texture(tDepth, sampleUv - vec2(depthTexel.x, 0.0)).r);
  vec3 right = viewPosition(sampleUv + vec2(depthTexel.x, 0.0), texture(tDepth, sampleUv + vec2(depthTexel.x, 0.0)).r);
  vec3 bottom = viewPosition(sampleUv - vec2(0.0, depthTexel.y), texture(tDepth, sampleUv - vec2(0.0, depthTexel.y)).r);
  vec3 top = viewPosition(sampleUv + vec2(0.0, depthTexel.y), texture(tDepth, sampleUv + vec2(0.0, depthTexel.y)).r);
  vec3 dx = abs(left.z - center.z) < abs(right.z - center.z) ? center - left : right - center;
  vec3 dy = abs(bottom.z - center.z) < abs(top.z - center.z) ? center - bottom : top - center;
  return normalize(cross(dx, dy));
}

float bayer(ivec2 pixel) {
  const int matrix[16] = int[16](0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5);
  return (float(matrix[(pixel.y & 3) * 4 + (pixel.x & 3)]) + 0.5) / 16.0;
}

float ambientVisibility(vec2 uv, vec3 position, vec3 normal, float sliceJitter, float stepJitter) {
  if (dot(normal, -position) < 0.0) {
    normal = -normal;
  }
  float radius = 1.2;
  float projectedRadius = min(radius * uProjection[1][1] * 0.5 / max(-position.z, 0.1), 0.05);
  vec2 aspect = vec2(depthTexel.x / depthTexel.y, 1.0);
  vec3 view = normalize(-position);
  float visibility = 0.0;
  for (int n = 0; n < 2; ++n) {
    float angle = (float(n) + sliceJitter) * 3.14159265 / 2.0;
    vec2 axis = vec2(cos(angle), sin(angle));
    vec3 sliceDirection = vec3(axis, 0.0);
    vec3 sliceNormal = normalize(cross(sliceDirection, view));
    vec3 projectedNormal = normal - sliceNormal * dot(normal, sliceNormal);
    float normalLength = length(projectedNormal);
    float normalAngle = acos(clamp(dot(projectedNormal / max(normalLength, 0.0001), view), -1.0, 1.0));
    normalAngle *= sign(dot(projectedNormal, sliceDirection));
    vec2 horizons = vec2(-1.0);
    for (int side = 0; side < 2; ++side) {
      float direction = side == 0 ? -1.0 : 1.0;
      for (int step = 1; step <= 6; ++step) {
        float fraction = (float(step) - stepJitter) / 6.0;
        vec2 sampleUv = uv + axis * aspect * direction * projectedRadius * fraction * fraction;
        if (any(lessThan(sampleUv, vec2(0.0))) || any(greaterThan(sampleUv, vec2(1.0)))) {
          continue;
        }
        float sampleDepth = texture(tDepth, sampleUv).r;
        vec3 delta = viewPosition(sampleUv, sampleDepth) - position;
        float distanceToSample = length(delta);
        if (sampleDepth < 0.999999 && distanceToSample > 0.025 && dot(delta, normal) > distanceToSample * 0.12) {
          float horizon = dot(delta / distanceToSample, view);
          horizons[side] = max(horizons[side], mix(-1.0, horizon, 1.0 - smoothstep(radius * 0.5, radius, distanceToSample)));
        }
      }
    }
    float h0 = normalAngle + max(-acos(clamp(horizons.x, -1.0, 1.0)) - normalAngle, -1.5707963);
    float h1 = normalAngle + min(acos(clamp(horizons.y, -1.0, 1.0)) - normalAngle, 1.5707963);
    visibility += normalLength * 0.25 * (cos(normalAngle) + 2.0 * h0 * sin(normalAngle) - cos(2.0 * h0 - normalAngle) + cos(normalAngle) + 2.0 * h1 * sin(normalAngle) - cos(2.0 * h1 - normalAngle));
  }
  return clamp(visibility / 2.0, 0.25, 1.0);
}

float sunContactVisibility(vec3 position, vec3 normal, float stepJitter) {
  if (dot(normal, uContactDirection) <= 0.0) {
    return 1.0;
  }
  float visibility = 1.0;
  for (int n = 1; n <= 8; ++n) {
    float distance = (float(n) - stepJitter) * 0.0675;
    vec3 samplePosition = position + normal * 0.025 + uContactDirection * distance;
    vec4 clip = uProjection * vec4(samplePosition, 1.0);
    vec2 sampleUv = clip.xy / clip.w * 0.5 + 0.5;
    if (clip.w <= 0.0 || any(lessThan(sampleUv, vec2(0.0))) || any(greaterThan(sampleUv, vec2(1.0)))) {
      break;
    }
    float depth = texture(tDepth, sampleUv).r;
    float separation = viewPosition(sampleUv, depth).z - samplePosition.z;
    if (depth < 0.999999 && separation > 0.015 && separation < 0.16) {
      float border = smoothstep(0.0, 0.04, min(min(sampleUv.x, sampleUv.y), min(1.0 - sampleUv.x, 1.0 - sampleUv.y)));
      visibility = min(visibility, 1.0 - 0.45 * border * (1.0 - distance / 0.6));
    }
  }
  return visibility;
}

void main() {
  depthTexel = 1.0 / vec2(textureSize(tDepth, 0));
  vec2 uv = gl_FragCoord.xy / uSize;
  float depth = texture(tDepth, uv).r;
  if (depth >= 0.999999) {
    outColor = vec4(1.0, 1.0, 60000.0, 1.0);
    return;
  }
  vec3 position = viewPosition(uv, depth);
  vec3 normal = surfaceNormal(uv, position);
  ivec2 pixel = ivec2(gl_FragCoord.xy);
  float sliceJitter = bayer(pixel);
  float stepJitter = bayer(pixel.yx + ivec2(1, 2));
  float ambient = uAmbientOcclusion ? ambientVisibility(uv, position, normal, sliceJitter, stepJitter) : 1.0;
  float contact = uContactShadows ? sunContactVisibility(position, normal, stepJitter) : 1.0;
  outColor = vec4(ambient, contact, -position.z, 1.0);
}
