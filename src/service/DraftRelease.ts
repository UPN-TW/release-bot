import { Context } from 'probot/lib/context.d'
import Webhooks from '@octokit/webhooks'
import { GitHub } from '../entities/github/Github'
import { ReleasePull } from '../entities/webhooks/pulls/ReleasePull'

const PROD_BRANCH_NAME = process.env.PROD_BRANCH_NAME!
const RELEASE_LABEL_NAME = process.env.RELEASE_LABEL_NAME!

export const draftRelease = async (
  context: Context<Webhooks.WebhookPayloadPullRequest>
) => {
  const pull = new ReleasePull(context)
  const github = new GitHub(context.github, {
    owner: context.payload.repository.owner.login,
    repo: context.payload.repository.name,
  })

  const hasReleaseLabel = pull.labels.find(
    (label) => label.name === RELEASE_LABEL_NAME
  )

  const isTarget =
    pull.merged && pull.headBranchName !== PROD_BRANCH_NAME && hasReleaseLabel
  if (!isTarget) return

  github.createRelease({
    releaseName: pull.releaseVersion,
    tag: pull.releaseVersion,
    body: pull.body,
  })
}
