import { ShaderChunk } from 'three'

let installed = false

export const installSmoothShadowFilter = (): void => {
  if (installed) {
    return
  }
  installed = true
  const source = ShaderChunk.shadowmap_pars_fragment
  const start = source.indexOf('\t\tfloat getShadow( sampler2DShadow')
  const end = source.indexOf('\n\t#elif defined( SHADOWMAP_TYPE_VSM )', start)
  if (start < 0 || end < 0) {
    throw new Error('Unsupported shadow shader for smooth shadow filtering')
  }
  ShaderChunk.shadowmap_pars_fragment = `${source.slice(0, start)}
    float getShadow(sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord) {
      vec3 coord = shadowCoord.xyz / shadowCoord.w;
      coord.z += shadowBias;
      if (any(lessThan(coord, vec3(0.0))) || any(greaterThan(coord, vec3(1.0)))) {
        return 1.0;
      }
      vec2 spacing = max(shadowRadius * 0.5, 1.0) / shadowMapSize;
      float visibility = 0.0;
      for (int y = 0; y < 4; ++y) {
        for (int x = 0; x < 4; ++x) {
          visibility += texture(shadowMap, vec3(coord.xy + (vec2(x, y) - 1.5) * spacing, coord.z));
        }
      }
      return mix(1.0, visibility / 16.0, shadowIntensity);
    }
${source.slice(end)}`
}
