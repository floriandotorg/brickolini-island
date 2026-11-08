import { ShaderChunk } from 'three'

let installed = false

export const installContactHardening = (): void => {
  if (installed) {
    return
  }
  installed = true
  const source = ShaderChunk.shadowmap_pars_fragment
  const start = source.indexOf('\t\tfloat getShadow( sampler2DShadow')
  const end = source.indexOf('\n\t#elif defined( SHADOWMAP_TYPE_VSM )', start)
  if (start < 0 || end < 0) {
    throw new Error('Unsupported shadow shader for contact hardening')
  }
  ShaderChunk.shadowmap_pars_fragment = `${source.slice(0, start)}
    float getShadow(sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord) {
      vec3 coord = shadowCoord.xyz / shadowCoord.w;
      coord.z += shadowBias;
      if (any(lessThan(coord, vec3(0.0))) || any(greaterThan(coord, vec3(1.0)))) {
        return 1.0;
      }
      vec2 texel = 1.0 / shadowMapSize;
      float phi = interleavedGradientNoise(gl_FragCoord.xy) * PI2;
      float blockers = 0.0;
      float blockerDepth = 0.0;
      for (int n = 0; n < 8; ++n) {
        vec2 sampleUv = coord.xy + vogelDiskSample(n, 8, phi) * texel * 8.0;
        if (texture(shadowMap, vec3(sampleUv, coord.z - 0.0002)) < 0.5) {
          float low = max(coord.z - 0.1, 0.0);
          float high = coord.z;
          for (int step = 0; step < 8; ++step) {
            float middle = (low + high) * 0.5;
            if (texture(shadowMap, vec3(sampleUv, middle)) < 0.5) {
              high = middle;
            } else {
              low = middle;
            }
          }
          blockerDepth += (low + high) * 0.5;
          blockers += 1.0;
        }
      }
      if (blockers < 0.5) {
        return 1.0;
      }
      float separation = max(coord.z - blockerDepth / blockers, 0.0);
      float penumbra = clamp(separation * 180.0 * shadowRadius, 0.65, 10.0);
      float visibility = 0.0;
      for (int n = 0; n < 16; ++n) {
        visibility += texture(shadowMap, vec3(coord.xy + vogelDiskSample(n, 16, phi) * texel * penumbra, coord.z));
      }
      return mix(1.0, visibility / 16.0, shadowIntensity);
    }
${source.slice(end)}`
}
