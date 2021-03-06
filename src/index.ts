import { Application } from 'probot' // eslint-disable-line no-unused-vars
import { touchReleasePull } from './service/TouchReleasePull'
import { draftRelease } from './service/DraftRelease'
require('dotenv').config()

export = (app: Application) => {
  app.on('pull_request.closed', touchReleasePull)
  app.on('pull_request.closed', draftRelease)
}
