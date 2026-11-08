import * as THREE from 'three'
import { Water } from 'three/addons/objects/Water.js'
import { createWaterNormalPixels } from '../graphics.ts'

let waterNormals: THREE.DataTexture | null = null

const getWaterNormals = (): THREE.DataTexture => {
  if (waterNormals == null) {
    const size = 128
    waterNormals = new THREE.DataTexture(createWaterNormalPixels(size), size, size)
    waterNormals.wrapS = THREE.RepeatWrapping
    waterNormals.wrapT = THREE.RepeatWrapping
    waterNormals.magFilter = THREE.LinearFilter
    waterNormals.minFilter = THREE.LinearMipmapLinearFilter
    waterNormals.generateMipmaps = true
    waterNormals.needsUpdate = true
  }
  return waterNormals
}

export const createIslandWater = (geometry: THREE.BufferGeometry): Water => {
  const normals = geometry.getAttribute('normal')
  const normal = new THREE.Vector3(normals.getX(0), normals.getY(0), normals.getZ(0)).normalize()
  const rotation = new THREE.Quaternion().setFromUnitVectors(normal, new THREE.Vector3(0, 0, 1))
  const surface = geometry.clone().applyQuaternion(rotation)
  const water = new Water(surface, {
    textureWidth: 512,
    textureHeight: 512,
    waterNormals: getWaterNormals(),
    distortionScale: 0.45,
    waterColor: 0x247c98,
    sunColor: 0xfff4df,
    sunDirection: new THREE.Vector3(-1, 2, -1).normalize(),
    fog: true,
  })
  water.quaternion.copy(rotation).invert()
  water.material.uniforms.size.value = 2
  Object.assign(water.material.uniforms, {
    islandSceneDepth: { value: null },
    islandViewport: { value: new THREE.Vector2(1, 1) },
    islandCameraRange: { value: new THREE.Vector2(0.1, 1000) },
  })
  water.material.fragmentShader = water.material.fragmentShader
    .replace(
      'uniform float alpha;',
      `
    uniform float alpha;
    uniform sampler2D islandSceneDepth;
    uniform vec2 islandViewport;
    uniform vec2 islandCameraRange;
    float islandLinearDepth(float value) {
      float near = islandCameraRange.x;
      float far = islandCameraRange.y;
      return near * far / (far - value * (far - near));
    }
  `,
    )
    .replace(
      'gl_FragColor = vec4( outgoingLight, alpha );',
      `
    float floorDepth = islandLinearDepth(texture2D(islandSceneDepth, gl_FragCoord.xy / islandViewport).r);
    float surfaceDepth = islandLinearDepth(gl_FragCoord.z);
    float waterDepth = max(floorDepth - surfaceDepth, 0.0);
    float depthBand = smoothstep(0.3, 2.0, waterDepth) * 0.45 + smoothstep(3.0, 10.0, waterDepth) * 0.55;
    vec3 comicWater = mix(vec3(0.075, 0.64, 0.61), vec3(0.018, 0.17, 0.34), depthBand);
    float wave = sin(worldPosition.x * 0.7 + worldPosition.z * 0.5 + time * 1.4);
    float shore = 1.0 - smoothstep(0.1, 0.7 + wave * 0.08, waterDepth);
    float foam = shore * (0.6 + 0.4 * smoothstep(0.25, 0.65, sin(waterDepth * 14.0 - time * 1.6 + wave)));
    vec3 stylized = mix(comicWater * (0.8 + diffuseLight * 0.2), outgoingLight, 0.22);
    stylized = mix(stylized, vec3(0.72, 0.92, 0.86), foam * 0.6);
    gl_FragColor = vec4(stylized, alpha);
  `,
    )
  return water
}
