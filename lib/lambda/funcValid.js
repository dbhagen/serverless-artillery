const def = require('./funcDef')

const impl = {
  /**
   * Validate the given event's function relevant configuration, throwing an exception if invalid configuration is discovered.
   * @param event The event given to validate
   */
  validate: (event) => {
    // Splitting Settings [Optional]
    if (event && event._split && typeof event._split !== 'object') { // eslint-disable-line no-underscore-dangle
      throw new def.FunctionError('If specified, the "_split" attribute must contain an object')
    }

    const settings = def.getSettings(event) || {}

    const checkBoundedIntegerSetting = (setting, minimum, maximum) => {
      const value = settings[setting]

      if (value) {
        const isInvalidValue = !Number.isInteger(value) || value < minimum || value > maximum

        if (isInvalidValue) {
          throw new def.FunctionError(`If specified, the "_split.${setting}" attribute must be an integer ` +
            `inclusively between ${minimum} and ${maximum}.`)
        }
      }
    }

    checkBoundedIntegerSetting('maxChunkDurationInSeconds',  def.MIN_CHUNK_DURATION_IN_SECONDS, def.MAX_CHUNK_DURATION_IN_SECONDS)
    checkBoundedIntegerSetting('maxScriptDurationInSeconds', 1, def.MAX_SCRIPT_DURATION_IN_SECONDS)
    checkBoundedIntegerSetting('maxChunkRequestsPerSecond',  1, def.MAX_CHUNK_REQUESTS_PER_SECOND)
    checkBoundedIntegerSetting('maxScriptRequestsPerSecond', 1, def.MAX_SCRIPT_REQUESTS_PER_SECOND)
    checkBoundedIntegerSetting('timeBufferInMilliseconds',   1, def.MAX_TIME_BUFFER_IN_MILLISECONDS)
  },
}

module.exports = impl.validate
