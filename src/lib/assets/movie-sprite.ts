import * as THREE from 'three'
import type { AudioAction, CharacterMovieAction, VideoAction } from '../action-types'
import { engine } from '../engine'
import { getAudio } from './audio'
import { createNormalizedSprite } from './canvas-sprite'
import { getActionFileUrl } from './load'

export class MovieSprite {
  private constructor(
    private readonly _videoElement: HTMLVideoElement,
    private readonly _sprite: THREE.Sprite,
    private readonly _audio?: THREE.Audio<GainNode>,
  ) {}

  public static async createCharacterMovie(movie: CharacterMovieAction, z: number): Promise<MovieSprite> {
    return MovieSprite.create(movie.children[1], z, movie.children[0])
  }

  public static async create(video: VideoAction, z: number, audioAction?: AudioAction): Promise<MovieSprite> {
    const audioPromise = audioAction != null ? await getAudio(engine.audioListener, audioAction) : undefined
    const videoElement = document.createElement('video')
    const loadPromise = new Promise<void>(resolve => {
      videoElement.oncanplaythrough = () => {
        resolve()
      }
    })
    videoElement.src = getActionFileUrl(video)
    videoElement.load()
    const texture = new THREE.VideoTexture(videoElement)
    texture.colorSpace = THREE.SRGBColorSpace
    const [x, y, _] = video.location
    const { width, height } = video.dimensions
    const sprite = createNormalizedSprite(x, y, z, width, height)
    const map = new THREE.VideoTexture(videoElement)
    map.colorSpace = THREE.SRGBColorSpace
    sprite.material = new THREE.SpriteMaterial({ map })
    const audio = (await Promise.all([audioPromise, loadPromise]))[0]
    return new MovieSprite(videoElement, sprite, audio)
  }

  public play(scene: THREE.Scene): Promise<void> {
    scene.add(this._sprite)
    this._audio?.play()
    this._videoElement.play()
    return new Promise<void>(resolve => {
      this._videoElement.onended = () => {
        this._audio?.stop()
        resolve()
      }

      this._videoElement.onpause = () => {
        this._audio?.stop()
        resolve()
      }
    })
  }

  public removeFromParent = () => this._sprite.removeFromParent()
}
