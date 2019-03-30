const sampling = {
  defaults: {
    acceptance: {
      DefaultSize: 1,
      DefaultAveragePause: 0.2,
      DefaultPauseVariance: 0.1,
      DefaultErrorBudget: 0,
    },
    monitoring: {
      DefaultSize: 5,
      DefaultAveragePause: 0.2,
      DefaultPauseVariance: 0.1,
      DefaultErrorBudget: 4,
    },
    sampling: {
      DefaultSize: 5,
      DefaultAveragePause: 0.2,
      DefaultPauseVariance: 0.1,
      DefaultErrorBudget: 4,
      DefaultWarningThreshold: 0.9,
    },
  },

  defaultSampling: (modeDefaults, script) => Object.assign({
    size: modeDefaults.DefaultSize,
    averagePause: modeDefaults.DefaultAveragePause,
    pauseVariance: modeDefaults.DefaultPauseVariance,
    errorBudget: modeDefaults.DefaultErrorBudget,
    warningThreshold: sampling.defaults.sampling.DefaultWarningThreshold,
  }, script.sampling || {}),

  applySamplingToScript: (script, settings, appliedSampling) => {
    const updatedScript = Object.assign({}, script, {
      sampling: appliedSampling,
    })
    sampling.validateSampling(updatedScript, settings)
    return updatedScript
  },

  applyAcceptanceSamplingToScript: (script, settings) => {
    const acceptanceSampling = sampling.defaultSampling(sampling.defaults.acceptance, script)
    return sampling.applySamplingToScript(script, settings, acceptanceSampling)
  },

  applyMonitoringSamplingToScript: (script, settings) => {
    const monitoringSampling = sampling.defaultSampling(sampling.defaults.monitoring, script)
    return sampling.applySamplingToScript(script, settings, monitoringSampling)
  },

  validateSampling: (script, settings) => {
    // Specific type and value checking
    if (typeof script.sampling.size !== 'number' || script.sampling.size <= 0) {
      throw new Error('If specified, the sampling size must have type number and be greater than zero')
    }

    if (typeof script.sampling.averagePause !== 'number' || script.sampling.averagePause <= 0) {
      throw new Error('If specified, the sampling averagePause must have type number and be greater than zero')
    }

    if (typeof script.sampling.pauseVariance !== 'number' || script.sampling.pauseVariance < 0) {
      throw new Error('If specified, the sampling pauseVariance must have type number and be greater than or equal to zero')
    }

    if (typeof script.sampling.errorBudget !== 'number' || script.sampling.errorBudget < 0) {
      throw new Error('If specified, the sampling errorBudget must have type number and be greater than or equal to zero')
    }

    if (typeof script.sampling.warningThreshold !== 'number' || script.sampling.warningThreshold <= 0 || script.sampling.warningThreshold > 1) {
      throw new Error('If specified, the sampling warningThreshold must have type number and be either one or between zero and one')
    }

    const scenarioCount = script.scenarios ? script.scenarios.length : 1
    const totalSamples = script.sampling.size * scenarioCount

    // Value relationship checking
    if (
      totalSamples <= sampling.errorBudget
    ) {
      throw new Error(`The given size * scenarios (${
        totalSamples
      }) and errorBudget (${
        script.sampling.errorBudget
      }) values (perhaps from defaults) succeeds even if all samples fail`)
    }

    if (
      sampling.pauseVariance > sampling.averagePause
    ) {
      throw new Error(`The given pauseVariance (${
        script.sampling.pauseVariance
      }) cannot exceed the given averagePause (${
        script.sampling.averagePause
      })`)
    }

    // Value to function constrain checking
    const mostPossiblePause = (sampling.averagePause + sampling.pauseVariance) * totalSamples

    if (mostPossiblePause > settings.maxScriptDurationInSeconds) {
      throw new Error(`The given averagePause (${
        script.sampling.averagePause
      }), pauseVariance (${
        script.sampling.pauseVariance
      }), and size * scenarios (${
        totalSamples
      }) values in combination could, even ignoring request duration, exceed the maximum allowable duration (${
        settings.maxScriptDurationInSeconds
      })`)
    }

    if (mostPossiblePause > (settings.maxScriptDurationInSeconds * script.sampling.warningThreshold)) {
      console.warn([
        '## !! WARNING !! ##',
        '',
        'As configured (perhaps via defaults), it is possible that the total execution',
        'time of your sampling will exceed the duration allowed for executing it.',
        'Additionally, specifying regular continuous sampling in this configuration can',
        'result in greater than expected costs',
        'Values:',
        `\tsize: ${script.sampling.size}`,
        `\tscenarios: ${script.scenarios.length}`,
        `\ttotalSamples (size * scenarios): ${totalSamples}`,
        `\taveragePause: ${script.sampling.averagePause}`,
        `\tpauseVariance: ${script.sampling.pauseVariance}`,
        `\tmaxScriptDurationInSeconds: ${settings.maxScriptDurationInSeconds}`,
        `\twarningThreshold: ${script.sampling.warningThreshold}`,
        'Calculation',
        `\t(${script.sampling.averagePause} + ${script.sampling.pauseVariance}) * ${script.sampling.size} = ${mostPossiblePause}`,
        `\t${settings.maxScriptDurationInSeconds} * ${script.sampling.warningThreshold} = ${settings.maxScriptDurationInSeconds * script.sampling.warningThreshold}`,
        'Condition',
        `\t${mostPossiblePause} > ${settings.maxScriptDurationInSeconds * script.sampling.warningThreshold}`,
      ].join('\n'))
    }
  },
}

module.exports = sampling
