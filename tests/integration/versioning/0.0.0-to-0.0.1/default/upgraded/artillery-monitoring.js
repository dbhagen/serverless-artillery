const sampling = require('./sampling.js')
const planning = require('./planning.js')
const analysis = require('./analysis.js')

const artilleryMonitoring = artillery => ({
  execute: (timeNow, script, settings) => {
    const monitorScript = sampling.applyMonitoringSamplingToScript(script, settings)

    const plans = planning.planSamples(timeNow, monitorScript, settings)
    // TODO: Scripts for sampling are split by flow
    // TODO: Determine how to guarantee return of results

    return artillery.executeAll(monitorScript, settings, plans, timeNow)
      .then(analysis.analyzeMonitoring)
      .then((monitoringResults) => {
        if (monitoringResults.errors) {
          return settings.alert.send(script, monitoringResults)
            .then(() => monitoringResults)
        }

        return monitoringResults
      })
  },
})

module.exports = artilleryMonitoring
