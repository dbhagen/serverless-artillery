const planning = require('./planning.js')
const analysis = require('./analysis.js')

const artilleryPerformance = artilleryTask => ({
  execute: (timeNow, script, settings) => {
    const plans = planning.planPerformance(timeNow, script, settings)

    return artilleryTask.executeAll(script, settings, plans, timeNow)
      .then(analysis.analyzePerformance)
  },
})

module.exports = artilleryPerformance
