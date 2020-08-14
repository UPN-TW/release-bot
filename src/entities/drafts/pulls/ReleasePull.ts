import { FeaturePull } from "../../webhooks/pulls/FeaturePull"

export class ReleasePull {
	constructor(private version: string) {
		if (!checkVersionFormat(version)) {
			throw new Error('Invalid version for constructing ReleasePull')
		}
	}

	get title() {
		return `Release ${this.version}`
	}

	generateBody(pulls: FeaturePull[]) {
		const recordText = pulls.reduce((acc, pull) => {
			return `${acc}\n${pull.record}`
		}, '')
    return `Created By Release Bot:\n ${recordText}`
	}
}

const checkVersionFormat = (v) => v.split('.').length === 3
