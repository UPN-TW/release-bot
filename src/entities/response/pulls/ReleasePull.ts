import { Octokit } from '@octokit/rest'

export class ReleasePull {
  constructor(private item: Octokit.PullsListResponseItem) {}

  get number() {
    return this.item.number
  }

  get body() {
    return this.item.body
  }
}
