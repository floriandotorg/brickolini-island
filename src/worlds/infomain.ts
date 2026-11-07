import * as THREE from 'three'
import * as InfoActions from '../actions/infomain'
import {
  _InfoMain,
  avo901in_RunAnim,
  avo902in_RunAnim,
  avo903in_RunAnim,
  avo904in_RunAnim,
  avo905in_RunAnim,
  Boat_A_Bitmap,
  Cop_A_Bitmap,
  FrameHot_Bitmap,
  Gas_A_Bitmap,
  Info_A_Bitmap,
  iic001in_RunAnim,
  iic007in_PlayWav,
  iic019in_RunAnim,
  iic020in_RunAnim,
  iic021in_RunAnim,
  iic022in_RunAnim,
  iic023in_RunAnim,
  iic024in_RunAnim,
  iic025in_RunAnim,
  iic026in_RunAnim,
  iic027in_RunAnim,
  iic029in_RunAnim,
  iic032in_RunAnim,
  iic043in_RunAnim,
  iic046in_RunAnim,
  iica28in_RunAnim,
  iicb28in_RunAnim,
  iicc28in_RunAnim,
  iicx17in_RunAnim,
  Laura_All_Movie,
  Laura_Ctl,
  Laura_Up_Bitmap,
  LauraHot_Bitmap,
  Mama_All_Movie,
  Mama_Ctl,
  Mama_Up_Bitmap,
  MamaHot_Bitmap,
  Med_A_Bitmap,
  Nick_All_Movie,
  Nick_Ctl,
  Nick_Up_Bitmap,
  NickHot_Bitmap,
  Papa_All_Movie,
  Papa_Ctl,
  Papa_Up_Bitmap,
  PapaHot_Bitmap,
  Pepper_All_Movie,
  Pepper_Ctl,
  Pepper_Up_Bitmap,
  PepperHot_Bitmap,
  Pizza_A_Bitmap,
  Race_A_Bitmap,
  tic089in_RunAnim,
  tic092in_RunAnim,
} from '../actions/infomain'
import { BadEnd_Movie, GoodEnd_Movie } from '../actions/intro'
import { InformationCenter_Music } from '../actions/jukebox'
import { BookWig_Flic } from '../actions/sndanim'
import type { AudioAction, CharacterMovieAction, ImageAction, RunAnimationAction } from '../lib/action-types'
import type { Audio } from '../lib/assets/audio'
import { createImageSprite, setImageSprite } from '../lib/assets/canvas-sprite'
import { MovieSprite } from '../lib/assets/movie-sprite'
import type { SpawnLocation } from '../lib/assets/spawn-location'
import { setCursor } from '../lib/cursor.ts'
import type { Composer } from '../lib/effect/composer'
import { engine, type NormalizedMouseEvent, type NormalizedRect, normalizePoint, normalizeRect, type Timeout } from '../lib/engine'
import { act23Tips, bricksterDialogues, leaveDialogues, mapAnnouncements, returnDialogues } from '../lib/infocenter-content'
import { infoEntry, infoReturnRule } from '../lib/infocenter-rules'
import { radio } from '../lib/radio'
import { type PlayerCharacter, PlayerCharacters } from '../lib/save-game'
import { act1State, helicopterState, infocenterState, vehicleReturn } from '../lib/session-state.ts'
import { getSettings } from '../lib/settings'
import { discardCachedWorlds, getPreviousWorldName, rememberPreviousWorld, restorePreviousWorld, switchToPreviousWorld, switchWorld } from '../lib/switch-world'
import { Building } from '../lib/world/building'
import { Plants } from '../lib/world/plants'
import { World, type WorldSpawn } from '../lib/world/world'
import { Name } from './regbook'

const ANIMATIONS = [iic019in_RunAnim, iic020in_RunAnim, iic021in_RunAnim, iic022in_RunAnim, iic023in_RunAnim, iic024in_RunAnim, iic025in_RunAnim, iic026in_RunAnim, iic027in_RunAnim, iica28in_RunAnim, iicb28in_RunAnim, iicc28in_RunAnim, iic029in_RunAnim, iic032in_RunAnim]

enum CharacterMovieState {
  idle = 0,
  playing = 1,
  cancelled = 2,
}

type Destination = {
  sprite: THREE.Sprite
  normalizedRect: NormalizedRect
  destination: WorldSpawn | null
}

const createDestination = (image: ImageAction, parent: THREE.Scene, location: SpawnLocation | null): Destination => {
  const sprite = createImageSprite(image)
  sprite.visible = false
  parent.add(sprite)
  const normalizedRect = normalizeRect(image.location[0], image.location[1], image.dimensions.width, image.dimensions.height)
  const destination = location != null ? { spawn: location } : null
  return { sprite, normalizedRect, destination }
}

type NoSelectedCharacter = {
  readonly state: 'idle'
}
const IdleState: NoSelectedCharacter = { state: 'idle' }

type SelectedCharacter = {
  readonly state: 'selected'
  readonly character: PlayerCharacter
}

type DraggingCharacter = {
  readonly state: 'dragging'
  readonly character: PlayerCharacter
  readonly sprite: THREE.Sprite
}

type SelectedCharacterStates = NoSelectedCharacter | SelectedCharacter | DraggingCharacter

const getSelectionAnimation = (character: PlayerCharacter): RunAnimationAction => {
  switch (character) {
    case 'mama':
      return avo902in_RunAnim
    case 'papa':
      return avo903in_RunAnim
    case 'pepper':
      return avo901in_RunAnim
    case 'nick':
      return avo904in_RunAnim
    case 'laura':
      return avo905in_RunAnim
  }
}

export class InfoMain extends World {
  private readonly _building = new Building()

  private readonly _characterFrame: THREE.Sprite
  private readonly _name: Name
  private _welcomeTimeout: Timeout | null = null
  private _characterMovieState: CharacterMovieState = CharacterMovieState.idle
  private _characterMovie: [MovieSprite, MovieSprite, MovieSprite] | null = null
  private readonly _destinations: Destination[]
  private readonly _characterControls: Record<PlayerCharacter, string>
  private _selectedCharacter: SelectedCharacterStates = IdleState
  private _bookWigMovie: MovieSprite | null = null
  private readonly _bookWigInterval = engine.createInterval(3000)

  private _firstVisit = true
  private _scriptGeneration = 0
  private _speechGeneration = 0
  private _speech: Audio | null = null
  private _speechEnd: ((completed: boolean) => void) | null = null
  private _speechDuck: symbol | null = null
  private _mapAnnouncement = false
  private readonly _dialogueIndices = new Map<string, number>()
  private _redBackground: THREE.Sprite | null = null
  private _bigInfoBlink: Timeout | null = null
  private _blinkDown = false
  private _bookPresentation: MovieSprite | null = null
  private _bookTimeout: Timeout | null = null
  private _bookResolve: (() => void) | null = null

  private nextDialogue = <T>(name: string, entries: readonly T[]): T => {
    const index = this._dialogueIndices.get(name) ?? 0
    this._dialogueIndices.set(name, (index + 1) % entries.length)
    return entries[index]
  }

  private stopSpeech = (completed = false): void => {
    ++this._speechGeneration
    const audio = this._speech
    const resolve = this._speechEnd
    this._speech = null
    this._speechEnd = null
    audio?.stop()
    if (this._speechDuck != null) {
      engine.raiseBackgroundMusic(this._speechDuck)
      this._speechDuck = null
    }
    resolve?.(completed)
    this._mapAnnouncement = false
  }

  private stopCurrentAction = (): void => {
    ++this._scriptGeneration
    this._bookPresentation?.stop()
    this._bookResolve?.()
    this._bookResolve = null
    this._bookTimeout = null
    this.stopSpeech()
    this.skipAllRunningAnimations(true)
    this._welcomeTimeout = null
    this._bigInfoBlink = null
    this._building.getControl('BigInfo_Ctl')?.draw()
  }

  private playLine = (action: AudioAction): Promise<boolean> => {
    this.stopCurrentAction()
    const generation = this._speechGeneration
    this._speechDuck = engine.lowerBackgroundMusic()
    return new Promise(resolve => {
      this._speechEnd = resolve
      void engine
        .playAudio(action, 'speech')
        .then(audio => {
          if (generation !== this._speechGeneration || engine.currentWorld !== this) {
            audio.stop()
            return
          }
          this._speech = audio
          audio.onEnded = () => this.stopSpeech(true)
        })
        .catch(() => {
          if (generation === this._speechGeneration) {
            this.stopSpeech()
          }
        })
    })
  }

  private startWelcome = (action: RunAnimationAction, startMusic = false): void => {
    infocenterState.state = 'welcomeAnimation'
    const promise = this.playInfomainAnimation(action)
    const generation = this._scriptGeneration
    if (action.id === InfoActions.iicx26in_RunAnim.id) {
      this._bigInfoBlink = engine.createTimeout(4400)
    }
    void promise.then(() => {
      if (generation !== this._scriptGeneration || engine.currentWorld !== this) {
        return
      }
      infocenterState.state = 'notRegistered'
      this._bigInfoBlink = null
      this._building.getControl('BigInfo_Ctl')?.draw()
      if (startMusic) {
        void engine.switchBackgroundMusic(InformationCenter_Music)
      }
      if (engine.currentSaveGame.isUnloaded) {
        this._welcomeTimeout = engine.createTimeout(25_000)
      }
    })
  }

  private applyActMode = (): void => {
    const normal = engine.currentSaveGame.act === 1
    if (this._redBackground != null) {
      this._redBackground.visible = !normal
    }
    for (const name of [...mapAnnouncements.keys(), ...Object.values(this._characterControls), 'Radio_Ctl']) {
      const control = this._building.getControl(name)
      if (control != null) {
        control.visible = normal
      }
    }
    if (!normal) {
      this._characterFrame.visible = false
    }
  }

  private returnToArea = async (): Promise<void> => {
    const save = engine.currentSaveGame
    const rule = infoReturnRule(save.act, getPreviousWorldName(), !save.isUnloaded, save.playerUnsafe != null)
    if (rule === 'none') {
      return
    }
    if (rule === 'register') {
      infocenterState.state = 'notRegistered'
      void this.playLine(iic007in_PlayWav)
      return
    }
    radio.stop()
    infocenterState.state = 'selectedCharacterAndDestination'
    engine.input.disable()
    engine.input.allowSpaceWhileDisabled = true
    const completed = await this.playLine(this.nextDialogue(`leave${save.act}`, leaveDialogues[save.act]))
    if (!completed || engine.currentWorld !== this) {
      return
    }
    if (save.act === 2) {
      await switchWorld('act2')
    } else if (vehicleReturn.type != null) {
      await switchWorld({ spawn: 'infocenterExited' })
    } else {
      await switchToPreviousWorld()
    }
  }

  private openRegistration = async (): Promise<void> => {
    radio.stop()
    rememberPreviousWorld()
    engine.currentSaveGame.savedPreviousArea = getPreviousWorldName()
    infocenterState.state = 'selectedSave'
    engine.input.disable()
    const action = engine.currentSaveGame.act === 1 ? InfoActions.GoTo_RegBook : InfoActions.GoTo_RegBook_Red
    const generation = this._scriptGeneration
    const movie = await MovieSprite.create(action.children[1], -0.2)
    if (generation !== this._scriptGeneration || engine.currentWorld !== this) {
      return
    }
    const still = createImageSprite(action.children[0])
    still.position.z = -0.21
    this._building.scene.add(still)
    this._bookPresentation = movie
    await Promise.all([
      movie.play(this._building.scene),
      new Promise<void>(resolve => {
        this._bookTimeout = engine.createTimeout(action.children[1].duration)
        this._bookResolve = resolve
      }),
    ])
    this._bookTimeout = null
    this._bookResolve = null
    still.removeFromParent()
    movie.removeFromParent()
    this._bookPresentation = null
    if (generation === this._scriptGeneration && engine.currentWorld === this) {
      void switchWorld('regbook')
    }
  }

  constructor() {
    super('infomain')
    this._characterFrame = createImageSprite(FrameHot_Bitmap)
    this._building.scene.add(this._characterFrame)
    this._characterFrame.visible = false
    this._name = new Name(this._building.scene, 223, 45, 29)
    this._destinations = [
      createDestination(Info_A_Bitmap, this._building.scene, null),
      createDestination(Boat_A_Bitmap, this._building.scene, 'jetraceExterior'),
      createDestination(Race_A_Bitmap, this._building.scene, 'carraceExterior'),
      createDestination(Pizza_A_Bitmap, this._building.scene, 'pizzeriaExterior'),
      createDestination(Gas_A_Bitmap, this._building.scene, 'garageExterior'),
      createDestination(Med_A_Bitmap, this._building.scene, 'hospitalExterior'),
      createDestination(Cop_A_Bitmap, this._building.scene, 'policeExterior'),
    ]
    this._characterControls = {
      mama: Mama_Ctl.name,
      papa: Papa_Ctl.name,
      pepper: Pepper_Ctl.name,
      nick: Nick_Ctl.name,
      laura: Laura_Ctl.name,
    }
  }

  private playInfomainAnimation(action: RunAnimationAction): Promise<void> {
    this.stopCurrentAction()
    return this.playAnimation(action)
  }

  private async playCharacterMovie(characterMovie: { children: readonly [CharacterMovieAction, CharacterMovieAction, CharacterMovieAction] }, selectionAnimation: RunAnimationAction): Promise<void> {
    const isCancelled = (): boolean => this._characterMovieState === CharacterMovieState.cancelled
    const play = async (movie: MovieSprite): Promise<void> => {
      if (this._characterMovieState !== CharacterMovieState.cancelled) {
        await movie.play(this._building.scene)
      }
    }

    if (this._characterMovieState === CharacterMovieState.playing) {
      return
    }
    this.skipAllRunningAnimations()
    this._welcomeTimeout = null
    this._characterMovieState = CharacterMovieState.playing
    engine.input.disable()
    engine.input.allowSpaceWhileDisabled = true
    engine.input.buttonDownActsAsSpace = true
    setCursor('none')
    const promises = [MovieSprite.createCharacterMovie(characterMovie.children[0], -0.252), MovieSprite.createCharacterMovie(characterMovie.children[1], -0.251), MovieSprite.createCharacterMovie(characterMovie.children[2], -0.25)]
    const [start, movie, end] = await Promise.all(promises)
    this._characterMovie = [start, movie, end]
    engine.pauseBackgroundMusic()
    await play(start)
    await play(movie)
    start.removeFromParent()
    movie.removeFromParent()
    await play(end)
    end.removeFromParent()
    engine.resumeBackgroundMusic()
    const cancelled = isCancelled()
    this._characterMovieState = CharacterMovieState.idle
    this._characterMovie = null
    if (engine.currentWorld === this) {
      engine.input.buttonDownActsAsSpace = false
      engine.input.enable()
      setCursor('arrow')
    }
    if (!cancelled && engine.currentWorld === this) {
      void this.playInfomainAnimation(selectionAnimation)
    }
  }

  private placeCharacterFrame(): void {
    if (engine.currentSaveGame.act !== 1) {
      this._characterFrame.visible = false
      return
    }
    const character = engine.currentSaveGame.playerUnsafe
    if (character == null) {
      this._characterFrame.visible = false
      return
    }
    const control = (() => {
      switch (character) {
        case 'mama':
          return Mama_Up_Bitmap
        case 'papa':
          return Papa_Up_Bitmap
        case 'pepper':
          return Pepper_Up_Bitmap
        case 'nick':
          return Nick_Up_Bitmap
        case 'laura':
          return Laura_Up_Bitmap
      }
    })()
    const [normalizedX, normalizedY] = normalizePoint(control.location[0], control.location[1])
    this._characterFrame.position.x = normalizedX + this._characterFrame.scale.x / 2
    this._characterFrame.position.y = normalizedY - this._characterFrame.scale.y / 2
    this._characterFrame.visible = true
  }

  public override async init(): Promise<void> {
    await super.init()

    await this._building.init({
      world: this,
      startUpAction: _InfoMain,
      noLights: true,
    })

    this._redBackground = createImageSprite(InfoActions.BackgroundRed_Bitmap)
    this._redBackground.position.z = -0.99
    this._redBackground.visible = false
    this._building.scene.add(this._redBackground)
    this._building.onRadioToggle = () => {
      if (this._mapAnnouncement || this._characterMovieState === CharacterMovieState.playing) {
        this.stopCurrentAction()
      }
    }
    this._building.onButtonClicked = buttonName => {
      this.stopCurrentAction()
      const announcement = mapAnnouncements.get(buttonName)
      if (announcement != null && engine.currentSaveGame.act === 1) {
        radio.stop()
        void this.playLine(announcement)
        this._mapAnnouncement = true
        return true
      }
      switch (buttonName) {
        case 'Door_Ctl':
          this.escape()
          return true
        case 'LeftArrow_Ctl':
        case 'RightArrow_Ctl':
          radio.stop()
          infocenterState.state = 'exitingToIsland'
          if (engine.currentSaveGame.act === 1) {
            void switchWorld(buttonName === 'LeftArrow_Ctl' ? 'elevbott' : 'infoscor')
          } else {
            void this.playLine(this.nextDialogue('brickster', bricksterDialogues))
          }
          return true
        case 'Book_Ctl':
          void this.openRegistration()
          return true
        case 'BigInfo_Ctl':
          void this.returnToArea()
          return true
        default:
          if (engine.currentSaveGame.act === 1) {
            for (const character of PlayerCharacters) {
              if (this._characterControls[character] === buttonName) {
                this._characterFrame.visible = false
                this._selectedCharacter = { state: 'selected', character }
                return true
              }
            }
          }
      }
      return false
    }

    const leftPointLight = new THREE.PointLight(0xffffff, 140)
    leftPointLight.position.set(7, 4, 4.5)
    this.scene.add(leftPointLight)

    const rightPointLight = new THREE.PointLight(0xffffff, 140)
    rightPointLight.position.set(-4, 4, 4.5)
    this.scene.add(rightPointLight)

    const centerPointLight = new THREE.PointLight(0xffffff, 80, 0, 5)
    centerPointLight.position.set(1.5, -4, 1)
    this.scene.add(centerPointLight)

    if (getSettings().graphics.shadows) {
      leftPointLight.castShadow = true
      leftPointLight.shadow.radius = 1.5
      rightPointLight.castShadow = true
      rightPointLight.shadow.radius = 1.5
      centerPointLight.castShadow = true
      centerPointLight.shadow.radius = 1.5
    }

    this.scene.add(await Plants.place(this, Plants.World.IMAIN))

    ;(await this.getCharacter('infoman')).onClicked = () => {
      if (infocenterState.state === 'selectedCharacterAndDestination' || infocenterState.state === 'exiting') {
        return true
      }
      const entries: readonly RunAnimationAction[] = engine.currentSaveGame.act === 1 ? ANIMATIONS : act23Tips
      void this.playInfomainAnimation(this.nextDialogue(`tips${engine.currentSaveGame.act}`, entries))
      this.hideQueryBricks()
      return true
    }

    const red = this.findRoi('2x4red')
    const green = this.findRoi('2x4grn')
    if (red != null) {
      this.addClickListener(red, async () => {
        if (infocenterState.state !== 'exitQueried') {
          return false
        }
        infocenterState.state = 'notRegistered'
        super.skipAllRunningAnimations(true)
        this.hideQueryBricks()
        void this.playAnimation(iicb28in_RunAnim)
        return true
      })
    }
    if (green != null) {
      this.addClickListener(green, async () => {
        if (infocenterState.state !== 'exitQueried') {
          return false
        }
        infocenterState.state = 'exiting'
        if (!engine.currentSaveGame.isUnloaded) {
          engine.storeSaveGames()
        }
        engine.input.disable()
        engine.input.allowSpaceWhileDisabled = true
        super.skipAllRunningAnimations(true)
        await this.playAnimation(iic046in_RunAnim)
        void switchWorld('credits')
        return true
      })
    }

    this._bookWigMovie = await MovieSprite.create(BookWig_Flic, -0.3)
    this._bookWigMovie.visible = false
    this._bookWigMovie.hideAfterFinish = true
    this._bookWigMovie.parent = this._building.scene
  }

  public override activate(composer: Composer, ending: 'bad' | 'good' | null = null): void {
    this._building.activate(composer)
    super.activate(composer)
    this.stopCurrentAction()
    const state = infocenterState.state
    if (state === 'selectedSave') {
      restorePreviousWorld()
    }
    const pad = Math.floor((7 - engine.currentSaveGame.name.length) / 2)
    this._name.name = engine.currentSaveGame.name.padStart(pad + engine.currentSaveGame.name.length, ' ')
    this.placeCharacterFrame()
    this.applyActMode()
    this.hideQueryBricks()
    this._firstVisit = this._firstVisit && state === 'newState'
    const entry = infoEntry(engine.currentSaveGame.act, state, this._firstVisit)
    this._firstVisit = false
    if (entry === 'exitQuery' && ending === null) {
      void engine.switchBackgroundMusic(InformationCenter_Music)
      void this.playInfomainAnimation(iic043in_RunAnim)
      return
    }
    if (ending !== null) {
      discardCachedWorlds('infomain')
      const save = engine.currentSaveGame
      save.act = 1
      save.player = 'pepper'
      save.savedPreviousArea = null
      act1State.value = 'none'
      helicopterState.status = 0
      const plants = save.plants
      if (plants != null) {
        save.plants = plants.map(plant => ({ ...plant, counter: -1 }))
      }
      const buildings = save.buildings
      if (buildings != null) {
        save.buildings = { ...buildings, entries: buildings.entries.map(building => ({ ...building, counter: -1 })) }
      }
      this.placeCharacterFrame()
      this.applyActMode()
      infocenterState.state = 'playCutscene'
      engine.stopBackgroundMusic()
      engine.playCutscene(ending === 'bad' ? BadEnd_Movie : GoodEnd_Movie).then(() => this.startWelcome(ending === 'bad' ? tic092in_RunAnim : tic089in_RunAnim))
    } else {
      const act = engine.currentSaveGame.act
      const action = entry === 'firstWelcome' ? iic001in_RunAnim : entry === 'saveSelected' ? InfoActions.iicx18in_RunAnim : entry === 'bookBack' ? iicx17in_RunAnim : this.nextDialogue(`return${act}`, returnDialogues[act])
      if (entry === 'resumeAct') {
        infocenterState.state = 'selectedCharacterAndDestination'
        engine.input.disable()
        engine.input.allowSpaceWhileDisabled = true
        const promise = this.playInfomainAnimation(action)
        const generation = this._scriptGeneration
        void promise.then(() => {
          if (generation === this._scriptGeneration && engine.currentWorld === this) {
            void (act === 2 ? switchWorld('act2') : switchToPreviousWorld())
          }
        })
      } else {
        if (entry !== 'firstWelcome') {
          void engine.switchBackgroundMusic(InformationCenter_Music)
        }
        this.startWelcome(action, entry === 'firstWelcome')
      }
    }
  }

  private hideQueryBricks = (): void => {
    for (const name of ['2x4red', '2x4grn']) {
      const roi = this.findRoi(name)
      if (roi != null) {
        roi.visible = false
      }
    }
  }

  public override escape(): boolean {
    if (this._characterMovieState === CharacterMovieState.playing) {
      this.skipAllRunningAnimations()
    }
    if (infocenterState.state !== 'exitQueried') {
      radio.stop()
      this.stopCurrentAction()
      super.skipAllRunningAnimations(true)
      this._welcomeTimeout = null
      infocenterState.state = 'exitQueried'
      void this.playAnimation(iic043in_RunAnim)
    }
    return false
  }

  public override deactivate(): void {
    this.stopCurrentAction()
    this._bookPresentation?.stop()
    this._bookWigMovie?.stop()
    if (infocenterState.state === 'exitQueried') {
      infocenterState.state = 'newState'
    }
    this._welcomeTimeout = null
    super.deactivate()
  }

  public override async pointerDown(event: NormalizedMouseEvent): Promise<void> {
    if (this._building.pointerDown(event.normalizedX, event.normalizedY)) {
      this._welcomeTimeout = null
      return
    }
    await super.pointerDown(event)
  }

  public override pointerUp(event: NormalizedMouseEvent): void {
    this._building.pointerUp()
    if (this._selectedCharacter.state === 'selected' || this._selectedCharacter.state === 'dragging') {
      const character = this._selectedCharacter.character
      const control = this._building.getControl(this._characterControls[character])
      if (control?.test(event.normalizedX, event.normalizedY)) {
        radio.stop()
        engine.currentSaveGame.player = character
        this.placeCharacterFrame()
        infocenterState.state = 'notRegistered'
        const movie = character === 'mama' ? Mama_All_Movie : character === 'papa' ? Papa_All_Movie : character === 'nick' ? Nick_All_Movie : character === 'laura' ? Laura_All_Movie : Pepper_All_Movie
        void this.playCharacterMovie(movie, getSelectionAnimation(character))
      } else {
        const destination = this._destinations.find(destination => destination.normalizedRect.inside(event.normalizedX, event.normalizedY))
        if (destination != null) {
          if (destination.destination != null && engine.currentSaveGame.isUnloaded) {
            infocenterState.state = 'notRegistered'
            void this.playLine(iic007in_PlayWav)
          } else {
            engine.currentSaveGame.player = character
            this.placeCharacterFrame()
            const leaving = destination.destination != null
            infocenterState.state = leaving ? 'selectedCharacterAndDestination' : 'notRegistered'
            if (leaving) {
              engine.input.disable()
              engine.input.allowSpaceWhileDisabled = true
            }
            const promise = this.playInfomainAnimation(getSelectionAnimation(character))
            const generation = this._scriptGeneration
            void promise.then(() => {
              if (generation === this._scriptGeneration && engine.currentWorld === this && destination.destination != null) {
                void switchWorld(destination.destination)
              }
            })
          }
        }
      }
    }
    for (const destination of this._destinations) {
      destination.sprite.visible = false
    }
    if (this._selectedCharacter.state === 'dragging') {
      this._selectedCharacter.sprite.removeFromParent()
    }
    this._selectedCharacter = IdleState
  }

  public override pointerMove(event: NormalizedMouseEvent): void {
    if (this._selectedCharacter.state === 'selected') {
      const image = (() => {
        switch (this._selectedCharacter.character) {
          case 'mama':
            return MamaHot_Bitmap
          case 'papa':
            return PapaHot_Bitmap
          case 'pepper':
            return PepperHot_Bitmap
          case 'nick':
            return NickHot_Bitmap
          case 'laura':
            return LauraHot_Bitmap
        }
      })()
      const sprite = createImageSprite(image)
      this._building.scene.add(sprite)
      this._selectedCharacter = { state: 'dragging', character: this._selectedCharacter.character, sprite }
    }
    if (this._selectedCharacter.state === 'dragging') {
      this._selectedCharacter.sprite.position.set(event.normalizedX + this._selectedCharacter.sprite.scale.x / 2, event.normalizedY - this._selectedCharacter.sprite.scale.y / 2, -0.2)
      let matched = false
      for (const dest of this._destinations) {
        dest.sprite.visible = !matched && dest.normalizedRect.inside(event.normalizedX, event.normalizedY)
        matched ||= dest.sprite.visible
      }
    }
  }

  protected override handleSkipKey(): void {
    this.stopSpeech(true)
    if (infocenterState.state !== 'introCancelled' && infocenterState.state !== 'selectedSave') {
      this.skipAllRunningAnimations()
      if (infocenterState.state !== 'selectedCharacterAndDestination' && infocenterState.state !== 'exiting' && infocenterState.state !== 'exitQueried' && infocenterState.state !== 'welcomeAnimation') {
        infocenterState.state = 'notRegistered'
      }
    }
  }

  public override skipAllRunningAnimations(force = false): void {
    super.skipAllRunningAnimations(force)
    this._characterMovieState = CharacterMovieState.cancelled
    if (this._characterMovie != null) {
      this._characterMovie[0].stop()
      this._characterMovie[1].stop()
      this._characterMovie[2].stop()
    }
  }

  public override update(delta: number): void {
    super.update(delta)
    if (this._bookTimeout?.isExpired) {
      this._bookResolve?.()
      this._bookTimeout = null
      this._bookResolve = null
    }
    if (this._bigInfoBlink != null) {
      const elapsed = this._bigInfoBlink.millisecondsSinceStart
      const down = (elapsed >= 3400 && elapsed < 3650) || (elapsed >= 3900 && elapsed < 4400)
      if (down !== this._blinkDown) {
        this._blinkDown = down
        const control = this._building.getControl('BigInfo_Ctl')
        if (control != null) {
          setImageSprite(control.sprite, down ? InfoActions.BigInfo_Down_Bitmap : InfoActions.BigInfo_Up_Bitmap, control.sprite.position.z)
        }
      }
      if (this._bigInfoBlink.isExpired) {
        this._bigInfoBlink = null
      }
    }
    if (engine.currentSaveGame.isUnloaded && this._welcomeTimeout?.isExpired === true) {
      this._welcomeTimeout = null
      void this.playInfomainAnimation(iicx17in_RunAnim)
    }
    if (engine.currentSaveGame.isUnloaded && engine.currentSaveGame.act === 1 && this._bookWigMovie != null && this._bookWigInterval.resetExpired()) {
      this._bookWigMovie.stop()
      this._bookWigMovie.play()
    }
  }
}
