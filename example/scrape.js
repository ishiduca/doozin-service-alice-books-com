var fs = require('fs')
var path = require('path')
var { pipe, through } = require('mississippi')
var Service = require('../service')
var s = new Service()

pipe(
  fs.createReadStream(path.join(__dirname, 'result.html')),
  s.scraper(),
  through.obj((data, _, done) => {
    console.log(data)
    done()
  }),
  error => (error ? console.error(error) : console.log('END'))
)
