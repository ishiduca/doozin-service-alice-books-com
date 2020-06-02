var xtend = require('xtend')
var trumpet = require('trumpet')
var inherits = require('inherits')
var urlencode = require('urlencode')
var { through, concat, duplex } = require('mississippi')
var DoozinService = require('@ishiduca/doozin-service')

function DoozinServiceAliceBooksCom () {
  if (!(this instanceof DoozinServiceAliceBooksCom)) {
    return new DoozinServiceAliceBooksCom()
  }

  var origin = 'https://alice-books.com'
  var searchHome = origin + '/item/list/all'
  var hyperquest = xtend(
    DoozinService.defaultConfig.hyperquest, { origin, searchHome }
  )
  var config = xtend(DoozinService.defaultConfig, { hyperquest })
  DoozinService.call(this, config)
}

inherits(DoozinServiceAliceBooksCom, DoozinService)
module.exports = DoozinServiceAliceBooksCom

DoozinServiceAliceBooksCom.prototype.createURI = function (params) {
  var { value, opts } = params
  var query = xtend({ keyword: value }, opts)
  return this.config.hyperquest.searchHome + '?' +
    urlencode.stringify(query, this.config.urlencode)
}

DoozinServiceAliceBooksCom.prototype.createOpts = function (params) {
  var cookie = 'adult_cert=Yes%21+I%27m+an+adult%21'
  return xtend({
    method: this.config.hyperquest.method,
    headers: xtend(this.config.hyperquest.headers, { cookie })
  })
}

DoozinServiceAliceBooksCom.prototype.scraper = function () {
  var tr = trumpet()
  var rs = through.obj()

  var i = 0
  var isBingo = false
  var selector = '#Main>div.item_list_box div.cf div.item_box'

  var mid = through.obj()
  mid.on('pipe', () => (i += 1))
  mid.on('unpipe', () => ((i -= 1) || mid.end()))
  mid.pipe(rs)

  tr.selectAll(selector, div => {
    isBingo = true
    var links = []
    var src = through.obj()
    var snk = through.obj()

    src.pipe(mid, { end: false })
    snk.pipe(concat(x => src.end(x.reduce((a, b) => xtend(a, b), {}))))

    var tr = trumpet()
    tr.select('div.item_image a.image img', img => {
      img.getAttribute('src', srcOfThumbnail => {
        snk.write({ srcOfThumbnail })
      })
    })

    tr.select('div.info dl dt.item_name a', a => {
      var tr = trumpet()
      a.createReadStream().pipe(tr).pipe(concat(b => {
        var title = String(b)
        a.getAttribute('href', h => {
          var urlOfTitle = this.config.hyperquest.origin + h
          snk.write({ urlOfTitle, title })
        })
      }))
    })

    tr.selectAll('div.info dl dd.circle_name a', a => {
      var tr = trumpet()
      a.createReadStream().pipe(tr).pipe(concat(b => {
        var text = String(b)
        a.getAttribute('href', h => {
          var href = this.config.hyperquest.origin + h
          links.push({ href, text, circle: true })
        })
      }))
    })

    tr.selectAll('div.info dl dd.genre_name a', a => {
      var tr = trumpet()
      a.createReadStream().pipe(tr).pipe(concat(b => {
        var text = String(b)
        a.getAttribute('href', h => {
          var href = this.config.hyperquest.origin + h
          links.push({ href, text })
        })
      }))
    })

    div.createReadStream().pipe(tr).once('end', () => snk.end({ links }))
  })

  tr.once('end', () => isBingo || mid.end())

  return duplex.obj(tr, rs)
}
