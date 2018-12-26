const path = require('path')

const projectRootPath = path.resolve(__dirname, '../../')
const projectDistPath = path.join(projectRootPath, 'dist')
const projectIndexPath = path.join(projectDistPath, 'index.html')

module.exports = {
  projectDistPath,
  projectIndexPath,
  port: 3000,
  host: '0.0.0.0'
}