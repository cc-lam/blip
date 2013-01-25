var gd = require('node-gd'),
	zlib = require('zlib')

module.exports = blip = {}

blip._encode = function(input, fn) {
	try {
		zlib.gzip(new Buffer(input, "utf8"), function(err, res) {
			if(err) throw err

			var ln = res.toString('hex').length,
				totalPixels = Math.ceil(ln / 6), i, px, ret = []

			// pixel padding...can't do without this unfortunately.
			// means some data modification (need nice round chunks of 6 hex chars per pixel) when pulling data back out of an image
			// this will have to be transparently removed at some point, no code to do it intelligently yet.
			if(ln % 6 !== 0) {
				tBuffer = new Buffer(ln % 6)
				tBuffer.fill(' ')
				res = Buffer.concat([res, tBuffer])
			}

			res = res.toString('hex')
			for(i = 0; i < totalPixels; i++) {
				px = res.slice(i * 6, (i+1) * 6)
				if(px == '') px = 'ffffff'
				ret.push(px)
			}

			fn(null, ret)
		})
	} catch(err) {
		fn(err)
	}
}

blip._decode = function(data, fn) {
	try {
		extra = data.match(/f+$/)
		if(extra !== null && (extra[0].length / 6) > 0) {
			data = data.slice(0, Math.floor(extra[0].length / 6) * -6)
		}

		zlib.gunzip(Buffer(data, 'hex'), function(err, res) {
			if(err) throw err
			fn(null, res.toString())
		})
	} catch(err) {
		fn(err)
	}
}

blip.imageSize = function(image, fn) {
	try {
		gd.openPng(image, function(err, gdImage) {
			if(err) throw err
			fn(null, gdImage.width, gdImage.height)
		})
	} catch(err) {
		fn(err)
	}
}

blip.dataSize = function(data, fn) {
	try {
		blip.encode(data, function(err, pixels) {
			if(err) throw err
			fn(null, pixels.length)
		})
	} catch(err) {
		fn(err)
	}
}

blip._toImage = function(gdImage, pixels, x1, x2, y1, y2, dest, fn) {
	try {
		if((x2 - x1 + 1) * (y2 - y1 + 1) < pixels.length)
			throw new Error('insuffient image area to store provided data')
		var x, y, px, colors = {}

		for(y = y1; y <= y2; y++) {
			for(x = x1; x <= x2; x++) {
				px = pixels.shift()
				if(px === undefined) px = 'FFFFFF' // pad as necessary when we reach the end of the pixel data array
				if(colors[px] === undefined) // cache color allocation
					colors[px] = gdImage.colorAllocate(parseInt(px.slice(0,2), 16), parseInt(px.slice(2,4), 16), parseInt(px.slice(4,6), 16))
				gdImage.setPixel(x, y, colors[px])
			}
		}

		gdImage.savePng(dest, 0, gd.noop)
		fn(null, dest)
	} catch(err) {
		fn(err)
	}
}

blip.toImage = function(input, width, dest, fn) {
	try {
		if(width <= 0 || width === undefined)
			throw new Error('width must be defined and greater than 0')

		blip._encode(input, function(err, pixels) {
			if(err) throw err

			var height = Math.ceil(pixels.length / width)
			blip._toImage(gd.createTrueColor(width, height), pixels, 0, width - 1, 0, height - 1, dest, fn)
		})
	} catch(err) {
		fn(err)
	}
}

blip.toImageEmbed = function(original, input, x1, x2, y1, y2, dest, fn) {
	try {
		if(x1 < 0 || y1 < 0 || x1 <= x2 || y1 <= y2)
			throw new Error('invalid image coordinates specified')
		blip._encode(input, function(err, pixels) {
			gd.openPng(original, function(err, gdImage) {
				if(err) throw err

				if(x1 > gdImage.width || x2 > gdImage.width || y1 > gdImage.height || y2 > gdImage.height)
					throw new Error('invalid image coordinates specified, not within actual image boundaries')

				blip._toImage(gdImage, pixels, x1, x2, y1, y2, dest, fn)
			})
		})
	} catch(err) {
		fn(err)
	}
}

blip._fromImage = function(gdImage, x1, x2, y1, y2, fn) {
	var px, x, y, r, g, b, data = ''
	for(y = y1; y <= y2; y++) {
		for(x = x1; x <= x2; x++) {
			px = gdImage.getPixel(x, y)
			r = gdImage.red(px).toString(16), g = gdImage.green(px).toString(16), b = gdImage.blue(px).toString(16)
			if(r.length === 1) r = '0' + r
			if(g.length === 1) g = '0' + g
			if(b.length === 1) b = '0' + b
			data += r + g + b
		}
	}

	blip._decode(data, fn)
}

blip.fromImageEmbed = function(image, x1, x2, y1, y2, fn) {
	try {
		if(x1 < 0 || y1 < 0 || x1 <= x2 || y1 <= y2)
			throw new Error('invalid image coordinates specified')
		gd.openPng(image, function(err, gdImage) {
			if(err) throw err
			if(x1 > gdImage.width || x2 > gdImage.width || y1 > gdImage.height || y2 > gdImage.height)
				throw new Error('invalid image coordinates specified, not within actual image boundaries')
			blip._fromImage(gdImage, x1, x2, y1, y2, fn)
		})
	} catch (err) {
		fn(err)
	}
}

blip.fromImage = function(image, fn) {
	try {
		gd.openPng(image, function(err, gdImage) {
			if(err) throw err
			blip._fromImage(gdImage, 0, gdImage.width - 1, 0, gdImage.height - 1, fn)
		})
	} catch(err) {
		fn(err)
	}
}
