/* eslint-disable no-underscore-dangle */
const task = require('./artillery-task.js')
const platform = require('./platform-settings.js')

const lambdaHandler = {
  handleUnhandledRejection: (ex) => {
    console.log('###############################################################')
    console.log('##             !! Unhandled promise rejection !!             ##')
    console.log('## This probably results from an unforseen circumstance in   ##')
    console.log('## a plugin.  Please report the following stack trace at:    ##')
    console.log('## https://github.com/Nordstrom/serverless-artillery/issues  ##')
    console.log('###############################################################')
    console.log(ex.stack)
    console.log('###############################################################')

    throw ex
  },

  createHandler: (taskToExecute, platformSettings) =>
    (event, context, callback) => {
      try {
        const script = event
        script._funcAws = {
          functionName: context.functionName,
        }
        const settings = platformSettings.getSettings(script)
        taskToExecute.executeTask(script, settings)
          .then((result) => {
            callback(null, result)
          })
          .catch((ex) => {
            console.log(ex.stack)
            callback(null, `Error executing task: ${ex.message}`)
          })
      } catch (ex) {
        console.log(ex.stack)
        callback(null, `Error validating event: ${ex.message}`)
      }
    },
}

process.on('unhandledRejection', lambdaHandler.handleUnhandledRejection)

module.exports.handler = lambdaHandler.createHandler(task, platform)
module.exports.lambdaHandler = lambdaHandler
