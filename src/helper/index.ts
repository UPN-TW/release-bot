export const advanceVersion = (version: string, type?: 'major' | 'minor' | 'patch')  => {
  if (!version || version.split('.').length !== 3) {
    throw new Error('Invalid version format: ' + version)
  }

  const versionSegment = version.split('.')

  let targetIndex = 2
  if (type === 'major') targetIndex = 0
  if (type === 'minor') targetIndex = 1
  if (type === 'patch') targetIndex = 2
  versionSegment[targetIndex] = (Number(versionSegment[targetIndex]) + 1).toString()

  return versionSegment.reduce((acc, text) => {
    return acc + '.' + text
  })
}
