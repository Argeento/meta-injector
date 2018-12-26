const http = require('http')
const parseUrl = require('parseurl')
const send = require('send')
const path = require('path')
const fs = require('fs')
const UrlPattern = require('url-pattern')

const projectRootPath = path.resolve(__dirname, '../../')

//------------------------------------------------------------------------------
// Load config
//------------------------------------------------------------------------------
let config = require('./default-config')
try {
  // Get user config
  const userConfigFilePath = path.join(projectRootPath, 'meta.config.js')
  const userConfig = require(userConfigFilePath)
  // TODO check the correctness of the user config
  // Shallow merge - config structure is one level deep
  config = { ...config, ...userConfig }
} catch {
  throw new Error('./meta.config.js not found!')
}


//------------------------------------------------------------------------------
// Add patterns to routes
//------------------------------------------------------------------------------
config.routes = config.routes.map(route => {
  return { ...route, pattern: new UrlPattern(route.path) }
})


//------------------------------------------------------------------------------
// Get index.html code
//------------------------------------------------------------------------------
const htmlCode = fs.readFileSync(config.projectIndexPath).toString('utf8')

function insertToHead (insertion) {
  const index = htmlCode.indexOf('</head>')
  return htmlCode.slice(0, index) + insertion + htmlCode.slice(index)
}


//------------------------------------------------------------------------------
// Define http server
//------------------------------------------------------------------------------
const server = http.createServer((req, res) => {
  const reqPath = parseUrl(req).pathname

  function customResponse () {
    // Search for matching route in config routes
    let params = null
    const route = config.routes.find(route => {
      // Save the params of the query
      params = route.pattern.match(reqPath)
      return !!params
    })

    // TODO Handle mismatched routes
    if (!route) {
      res.write(htmlCode, 'utf8')
      res.end()
      return
    }

    // Resolve user function to get the meta information
    // TODO Handle async functions and objects
    const metaInfo = route.inject(params)

    // Incject meta information to index.html
    const responseBody = insertToHead(`<title>${metaInfo.title}</title>`)

    // Response with modified html file
    res.write(responseBody, 'utf8')
    res.end()
  }


  // Inject meta info to the root route
  if (reqPath === '/') {
    customResponse()
  } else {
    // Stream all the files in the project dist directory
    send(req, reqPath, { root: config.projectDistPath })
      .on('error', function httpErrorHandler (err) {
        // If the status code equals 404, user tries to reach a spa route
        if (err.statusCode === 404) {
          customResponse()
        } else {
          // Else there is some error
          res.statusCode = err.status || 500
          res.end(err.message) // TODO change this value in prod mode?
        }
      })
      .pipe(res)
  }
})


//------------------------------------------------------------------------------
// Run http server
//------------------------------------------------------------------------------
server.listen({
  port: config.port,
  host: config.host
})

console.log(`Port: ${config.port}`)
console.log(`Host: ${config.host}`)
