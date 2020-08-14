import { Context } from 'probot/lib/context.d'
import Webhooks from '@octokit/webhooks'
import { FeaturePull } from '../entities/webhooks/pulls/FeaturePull'
import { ReleasePull } from '../entities/response/pulls/ReleasePull'
import { ReleasePull as DraftReleasePull } from '../entities/drafts/pulls/ReleasePull'
import { GitHub } from '../entities/github/Github'
import { advanceVersion } from '../helper'

const DEV_BRANCH_NAME = process.env.DEV_BRANCH_NAME!
const PROD_BRANCH_NAME = process.env.PROD_BRANCH_NAME!
const RELEASE_LABEL_NAME = process.env.RELEASE_LABEL_NAME!

export const touchReleasePull = async (
  context: Context<Webhooks.WebhookPayloadPullRequest>
) => {
  const pull = new FeaturePull(context)
  const github = new GitHub(context.github, {
    owner: context.payload.repository.owner.login,
    repo: context.payload.repository.name,
  })

  const isTarget = pull.merged && pull.headBranchName === DEV_BRANCH_NAME
  if (!isTarget) return

  const releasePull = await github.fetchReleasePull(RELEASE_LABEL_NAME)

  if (releasePull) {
    updateReleasePull(new ReleasePull(releasePull), pull, github)
    return
  }

  createReleasePull(pull, github)
}

const createReleasePull = async (pull: FeaturePull, github: GitHub) => {
  // calc next release version
  const release = await fetchLatestRelease(github)
  const newVersion = advanceVersion(release)
  const draftReleasePull = new DraftReleasePull(newVersion)

  // create pull
  const response = await github.createPull({
    title: draftReleasePull.title,
    body: draftReleasePull.generateBody([pull]),
    base: PROD_BRANCH_NAME,
    head: DEV_BRANCH_NAME,
  })

  // add release label to pull
  const releasePull = new ReleasePull(response.data)
  await github.addLabelToIssue(releasePull.number, [RELEASE_LABEL_NAME])
}

const updateReleasePull = async (
  releasePull: ReleasePull,
  featurePull: FeaturePull,
  github: GitHub
) => {
  const newBody = releasePull.body + '\n' + featurePull.record

  // update feature logs of release pull
  github.updatePull({
    pull_number: releasePull.number,
    body: newBody,
  })
}

const fetchLatestRelease = async (github: GitHub) => {
  try {
    const latestRelease = await github.fetchLatestRelease()
    return latestRelease.data.name
  } catch (error) {
    console.log('Fail to fetch release.')
    return '0.0.0'
  }
}
