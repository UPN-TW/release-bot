import { GitHubAPI } from 'probot/lib/github'
import { Octokit } from '@octokit/rest'
import { Account } from './account/Account'

export class GitHub {
  constructor(private github: GitHubAPI, private account: Account) {}

  async fetchAllPulls() {
    return await this.github.pulls.list(this.account)
  }

  async fetchReleasePull(releaseLabel: string) {
    const pulls = await this.fetchAllPulls()
    return pulls.data.filter((pull) => {
      return pull.labels.find((label) => label.name === releaseLabel)
    })[0]
  }

  async fetchLatestRelease() {
    return await this.github.repos.getLatestRelease(this.account)
  }

  async createPull(
    param: Octokit.RequestOptions &
      Omit<Octokit.PullsCreateParams, keyof Account>
  ) {
    return await this.github.pulls.create({
      ...this.account,
      ...param,
    })
  }

  async updatePull(
    param: Octokit.RequestOptions &
      Omit<Octokit.PullsUpdateParams, keyof Account>
  ) {
    return await this.github.pulls.update({
      ...this.account,
      ...param,
    })
  }

  async addLabelToIssue(issueNumber: number, labels: string[]) {
    return await this.github.issues.addLabels({
      ...this.account,
      issue_number: issueNumber,
      labels,
    })
  }

  async createRelease(param: createReleasePayload) {
    return await this.github.repos.createRelease({
      ...this.account,
      tag_name: param.tag,
      name: param.releaseName,
      body: param.body,
      draft: true,
    })
  }
}

interface createReleasePayload {
  releaseName: string
  tag: string
  body: string
}
