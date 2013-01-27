var gd = require('node-gd'),
	zlib = require('zlib')

module.exports = blip = {}

/**
 * gzip compresses, then encodes given data into hexadecimal, performing necessary padding to ensure well-rounded data (must be .length % 6 == 0)
 * @param $input string - string to convert
 * @param $fn callback - callable function, of format:
 *   fn(err, res)
 *   $err - null if no error, or Error object if something went wrong
 *   $res - undefined if error, or a new Array of strings (length of six chars each)
 *
 * @access private
 *
 * @todo refactor so $input can be a Readable Stream
 */
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

/**
 * trims extra padding, then splits, gzip decompresses and normalizes pixel chunks
 * @param $data string - hexadecimal blob of data extracted from blip-encoded image
 * @param $fn callback - callable function, of format:
 *   fn(err, res)
 *   $err - null if no error, or Error object if something went wrong
 *   $res - undefined if error, or string if decode successful
 *
 * @access private
 */
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

/**
 * get specified image's dimensions (for determining maximum pixel area we have to work with)
 * @param $image string - the filename of the image to check
 * @param $fn callback - callable function, of format:
 *   fn(err, width, height)
 *   $err - null if no error, or Error object if something went wrong
 *   $width - undefined if error, or integer representing image width in pixels
 *   $height - undefined if error, or integer representing image height in pixels
 */
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

/**
 * get the size of the given data in pixels (after gzip compression et al) for measuring how much pixel area the data will require
 * @param $data string - the data to obtain the size of
 * @param $fn callback - callable function, of format:
 *   fn(err, size)
 *   $err - null if no error, or Error object if something went wrong
 *   $size - undefined if error, or integer representing the data's required size, in pixels
 */
blip.dataSize = function(data, fn) {
	try {
		blip._encode(data, function(err, pixels) {
			if(err) throw err
			fn(null, pixels.length)
		})
	} catch(err) {
		fn(err)
	}
}

/**
 * store the given pixel data within specified boundaries in the provided image
 * @param $gdImage gdimage - the node-gd gdimage object to write data onto
 * @param $pixels array - the array of pixel data to write
 * @param $x1 integer - the starting x-axis coordinate to write to
 * @param $x2 integer - the ending x-axis coordinate to write to
 * @param $y1 integer - the starting y-axis coordinate to write to
 * @param $y2 integer - the ending y-axis coordinate to write to
 * @param $dest string - the file to write the resulting gdImage to
 * @param $fn callback - callable function, of format:
 *   fn(err, dest)
 *   $err - null if no error, or Error object if something went wrong
 *   $dest - undefined if error, or string containing the file's destination
 *
 * @access private
 *
 * @note - this function is intended to write pixel data in typical LTR fashion,
 *           left to write, then top to bottom.
 */
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

/**
 * Blank-slate write, will take input, given width, then just blind-write an entirely new image to output destination
 * @param $input string - the input data to encode into the image
 * @param $width integer - the intended width of the resulting image (in pixels)
 * @param $dest string - the file to write the resulting image to
 * @param $fn callback - callable function, of format:
 *   fn(err, dest)
 *   $err - null if no error, or Error object if something went wrong
 *   $dest - undefined if error, or string containing the file's destination
 *
 * @todo refactor so $input can be a Readable Stream
 */
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

/**
 * embed the given pixel data within specified boundaries into the provided image
 * @param $original string - the name of the image file to use to embed data within
 * @param $input string - the input data to encode into the image
 * @param $x1 integer - the starting x-axis coordinate to write to
 * @param $x2 integer - the ending x-axis coordinate to write to
 * @param $y1 integer - the starting y-axis coordinate to write to
 * @param $y2 integer - the ending y-axis coordinate to write to
 * @param $dest string - the file to write the resulting gdImage to
 * @param $fn callback - callable function, of format:
 *   fn(err, dest)
 *   $err - null if no error, or Error object if something went wrong
 *   $dest - undefined if error, or string containing the file's destination
 *
 * @note - this function is intended to write pixel data in typical LTR fashion,
 *           left to write, then top to bottom.
 */
blip.toImageEmbed = function(original, input, x1, x2, y1, y2, dest, fn) {
	try {
		if(x1 < 0 || y1 < 0 || x1 > x2 || y1 > y2)
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

/**
 * read out the raw pixel information from the given image and turn it into a straightforward hexadecimal string
 * @param $gdImage gdimage - the node-gd gdimage object to read data from
 * @param $x1 integer - the starting x-axis coordinate to read from
 * @param $x2 integer - the ending x-axis coordinate to read from
 * @param $y1 integer - the starting y-axis coordinate to read from
 * @param $y2 integer - the ending y-axis coordinate to read from
 * @param $fn callback - callable function, of format:
 *   fn(err, res)
 *   $err - null if no error, or Error object if something went wrong
 *   $res - undefined if error, or string if decode successful
 *
 * @access private
 */
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

/**
 * read data out from a complete image
 * @param $image string - the filename of the image to read
 * @param $fn callback - callable function, of format:
 *   fn(err, res)
 *   $err - null if no error, or Error object if something went wrong
 *   $res - undefined if error, or string if decode successful
 */
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

/**
 * read out data from a specified area within an image
 * @param $image string - the filename of the image to read
 * @param $x1 integer - the starting x-axis coordinate to read from
 * @param $x2 integer - the ending x-axis coordinate to read from
 * @param $y1 integer - the starting y-axis coordinate to read from
 * @param $y2 integer - the ending y-axis coordinate to read from
 * @param $fn callback - callable function, of format:
 *   fn(err, res)
 *   $err - null if no error, or Error object if something went wrong
 *   $res - undefined if error, or string if decode successful
 */
blip.fromImageEmbed = function(image, x1, x2, y1, y2, fn) {
	try {
		if(x1 < 0 || y1 < 0 || x1 > x2 || y1 > y2)
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
