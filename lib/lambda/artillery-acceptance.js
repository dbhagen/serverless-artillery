const sampling = require('./sampling.js')
const planning = require('./planning.js')
const analysis = require('./analysis.js')

const artilleryAcceptance = artilleryTask => ({
  execute: (timeNow, script, settings) => {
    const acceptanceScript = sampling.applyAcceptanceSamplingToScript(script, settings)

    const plans = planning.planSamples(timeNow, acceptanceScript, settings)
    // TODO: Scripts for sampling are split by flow
    // TODO: Determine how to guarantee return of results

    return artilleryTask
      .executeAll(acceptanceScript, settings, plans, timeNow)
      .then(results => analysis.analyzeAcceptance(timeNow, script, settings, results))
  },
})

module.exports = artilleryAcceptance
