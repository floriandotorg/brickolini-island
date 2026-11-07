export class RadioPlaylist<T> {
  private readonly _lists: readonly (readonly T[])[]
  private _category: number
  private readonly _indices: number[]

  constructor(lists: readonly (readonly T[])[], category = Math.floor(Math.random() * lists.length), indices = lists.map(list => Math.floor(Math.random() * list.length))) {
    this._lists = lists
    this._category = category
    this._indices = indices
  }

  public next = (): T => {
    this._category = (this._category + 1) % this._lists.length
    const list = this._lists[this._category]
    const index = this._indices[this._category]
    const item = list[index]
    if (item == null) {
      throw new Error('Empty radio playlist')
    }
    this._indices[this._category] = (index + 1) % list.length
    return item
  }
}
