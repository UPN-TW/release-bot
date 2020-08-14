import { Context } from 'probot/lib/context'
import Webhooks from '@octokit/webhooks'

export class FeaturePull {
  constructor(private context: Context<Webhooks.WebhookPayloadPullRequest>) {}

  get merged() {
    return this.context.payload.pull_request.merged
  }

  get headBranchName() {
    return this.context.payload.pull_request.base.ref
  }

  get number() {
    return this.context.payload.pull_request.number
  }

  get title() {
    return this.context.payload.pull_request.title
  }

  get body() {
    return this.context.payload.pull_request.body
  }

  get record() {
    return `#${this.number} ${this.title} | by ${this.authorName}`
  }

  get authorName() {
    return this.context.payload.pull_request.head.user.login
  }
}
