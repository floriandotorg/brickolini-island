import * as THREE from 'three'
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'

export const createBloom = (depth: THREE.DepthTexture): UnrealBloomPass => {
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.22, 0.55, 0.85)
  bloom.materialHighPassFilter.uniforms.worldDepth = { value: depth }
  bloom.materialHighPassFilter.fragmentShader = bloom.materialHighPassFilter.fragmentShader
    .replace('uniform sampler2D tDiffuse;', 'uniform sampler2D tDiffuse; uniform sampler2D worldDepth;')
    .replace('float v = luminance( texel.xyz );', 'texel.rgb = any(isnan(texel.rgb)) || any(isinf(texel.rgb)) ? vec3(0.0) : clamp(texel.rgb, 0.0, 64.0); float v = luminance(texel.xyz); texel.rgb /= 1.0 + v / 4.0; texel.rgb *= 1.0 - step(0.999999, texture2D(worldDepth, vUv).r);')
  return bloom
}
