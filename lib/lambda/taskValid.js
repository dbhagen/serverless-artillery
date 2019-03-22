const os = require('os')

const def = require('./taskDef')
const plan = require('./taskPlan')

const impl = {
  validateScriptMode: (script) => {
    const validModes = Object.keys(def.modes).map(key => def.modes[key])
    const isScriptModeValid = validModes.includes(script.mode.toLocaleLowerCase())

    if (!isScriptModeValid) {
      const listOfValidModes = validModes.map(mode => `"${mode}"`).join(', ')
      throw new def.TaskError(`If specified, the mode attribute must be one of: ${listOfValidModes}.`)
    }
  },

  validatePerformanceScript: (settings, script) => {
    // eslint-disable-next-line no-lonely-if
    if (!(script.config && Array.isArray(script.config.phases) && script.config.phases.length > 0)) { // must have phase
      throw new def.TaskError([
        'An Artillery script must contain at least one phase under the $.config.phases attribute which ',
        'itself must be an Array unless mode attribute is specified to be ',
        `${def.modes.ACCEPTANCE}, ${def.modes.ACC}, ${def.modes.MONITORING}, or ${def.modes.MON}`,
      ].join(''))
    }

    const scriptDurationInSeconds = plan.impl.scriptDurationInSeconds(script)
    const scriptRequestsPerSecond = plan.impl.scriptRequestsPerSecond(script)

    if (scriptDurationInSeconds <= 0) {
      throw new def.TaskError(`Every phase must have a valid duration in seconds.  Observed: ${
        JSON.stringify(script.config.phases[scriptDurationInSeconds * -1])
        }`)
    }

    if (scriptDurationInSeconds > settings.maxScriptDurationInSeconds) {
      throw new def.TaskError(`The total duration in seconds of all script phases cannot exceed ${
        settings.maxScriptDurationInSeconds
        }`)
    }

    if (scriptRequestsPerSecond <= 0) {
      throw new def.TaskError(`Every phase must have a valid means to determine requests per second.  Observed: ${
        JSON.stringify(script.config.phases[scriptRequestsPerSecond * -1])
        }`)
    }

    if (scriptRequestsPerSecond > settings.maxScriptRequestsPerSecond) {
      throw new def.TaskError(`The maximum requests per second of any script phase cannot exceed ${
        settings.maxScriptRequestsPerSecond
        }`)
    }
  },

  validateSamplingScript: (settings, script) => {
    const { sampling } = settings.task

    // Specific type and value checking
    if (typeof sampling.size !== 'number' || sampling.size <= 0) {
      throw new def.TaskError('If specified, the sampling size must have type number and be greater than zero')
    }

    if (typeof sampling.averagePause !== 'number' || sampling.averagePause <= 0) {
      throw new def.TaskError('If specified, the sampling averagePause must have type number and be greater than zero')
    }

    if (typeof sampling.pauseVariance !== 'number' || sampling.pauseVariance < 0) {
      throw new def.TaskError('If specified, the sampling pauseVariance must have type number and be greater than or equal to zero')
    }

    if (typeof sampling.errorBudget !== 'number' || sampling.errorBudget < 0) {
      throw new def.TaskError('If specified, the sampling errorBudget must have type number and be greater than or equal to zero')
    }

    if (typeof sampling.warningThreshold !== 'number' || sampling.warningThreshold <= 0 || sampling.warningThreshold > 1) {
      throw new def.TaskError('If specified, the sampling warningThreshold must have type number and be either one or between zero and one')
    }

    const scenarioCount =  script.scenarios ? script.scenarios.length : 1
    const totalSamples = sampling.size * scenarioCount

    // Value relationship checking
    if (
      totalSamples <= sampling.errorBudget
    ) {
      throw new def.TaskError(`The given size * scenarios (${
        totalSamples
        }) and errorBudget (${
        sampling.errorBudget
        }) values (perhaps from defaults) succeeds even if all samples fail`)
    }

    if (
      sampling.pauseVariance > sampling.averagePause
    ) {
      throw new def.TaskError(`The given pauseVariance (${
        sampling.pauseVariance
        }) cannot exceed the given averagePause (${
        sampling.averagePause
        })`)
    }

    // Value to function constrain checking
    const mostPossiblePause = (sampling.averagePause + sampling.pauseVariance) * totalSamples

    if (mostPossiblePause > settings.maxScriptDurationInSeconds) {
      throw new def.TaskError(`The given averagePause (${
        sampling.averagePause
        }), pauseVariance (${
        sampling.pauseVariance
        }), and size * scenarios (${
        totalSamples
        }) values in combination could, even ignoring request duration, exceed the maximum allowable duration (${
        settings.maxScriptDurationInSeconds
        })`)
    }

    if (mostPossiblePause > (settings.maxScriptDurationInSeconds * sampling.warningThreshold)) {
      console.warn([
        `## !! WARNING !! ##${os.EOL}`,
        'As configured (perhaps via defaults), it is possible that the total execution',
        'time of your sampling will exceed the duration allowed for executing it.',
        'Additionally, specifying regular continuous sampling in this configuration can',
        'result in greater than expected costs',
        'Values:',
        `\tsize: ${sampling.size}`,
        `\tscenarios: ${script.scenarios.length}`,
        `\ttotalSamples (size * scenarios): ${totalSamples}`,
        `\taveragePause: ${sampling.averagePause}`,
        `\tpauseVariance: ${sampling.pauseVariance}`,
        `\tmaxScriptDurationInSeconds: ${settings.maxScriptDurationInSeconds}`,
        `\twarningThreshold: ${sampling.warningThreshold}`,
        'Calculation',
        `\t(${sampling.averagePause} + ${sampling.pauseVariance}) * ${sampling.size} = ${mostPossiblePause}`,
        `\t${settings.maxScriptDurationInSeconds} * ${sampling.warningThreshold} = ${settings.maxScriptDurationInSeconds * sampling.warningThreshold}`,
        'Condition',
        `\t${mostPossiblePause} > ${settings.maxScriptDurationInSeconds * sampling.warningThreshold}`,
      ].join(os.EOL))
    }
  },

  validate: (settings, script) => {
    if (def.isSamplingScript(script)) {
      impl.validateSamplingScript(settings, script)
    } else { // not in sampling mode.  allow lonely if so that it is visually separated and not spread out as different high-level branches
      impl.validatePerformanceScript(settings, script)
    }
  },
}

module.exports = impl.validate
module.exports.validateScriptMode = impl.validateScriptMode
module.exports.validateSamplingScript = impl.validateSamplingScript
module.exports.validatePerformanceScript = impl.validatePerformanceScript
