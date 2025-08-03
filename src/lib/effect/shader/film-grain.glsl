const float amount = 0.05;
const bool colored = true;

const float permTexUnit = 1.0 / 256.0;

// Half perm texture texel-size
const float permTexUnitHalf = 0.5 / 256.0;

vec4 rand(in vec2 tc) {
  float noise = sin(dot(tc + vec2(uTime), vec2(12.9898, 78.233))) * 43758.5453;

  float noiseR = fract(noise) * 2.0 - 1.0;
  float noiseG = fract(noise * 1.2154) * 2.0 - 1.0;
  float noiseB = fract(noise * 1.3453) * 2.0 - 1.0;
  float noiseA = fract(noise * 1.3647) * 2.0 - 1.0;
  return vec4(noiseR, noiseG, noiseB, noiseA);
}

float fade(in float t) { return t * t * t * (t * (t * 6.0 - 15.0) + 10.0); }

float pnoise3D(in vec3 p) {

  // Integer partscaled so +1 moves permTexUnit texel
  vec3 pi = permTexUnit * floor(p) + permTexUnitHalf;

  // and offset 1/2 texel to sample texel centers
  // Fractional part for interpolation
  vec3 pf = fract(p);

  // Noise contributions from (x=0y=0)z=0 and z=1
  float perm00 = rand(pi.xy).a;
  vec3 grad000 = rand(vec2(perm00, pi.z)).rgb * 4.0 - 1.0;
  float n000 = dot(grad000, pf);
  vec3 grad001 = rand(vec2(perm00, pi.z + permTexUnit)).rgb * 4.0 - 1.0;
  float n001 = dot(grad001, pf - vec3(0.0, 0.0, 1.0));

  // Noise contributions from (x=0y=1)z=0 and z=1
  float perm01 = rand(pi.xy + vec2(0.0, permTexUnit)).a;
  vec3 grad010 = rand(vec2(perm01, pi.z)).rgb * 4.0 - 1.0;
  float n010 = dot(grad010, pf - vec3(0.0, 1.0, 0.0));
  vec3 grad011 = rand(vec2(perm01, pi.z + permTexUnit)).rgb * 4.0 - 1.0;
  float n011 = dot(grad011, pf - vec3(0.0, 1.0, 1.0));

  // Noise contributions from (x=1y=0)z=0 and z=1
  float perm10 = rand(pi.xy + vec2(permTexUnit, 0.0)).a;
  vec3 grad100 = rand(vec2(perm10, pi.z)).rgb * 4.0 - 1.0;
  float n100 = dot(grad100, pf - vec3(1.0, 0.0, 0.0));
  vec3 grad101 = rand(vec2(perm10, pi.z + permTexUnit)).rgb * 4.0 - 1.0;
  float n101 = dot(grad101, pf - vec3(1.0, 0.0, 1.0));

  // Noise contributions from (x=1y=1)z=0 and z=1
  float perm11 = rand(pi.xy + vec2(permTexUnit, permTexUnit)).a;
  vec3 grad110 = rand(vec2(perm11, pi.z)).rgb * 4.0 - 1.0;
  float n110 = dot(grad110, pf - vec3(1.0, 1.0, 0.0));
  vec3 grad111 = rand(vec2(perm11, pi.z + permTexUnit)).rgb * 4.0 - 1.0;
  float n111 = dot(grad111, pf - vec3(1.0, 1.0, 1.0));

  // Blend contributions along x
  vec4 n_x = mix(vec4(n000, n001, n010, n011), vec4(n100, n101, n110, n111),
                 fade(pf.x));

  // Blend contributions along y
  vec2 n_xy = mix(n_x.xy, n_x.zw, fade(pf.y));

  // Blend contributions along z
  float n_xyz = mix(n_xy.x, n_xy.y, fade(pf.z));

  return n_xyz;
}

vec3 blendSoftlight(vec3 base, vec3 blend) {
  return mix(sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend),
             base - (1.0 - 2.0 * blend) * base * (1.0 - base),
             step(0.5, blend));
}

void mainImage(const in vec4 inputColor, out vec4 outputColor) {
  float timer = mod(uTime, 10000.0) / 10000.0;
  vec3 noise = vec3(pnoise3D(vec3(uv * texSize, timer + 0.0)));
  if (colored) {
    noise.g = pnoise3D(vec3(uv * texSize, timer + 1.0));
    noise.b = pnoise3D(vec3(uv * texSize, timer + 2.0)) * 0.6;
  }
  float lum = luminance(inputColor.rgb);
  float grainStrength = amount * (1.0 - smoothstep(0.0, 1.0, lum));
  vec3 noiseColor = noise * grainStrength + 0.5;
  outputColor = vec4(blendSoftlight(inputColor.rgb, noiseColor), inputColor.a);
}
