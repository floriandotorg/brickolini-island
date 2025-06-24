export namespace Action {
  export enum Type {
    Null = -1,
    Object = 0,
    Action = 1,
    MediaAction = 2,
    Anim = 3,
    Sound = 4,
    MultiAction = 5,
    SerialAction = 6,
    ParallelAction = 7,
    Event = 8,
    SelectAction = 9,
    Still = 10,
    ObjectAction = 11,
  }
  export enum FileType {
    WAV = 1447122720,
    STL = 1280594720,
    FLC = 1129072160,
    SMK = 1263358752,
    OBJ = 1245859616,
    TVE = 1414939936,
  }
  export enum Flags {
    LoopCache = 1,
    NoLoop = 2,
    LoopStream = 4,
    Transparent = 8,
    Unknown = 32,
  }
}
