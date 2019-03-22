const constants = {
  // Modes
  modes: {
    PERF: 'perf',
    PERFORMANCE: 'performance',
    ACC: 'acc',
    ACCEPTANCE: 'acceptance',
    MON: 'mon',
    MONITORING: 'monitoring',
  },
  // Tests
  isAcceptanceScript: script => script && script.mode && (script.mode === constants.modes.ACC || script.mode === constants.modes.ACCEPTANCE),
  isMonitoringScript: script => script && script.mode && (script.mode === constants.modes.MON || script.mode === constants.modes.MONITORING),
  isPerformanceScript: script => script && (!script.mode || (script.mode && (script.mode === constants.modes.PERF || script.mode === constants.modes.PERFORMANCE))),
  isSamplingScript: script => constants.isAcceptanceScript(script) || constants.isMonitoringScript(script),
  // Sampling Defaults
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
}

class TaskError extends Error {
  constructor(message) {
    super(message)
    this.name = 'TaskError'
  }
}

const impl = {
  defaultSettings: (defaults, script) => Object.assign({
    size: defaults.DefaultSize,
    averagePause: defaults.DefaultAveragePause,
    pauseVariance: defaults.DefaultPauseVariance,
    errorBudget: defaults.DefaultErrorBudget,
    warningThreshold: constants.sampling.DefaultWarningThreshold,
  }, script.sampling || {}),
  acceptanceSettings: (script) => impl.defaultSettings(constants.acceptance, script),
  monitoringSettings: (script) => impl.defaultSettings(constants.monitoring, script),

  /**
   * Obtain settings, replacing any of the defaults with mode specific defaults and then with user supplied values.
   * @param script The script that sampling settings were supplied to.
   * @returns
   * {
   *   {
   *     size: number,
   *     averagePause: number,
   *     pauseVariance: number,
   *     errorBudget: number,
   *     warningThreshold: number,
   *   }
   * }
   * The settings for the given script which consists of core defaults overwritten by mode defaults overwritten by
   * any user supplied values.
   */
  getSettings: (script) => {
    const settings = {}
    // Sampling Settings
    if (constants.isAcceptanceScript(script)) {
      settings.sampling = impl.defaultSettings(constants.acceptance, script)
    } else if (constants.isMonitoringScript(script)) {
      settings.sampling = impl.defaultSettings(constants.monitoring, script)
    } else {
      settings.sampling = impl.defaultSettings(constants.sampling, script)
    }
    return settings
  },
}

module.exports = constants
module.exports.TaskError = TaskError
module.exports.getSettings = impl.getSettings
module.exports.defaultSettings = impl.defaultSettings
module.exports.acceptanceSettings = impl.acceptanceSettings
module.exports.monitoringSettings = impl.monitoringSettings
