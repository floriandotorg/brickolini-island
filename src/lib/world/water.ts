import * as THREE from 'three'
import { Water } from 'three/addons/objects/Water.js'
import { createOpenSeaTexture } from './shoreline.ts'

const openSea = createOpenSeaTexture()

const fragmentShader = `
  uniform sampler2D mirrorSampler;
  uniform float alpha;
  uniform float time;
  uniform vec3 sunColor;
  uniform vec3 sunDirection;
  uniform vec3 eye;
  uniform sampler2D islandWaterMap;
  uniform sampler2D islandSceneDepth;
  uniform vec2 islandViewport;
  uniform vec2 islandCameraRange;
  uniform sampler2D islandShore;
  uniform vec4 islandShoreBounds;

  varying vec4 mirrorCoord;
  varying vec4 worldPosition;

  #include <common>
  #include <packing>
  #include <bsdfs>
  #include <fog_pars_fragment>
  #include <logdepthbuf_pars_fragment>
  #include <lights_pars_begin>
  #include <shadowmap_pars_fragment>
  #include <shadowmask_pars_fragment>

  float islandLinearDepth(float value) {
    return islandCameraRange.x * islandCameraRange.y / (islandCameraRange.y - value * (islandCameraRange.y - islandCameraRange.x));
  }

  void main() {
    #include <logdepthbuf_fragment>
    vec3 worldToEye = eye - worldPosition.xyz;
    float distance = length(worldToEye);
    vec3 eyeDirection = worldToEye / distance;
    vec2 position = worldPosition.xz;

    vec3 swell = texture2D(islandWaterMap, position * 0.021 + vec2(time * 0.031, -time * 0.023)).rgb;
    vec2 warp = (swell.rg - vec2(0.3, 0.6)) * 0.05;
    vec3 paint = texture2D(islandWaterMap, position * 0.055 + vec2(-time * 0.017, time * 0.011) + warp).rgb;

    float floorDepth = islandLinearDepth(texture2D(islandSceneDepth, gl_FragCoord.xy / islandViewport).r);
    float surfaceDepth = islandLinearDepth(gl_FragCoord.z);
    float depth = max(floorDepth - surfaceDepth, 0.0) * distance / surfaceDepth * abs(eyeDirection.y);
    float shore = texture2D(islandShore, vec2((position.x - islandShoreBounds.x) / islandShoreBounds.z, (islandShoreBounds.y - position.y) / islandShoreBounds.w)).r;

    vec3 light = mix(vec3(dot(sunColor, vec3(0.2126, 0.7152, 0.0722))), sunColor, 0.35) * (0.45 + 0.55 * clamp(sunDirection.y * 1.5, 0.0, 1.0)) * getShadowMask();
    float shallow = max(1.0 - smoothstep(0.0, 2.5, depth), 1.0 - smoothstep(0.0, 7.0, shore));
    vec3 water = paint * mix(0.85, 1.0, shallow);
    water = mix(water, vec3(0.12, 0.72, 0.7) * (0.55 + paint.b * 0.5), shallow * 0.5);
    vec3 color = water * light;

    vec2 distortion = warp * 0.4 / (1.0 + distance * 0.02);
    vec3 reflection = min(texture2D(mirrorSampler, mirrorCoord.xy / mirrorCoord.w + distortion).rgb, vec3(4.0));
    float fresnel = 0.04 + 0.96 * pow(1.0 - max(eyeDirection.y, 0.0), 5.0);
    color = mix(color, reflection, fresnel * 0.1);

    float highlight = smoothstep(0.7, 0.92, dot(paint, vec3(0.3, 0.4, 0.3)));
    vec3 normal = normalize(vec3(warp.x * 3.0, 1.0, warp.y * 3.0));
    float specular = pow(max(dot(reflect(-sunDirection, normal), eyeDirection), 0.0), 60.0);
    color += sunColor * smoothstep(0.35, 0.5, specular * highlight) * 1.6 * (1.0 - smoothstep(40.0, 120.0, distance));

    float fade = 1.0 - smoothstep(60.0, 140.0, distance);
    float wobble = (texture2D(islandWaterMap, position * 0.013 + vec2(time * 0.004)).g - 0.6) * 1.4;
    float surge = time * 0.75 + wobble;
    float depthRim = 1.0 - smoothstep(0.06, 0.1 + paint.r * 0.12, depth);
    float shoreRim = 1.0 - smoothstep(0.25, 0.55 + paint.r * 0.4 + 0.15 * sin(6.2832 * surge), shore);
    float rim = max(depthRim, shoreRim) * (0.5 + 0.5 * fade);
    float crest = fract(shore * 0.55 + surge);
    float patches = mix(0.35, 1.0, smoothstep(0.3, 0.6, swell.b));
    float waves = smoothstep(0.75, 0.79, crest) * (1.0 - smoothstep(0.8, 1.0, crest)) * patches;
    waves *= smoothstep(0.3, 0.9, shore) * (1.0 - smoothstep(1.5, 5.5, shore)) * fade;
    color = mix(color, vec3(0.92, 0.97, 1.0) * light * 1.1, max(rim, waves) * 0.9);

    gl_FragColor = vec4(color, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
    #include <fog_fragment>
  }
`

export const createIslandWater = (geometry: THREE.BufferGeometry, map: THREE.Texture): Water => {
  const normals = geometry.getAttribute('normal')
  const normal = new THREE.Vector3(normals.getX(0), normals.getY(0), normals.getZ(0)).normalize()
  const rotation = new THREE.Quaternion().setFromUnitVectors(normal, new THREE.Vector3(0, 0, 1))
  const surface = geometry.clone().applyQuaternion(rotation)
  const water = new Water(surface, {
    textureWidth: 512,
    textureHeight: 512,
    sunColor: 0xfff4df,
    sunDirection: new THREE.Vector3(-1, 2, -1).normalize(),
    fog: true,
  })
  water.quaternion.copy(rotation).invert()
  Object.assign(water.material.uniforms, {
    islandWaterMap: { value: map },
    islandSceneDepth: { value: null },
    islandViewport: { value: new THREE.Vector2(1, 1) },
    islandCameraRange: { value: new THREE.Vector2(0.1, 1000) },
    islandShore: { value: openSea },
    islandShoreBounds: { value: new THREE.Vector4(0, 0, 1, 1) },
  })
  water.material.fragmentShader = fragmentShader
  return water
}
