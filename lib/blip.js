var gd = require('node-gd'),
	zlib = require('zlib')
	, fs = require('fs') // temporary

module.exports = blip = {}

blip.encode = function(input, width, fn) {
	if(width <= 0 || width === undefined)
		throw new Error('width must be defined and greater than 0')

	zlib.gzip(new Buffer(input, "utf8"), function(err, res) {
		if(err) {
			fn(err)
			return
		}

		var ln = res.toString('hex').length,
		totalPixels = Math.ceil(ln / 6),
		rows = Math.ceil(totalPixels / width)

		// pixel padding
		if(ln % 6 !== 0) {
			tBuffer = new Buffer(ln % 6)
			tBuffer.fill(' ')
			res = Buffer.concat([res, tBuffer])
		}

		res = res.toString('hex')
		for(var i = 0, row = 0, px = '', ret = []; i < totalPixels; i++) {
			if(ret[row] === undefined) ret[row] = []
			px = res.slice(i * 6, (i+1) * 6)
			if(px == '') px = 'ffffff'
			ret[row].push(px)
			if(row < rows-1 && ret[row].length === width) row++
		}

		i = width - ret[row].length
		while(i > 0)
			ret[row].push('ffffff') && i--

		fn(null, ret)
	})
}

blip.decode = function(data, fn) {
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

blip.toImage = function(input, width, dest) {
	pixels = blip.encode(input, width, function(err, pixels) {
		if(err) {
			throw err
		}
		var image, colors = {}, height = pixels.length
		image = gd.createTrueColor(width, height)

		var x, y, px, i = 1
		for(y = 0; y < height; y++) {
			for(x = 0; x < width; x++) {
				px = pixels[y][x]
				//console.log('px[%s] x: %s y: %s v: %s i:(%s, %s, %s) %s', i++, x, y, px, parseInt(px.slice(0,2), 16), parseInt(px.slice(2,4), 16), parseInt(px.slice(4,6), 16), (colors[px] === undefined) ? '[n]' : '')
				if(colors[px] === undefined) // cache color allocation
					colors[px] = image.colorAllocate(parseInt(px.slice(0,2), 16), parseInt(px.slice(2,4), 16), parseInt(px.slice(4,6), 16))
				image.setPixel(x, y, colors[px])
			}
		}

		//console.log('allocated %s colors across %s pixels (%sw x %sh) within the generated image in total', Object.keys(colors).length, width * height, width, height)
		image.savePng(dest, 0, gd.noop)
	})
}

blip._fromImage = function(gdImage, x1, x2, y1, y2, fn) {
	var px, x, y, r, g, b, data = ''
	//console.log('image is %spx by %spx', rows, cols)
	//var i = 1
	for(y = y1; y < y2; y++) {
		for(x = x1; x < x2; x++) {
			px = gdImage.getPixel(x, y)
			r = gdImage.red(px).toString(16), g = gdImage.green(px).toString(16), b = gdImage.blue(px).toString(16)
			if(r.length === 1) r = '0' + r
			if(g.length === 1) g = '0' + g
			if(b.length === 1) b = '0' + b
			//console.log('px[%s] x: %s y: %s v: %s i:(%s, %s, %s)', i++, x, y, r+g+b, img.red(px), img.green(px), img.blue(px))
			data += r + g + b
		}
	}

	blip.decode(data, fn)
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
			blip._fromImage(gdImage, 0, gdImage.width, 0, gdImage.height, fn)
		})
	} catch(err) {
		fn(err)
	}
}
