import * as THREE from 'three'
import { Water } from 'three/addons/objects/Water.js'
import { createOpenSeaTexture } from './shoreline.ts'

const openSea = createOpenSeaTexture()

const fragmentShader = `
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
  uniform vec3 islandSkyColor;

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
    float detail = dot(paint, vec3(0.3, 0.4, 0.3));

    float floorDepth = islandLinearDepth(texture2D(islandSceneDepth, gl_FragCoord.xy / islandViewport).r);
    float surfaceDepth = islandLinearDepth(gl_FragCoord.z);
    float depth = max(floorDepth - surfaceDepth, 0.0) * distance / surfaceDepth * abs(eyeDirection.y);
    float shore = texture2D(islandShore, vec2((position.x - islandShoreBounds.x) / islandShoreBounds.z, (islandShoreBounds.y - position.y) / islandShoreBounds.w)).r;

    float shadow = getShadowMask();
    float daylight = 0.45 + 0.55 * clamp(sunDirection.y * 1.5, 0.0, 1.0);
    vec3 light = mix(vec3(dot(sunColor, vec3(0.2126, 0.7152, 0.0722))), sunColor, 0.35) * daylight * (0.55 + 0.45 * shadow);
    float shallow = max(1.0 - smoothstep(0.0, 3.0, depth), 1.0 - smoothstep(0.0, 9.0, shore));
    vec3 deepColor = mix(vec3(0.02, 0.16, 0.3), vec3(0.04, 0.27, 0.42), smoothstep(0.35, 0.8, swell.b));
    vec3 shallowColor = vec3(0.1, 0.52, 0.55);
    vec3 water = mix(deepColor, shallowColor, shallow) * (0.82 + 0.36 * detail);
    vec3 color = water * light;

    vec3 normal = normalize(vec3(warp.x * 4.0, 1.0, warp.y * 4.0) + vec3(paint.r - 0.5, 0.0, paint.g - 0.5) * 0.06);
    float facing = max(dot(eyeDirection, normal), 0.0);
    float fresnel = 0.02 + 0.98 * pow(1.0 - facing, 5.0);
    vec3 reflected = reflect(-eyeDirection, normal);
    vec3 sky = mix(islandSkyColor * vec3(0.85, 0.95, 1.05), islandSkyColor * vec3(0.6, 0.78, 1.0), clamp(reflected.y * 1.5, 0.0, 1.0)) * daylight;
    color = mix(color, sky, clamp(fresnel, 0.0, 0.55));

    vec3 halfway = normalize(sunDirection + eyeDirection);
    float glint = pow(max(dot(normal, halfway), 0.0), 600.0) * smoothstep(0.55, 0.85, detail);
    color += sunColor * glint * 2.5 * shadow * (1.0 - smoothstep(40.0, 140.0, distance));

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
    color = mix(color, vec3(0.86, 0.93, 0.96) * light, max(rim, waves) * 0.85);

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
    textureWidth: 1,
    textureHeight: 1,
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
    islandSkyColor: { value: new THREE.Color(0xa8cddd) },
  })
  water.material.fragmentShader = fragmentShader
  water.onBeforeRender = (_renderer, _scene, camera) => {
    water.material.uniforms.eye.value.setFromMatrixPosition(camera.matrixWorld)
  }
  return water
}
