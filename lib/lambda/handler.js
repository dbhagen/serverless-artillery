/* eslint-disable no-underscore-dangle */

const alert = require('./alert')
const func = require('./func')
const task = require('./task')

const impl = {
  getSettings: (script) => {
    const settings = func.def.getSettings(script)
    settings.alert = alert
    settings.task = task.def.getSettings(script)
    return settings
  },

  getScriptModality: script => {
    task.valid.validateScriptMode(script)

    return task.def.isAcceptanceScript(script)
      ? task.def.modes.ACCEPTANCE
      : task.def.isMonitoringScript(script)
      ? task.def.modes.MONITORING
      : task.def.modes.PERFORMANCE
  },

  createArtilleryTask: (script) => {
    const scriptMode = impl.getScriptModality(script)
    switch (scriptMode) {
      case task.def.modes.ACCEPTANCE:
        return task.artilleryAcceptanceTask(script)
      case task.def.modes.MONITORING:
        return task.artilleryMonitoringTask(script)
      case task.def.modes.PERFORMANCE:
        return task.artilleryPerformanceTask(script)
    }
  },

  /**
   * Handle event given by the function infrastructure, using the task plugin to plan and execute it (in this function
   * or distributed across copies of it using the func plugin).
   *
   * @param script The event (artillery script) to plan and execute (in this function or distributed across copies of it)
   * @returns {*}
   */
  handle: (script) => {
    const artilleryTask = impl.createArtilleryTask(script)
    const settings = impl.getSettings(script)
    const timeNow = Date.now()

    return artilleryTask.execute(timeNow, settings)
  },
}

module.exports = {
  handler: func.handle(impl.handle),
}

/* test-code */
module.exports.impl = impl
/* end-test-code */
