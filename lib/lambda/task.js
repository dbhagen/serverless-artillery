const { run } = require('artillery')

const def = require('./taskDef')
const exec = require('./taskExec')(run)
const plan = require('./taskPlan')
const result = require('./taskResult')
const valid = require('./taskValid')
const func = require('./func')

const impl = {
  /**
   * Delay for the given number of milliseconds before resolving the returned promise.
   * @param ms The number of milliseconds to delay before resolving the returned promise.
   * @returns {Promise<any>}
   */
  delay: (ms) => {
    if (ms > 0) {
      return new Promise(resolve => setTimeout(resolve, ms))
    } else {
      return Promise.resolve()
    }
  },
  /**
   * Wait the requested time delay before simulating execution (simulation mode) or sending the given event to a new
   * copy of this function for execution (standard mode)
   * @param timeDelay The amount of time to delay before sending the remaining jobs for execution
   * @param event The event containing the remaining jobs that is to be sent to the next Lambda
   * @param invocationType The lambda invocationType
   * @returns {Promise<any>}
   */
  invokeSelf(timeDelay, event, invocationType) {
    const exec = () => {
      if (event._simulation) {
        console.log('SIMULATION: self invocation.')
        return impl.handle(event)
      } else {
        if (event._trace) {
          console.log(`invoking self for ${event._genesis} in ${event._start} @ ${Date.now()}`)
        }
        return func.exec(event, invocationType)
          .then((result) => {
            if (event._trace) {
              console.log(`invoke self complete for ${event._genesis} in ${event._start} @ ${Date.now()}`)
            }
            return result
          })
      }
    }
    if (event._trace) {
      console.log(`scheduling self invocation for ${event._genesis} in ${event._start} with a ${timeDelay} ms delay`)
    }
    return impl.delay(timeDelay).then(exec)
  },
  /**
   * Execute the given plans distributed across copies of this function
   * @param timeNow The time ID of the current function
   * @param script The script that caused the execution of the current function
   * @param settings The settings to use for executing in the current function
   * @param plans The plans (each an event) to distribute over copies of this function
   * @returns {Promise<any>}
   */
  distribute: (timeNow, script, settings, plans) => {
    if (script._trace) {
      console.log(`distributing ${plans.length} plans from ${script._genesis} in ${timeNow}`)
    }
    const invocations = plans.map(plan => impl.invokeSelf(
      (plan._start - Date.now()) - settings.timeBufferInMilliseconds,
      plan,
      plan._invokeType // eslint-disable-line comma-dangle
    ).then((result) => {
      if (script._trace) {
        console.log(`load test from ${script._genesis} executed by ${timeNow} partially complete @ ${Date.now()}`)
      }
      return result
    }))
    return Promise.all(invocations)
      .then((reports) => {
        if (script._trace) {
          console.log(`load test from ${script._genesis} in ${timeNow} completed @ ${Date.now()}`)
        }
        return Promise.resolve(result(timeNow, script, settings, reports))
      })
  },
  /**
   * Execute the given event in place, which is to say in the current function
   * @param timeNow The time ID of the current function
   * @param event The event to execute in the current function
   * @param settings The settings to use for executing in the current function
   * @returns {Promise<T>}
   */
  execute: (timeNow, sourceEvent, settings, event) => {
    const script = event
    if (!script._start) {
      script._start = timeNow
    }
    const timeDelay = script._start - Date.now()
    return impl.delay(timeDelay)
      .then(() => {
        if (script._trace) {
          console.log(`executing load script from ${script._genesis} in ${timeNow} @ ${Date.now()}`)
        }
        return exec(timeNow, script)
          .then((report) => {
            if (script._trace) {
              console.log(`execution complete from ${script._genesis} in ${timeNow} @ ${Date.now()}`)
            }
            return Promise.resolve(result(timeNow, sourceEvent, settings, [report]))
          })
      })
      .catch((ex) => {
        console.error(`error executing load script from ${script._genesis} in ${timeNow} @ ${Date.now()}:`)
        console.error(ex.stack)
        throw ex
      })
  },
  executeAll: (script, settings, plans, timeNow) => {
    if (plans.length > 1) {
      return impl.distribute(timeNow, script, settings, plans)
    } else if (plans.length === 1) {
      return impl.execute(timeNow, script, settings, plans[0])
    } else {
      const msg = `ERROR, no executable content in:\n${JSON.stringify(script)}!`
      console.error(msg)
      return Promise.reject(new Error(msg))
    }
  }
}

module.exports = {
  def,
  exec,
  plan,
  result,
  valid,
  artilleryAcceptanceTask: (script) => {
    const acceptance = {
      execute: (timeNow, settings) => {
        valid.validateSamplingScript(settings, script)
        const plans = plan.planSamples(timeNow, script, settings)

        // TODO: What if there is not external reporting for a script that requires splitting?  Detect this and error out?
        if (plans.length > 1) {
          console.error('Acceptance scripts cannot require splitting.')
        }

        return impl.executeAll(script, settings, plans, timeNow)
      }
    }

    return acceptance
  },
  artilleryMonitoringTask: (script) => {
    const monitoring = {
      execute: (timeNow, settings) => {
        valid.validateSamplingScript(settings, script)
        const plans = plan.planSamples(timeNow, script, settings)

        // TODO: What if there is not external reporting for a script that requires splitting?  Detect this and error out?
        if (plans.length > 1) {
          console.error('Monitoring scripts cannot require splitting.')
        }

        return impl.executeAll(script, settings, plans, timeNow)
      }
    }

    return monitoring
  },
  artilleryPerformanceTask: (script) => {
    const performance = {
      execute: (timeNow, settings) => {
        valid.validatePerformanceScript(settings, script)
        const plans = plan.planPerformance(timeNow, script, settings)
        return impl.executeAll(script, settings, plans, timeNow)
      }
    }

    return performance
  },
}
