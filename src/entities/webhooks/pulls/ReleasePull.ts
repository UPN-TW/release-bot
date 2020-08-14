import { Context } from 'probot/lib/context'
import Webhooks from '@octokit/webhooks'

export class ReleasePull {
  constructor(private context: Context<Webhooks.WebhookPayloadPullRequest>) {}

  get merged() {
    return this.context.payload.pull_request.merged
  }

  get headBranchName() {
    return this.context.payload.pull_request.base.ref
  }

  get title() {
    return this.context.payload.pull_request.title
  }

  get body() {
    return this.context.payload.pull_request.body
  }

  get labels() {
    return this.context.payload.pull_request.labels
  }

  get releaseVersion() {
    return this.title.split(' ')[1]
  }
}
