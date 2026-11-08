const float amount = 0.05;
const float permTexUnit = 1.0 / 256.0;
const float permTexUnitHalf = 0.5 / 256.0;

vec4 rand(in vec2 tc) {
  float noise = sin(dot(tc + vec2(uTime), vec2(12.9898, 78.233))) * 43758.5453;
  return vec4(fract(noise), fract(noise * 1.2154), fract(noise * 1.3453), fract(noise * 1.3647)) * 2.0 - 1.0;
}

float fade(in float t) {
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

struct GrainColumn {
  vec3 lower;
  vec3 upper;
};

GrainColumn grainColumn(vec2 delta, vec3 layers, vec3 fraction, float permutation) {
  GrainColumn result;
  vec3 gradient = rand(vec2(permutation, layers.x)).rgb * 4.0 - 1.0;
  result.lower.x = dot(gradient, vec3(delta, fraction.x));
  gradient = rand(vec2(permutation, layers.x + permTexUnit)).rgb * 4.0 - 1.0;
  result.upper.x = dot(gradient, vec3(delta, fraction.x - 1.0));
  if (layers.y != layers.x + permTexUnit) {
    gradient = rand(vec2(permutation, layers.y)).rgb * 4.0 - 1.0;
  }
  result.lower.y = dot(gradient, vec3(delta, fraction.y));
  gradient = rand(vec2(permutation, layers.y + permTexUnit)).rgb * 4.0 - 1.0;
  result.upper.y = dot(gradient, vec3(delta, fraction.y - 1.0));
  if (layers.z != layers.y + permTexUnit) {
    gradient = rand(vec2(permutation, layers.z)).rgb * 4.0 - 1.0;
  }
  result.lower.z = dot(gradient, vec3(delta, fraction.z));
  gradient = rand(vec2(permutation, layers.z + permTexUnit)).rgb * 4.0 - 1.0;
  result.upper.z = dot(gradient, vec3(delta, fraction.z - 1.0));
  return result;
}

vec3 coloredGrain(vec2 pixel, float timer) {
  vec2 lattice = permTexUnit * floor(pixel) + permTexUnitHalf;
  vec2 fraction = fract(pixel);
  vec3 time = vec3(timer) + vec3(0.0, 1.0, 2.0);
  vec3 layers = permTexUnit * floor(time) + permTexUnitHalf;
  vec3 timeFraction = fract(time);
  GrainColumn c00 = grainColumn(fraction, layers, timeFraction, rand(lattice).a);
  GrainColumn c01 = grainColumn(fraction - vec2(0.0, 1.0), layers, timeFraction, rand(lattice + vec2(0.0, permTexUnit)).a);
  GrainColumn c10 = grainColumn(fraction - vec2(1.0, 0.0), layers, timeFraction, rand(lattice + vec2(permTexUnit, 0.0)).a);
  GrainColumn c11 = grainColumn(fraction - vec2(1.0, 1.0), layers, timeFraction, rand(lattice + vec2(permTexUnit, permTexUnit)).a);
  float fx = fade(fraction.x);
  float fy = fade(fraction.y);
  vec3 lower = mix(mix(c00.lower, c10.lower, fx), mix(c01.lower, c11.lower, fx), fy);
  vec3 upper = mix(mix(c00.upper, c10.upper, fx), mix(c01.upper, c11.upper, fx), fy);
  return mix(lower, upper, vec3(fade(timeFraction.x), fade(timeFraction.y), fade(timeFraction.z)));
}

vec3 blendSoftlight(vec3 base, vec3 blend) {
  return mix(sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend),
             base - (1.0 - 2.0 * blend) * base * (1.0 - base),
             step(0.5, blend));
}

void mainImage(const in vec4 inputColor, out vec4 outputColor) {
  float timer = mod(uTime, 10000.0) / 10000.0;
  vec3 noise = coloredGrain(uv * texSize, timer);
  noise.b *= 0.6;
  float lum = luminance(inputColor.rgb);
  float grainStrength = amount * (1.0 - smoothstep(0.0, 1.0, lum));
  vec3 noiseColor = noise * grainStrength + 0.5;
  outputColor = vec4(blendSoftlight(inputColor.rgb, noiseColor), inputColor.a);
}
