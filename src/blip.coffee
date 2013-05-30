EventEmitter = require('events').EventEmitter
fs = require 'fs'
os = require 'os'
util = require 'util'
zlib = require 'zlib'
domain = require 'domain'
gd = require 'node-gd'

hexNum = (val) ->
	val = val.toString 16
	if val.length is 1 then val = '0' + val
	return val

class encoder extends EventEmitter
	###
 * blip encoder object
 * constructor
 * @param <Object> options - Object of all options to use for the encoder. Some are mandatory
 *   valid options:
 *     <String> destination - path to save the resulting image to. Required.
 *     <Int> mode - Flag (using encoder.modes) to indicate the encode mode to use. Required.
 *     <Object> gzip - Object containing gzip compression options to pass to zlib module. Reference nodejs docs for zlib. Optional.
 *     <Array> regions - Array of region objects to use to embed the image within. Required for EMBED mode, ignored for OVERWRITE mode.
 *     <Int> width - Width of the image to write. Required for OVERWRITE mode, ignored for EMBED mode.
 *     <Object> profileBytes - Object of "profile bytes", to indicate specific bytes to modify in the image; ignored for OVERWRITE mode.
 *     <String> tmpFile - the path to the temporary file used to store gzipped data before writing to the image. defaults to `os.tmpDir() + '/blip_' + process.pid + '.tmp'`.
 *     <String> source - Source file to use when embedding into an existing image. Required for EMBED mode, ignored for OVERWRITE mode.
	###
	constructor: (options) ->
		if !options?
			throw new Error 'no options provided to encoder'
		@gdImage = null
		@dest = options.destination or null
		@mode = options.mode or encoder.modes.OVERWRITE
		# trying to lower memory requirements...provide {} for zlib defaults
		@gzipOptions = options.gzip or { windowBits: 13, memLevel: 6 }
		@profile = encoder.profiles.ERROR

		if @mode is encoder.modes.EMBED
			if !options.regions?
				throw new Error 'no embed regions provided'
			if !options.source?
				throw new Error 'no embed source image provided'
			@source = options.source

			if not options.regions instanceof 'Array'
				@regions = [options.regions]
			else
				@regions = options.regions

			@regionSize = @regions.reduce (total, region) ->
				return total + (region.x2 - region.x1 + 1) * (region.y2 - region.y1 + 1)
			, 0
			@width = @height = null
			@profileBytes = options.profileBytes or {
				R: encoder.bytes.OVERWRITE
				G: encoder.bytes.OVERWRITE
				B: encoder.bytes.OVERWRITE
			}
			@xorByte = false
		else if @mode is encoder.modes.OVERWRITE
			if !options.width? and options.width <= 0
				throw new Error 'width must be defined and greater than 0'
			@source = @regionSize = @height = null
			@regions = []
			@width = options.width
			@profileBytes = {
				R: encoder.bytes.OVERWRITE
				G: encoder.bytes.OVERWRITE
				B: encoder.bytes.OVERWRITE
			}
			@xorByte = false
		else
			throw new Error 'invalid encode mode specified'

		if @profileBytes['R'] is encoder.bytes.PRESERVE
			@xorByte = 'R'
		else if @profileBytes['R'] is encoder.bytes.OVERWRITE
			@profile++
		else if @profileBytes['R'] is encoder.bytes.WRITEXOR
			# set to true for now to indicate we ARE looking for an xor byte
			@xorByte = true

		if @profileBytes['G'] is encoder.bytes.PRESERVE and (@xorByte is true or @xorByte is false)
			# only set xor byte if we don't have one already
			@xorByte = 'G'
		else if @profileBytes['G'] is encoder.bytes.OVERWRITE
			@profile++
		else if @profileBytes['G'] is encoder.bytes.WRITEXOR and (@xorByte isnt true and @xorByte isnt false)
			# set to true for now to indicate we ARE looking for an xor byte. do not overwrite if we already have an xor byte
			@xorByte = true

		if @profileBytes['B'] is encoder.bytes.PRESERVE and (@xorByte is true or @xorByte is false)
			# only set xor byte if we don't have one already
			@xorByte = 'B'
		else if @profileBytes['B'] is encoder.bytes.OVERWRITE
			@profile++
		else if @profileBytes['B'] is encoder.bytes.WRITEXOR and (@xorByte isnt true and @xorByte isnt false)
			# set to true for now to indicate we ARE looking for an xor byte. do not overwrite if we already have an xor byte
			@xorByte = true

		if @xorByte is true
			throw new Error 'using a profileByte set as WRITEXOR, no spare byte left over as PRESERVE to xor against'
		if @profile is encoder.profiles.ERROR
			throw new Error 'no bytes specified for data write in pixels...so, where am I supposed to put the data?'

		@tmpFile = options.tmpFile or os.tmpdir() + '/blip_' + process.pid + '.tmp'

		super()
	###
 * gzip compresses, then encodes given data into hexadecimal, performing necessary padding to ensure well-rounded data (must be .length % 6 == 0)
 * @param $input string - string to convert
 * @param $fn callback - callable function, of format:
 *   fn(err, totalBytes, chunkFn)
 *   $err - null if no error, or Error object if something went wrong
 *   $totalBytes - undefined if error, or integer of total bytes of gzip'd data
 *   $chunkFn - callable function which will return in gz'd data in chunks
 *
 * @access private
	###
	__encode: (input, fn) ->
		d = domain.create()
		d.on 'error', (err) ->
			# abort!
			fn err
		d.run () ->
			gzip = zlib.createGzip @gzipOptions
			if input.readable? is false
				throw new TypeError 'readable stream required for __encode, non-readable stream provided'
			else
				tmpFile = fs.createWriteStream @tmpFile, { encoding: 'utf8' }
				gzip.on 'close', () =>
					# create tmp file...
					tmpFile = fs.createReadStream @tmpFile, { encoding: 'utf8' }
					totalBytes = fs.statSync(@tmpFile).size

					# Returning a special function that will allow us to take a chunk at a time for rendering into each pixel.
					# Hopefully, this should decrease memory use.
					fn null, totalBytes, (chunkSize) =>
						chunk = new Buffer(tmpFile.read(chunkSize or 3), 'utf8').toString('hex')
						tbuffer = null
						if chunk is null then return null
						if chunk.length % 6 isnt 0
							tBuffer = new Buffer chunk.length % 6
							tBuffer.fill ' '
							chunk = Buffer.concat [chunk, tBuffer]
						return chunk
					, tmpFile

				if input.readable?
					input.pipe(gzip).pipe(tmpFile)
				else
					gzip.pipe tmpFile
					gzip.write new Buffer(input, 'utf8')
		return null
	write: (input, fn) ->
		d = domain.create()
		d.on 'error', (err) ->
			# abort!
			fn err
		d.run () ->
			if @mode is encoder.modes.OVERWRITE
				@__encode input, (err, totalBytes, chunkFn, tmpFile) =>
					if err then throw err

					# take totalBytes, div by self.profile (as it contains the usable bytes per pixel).
					pixels = Math.ceil(totalBytes / @profile)
					@height = Math.ceil(pixels / @width)
					@regionSize = @width * @height
					if @regionSize < pixels
						throw new Error 'insuffient region area to store provided data, need #{ pixels } pixels'

					@regions.push({
						x1: 0,
						x2: self.width - 1,
						y1: 0,
						y2: self.height - 1,
					})
					@gdImage = gd.createTrueColor width, height
					fn null, @__write(chunkFn, tmpFile)
					# ^ totally deliberate
			else if @mode is encoder.modes.EMBED
				@__encode input, (err, totalBytes, chunkFn, tmpFile) =>
					if err then throw err

					pixels = Math.ceil(totalBytes / @profile)
					if @regionSize < pixels
						throw new Error 'insuffient region area to store provided data, need #{ pixels } pixels'

					gd.openPng @source, (err, gdImage) =>
						if err then throw err
						@width = gdImage.width
						@height = gdImage.height
						@gdImage = gdImage

						fn null, @__write(chunkFn, tmpFile)
			else
				# this should not be possible. should have been caught farther up in the stack.
				throw new Error 'invalid encode mode specified'
	__write: (chunkFn, tmpFile) ->
		colors = {}
		chunkSize = @profile
		regionFn = (region) =>
			x = y = r = g = b = hex = pixel = i = xor = null
			if region.x1 > @gdImage.width or region.x2 > @gdImage.width or region.y1 > @gdImage.height pr region.y2 > @gdImage.height
				throw new Error 'invalid region coordinates specified, not within actual image boundaries'


			y = region.y1
			while y <= region.y2
				x = region.x1
				while x <= region.x2
					i = 0
					hex = chunkFn chunkSize

					if hex is null
						hex = new Array(chunkSize + 1).join('FF')
					if chunkSize isnt 3
						pixel = @gdImage.getPixel x, y

					if @profileBytes['R'] is encoder.bytes.OVERWRITE
						r = parseInt hex.slice(i, i+2), 16
						i+=2
					else
						r = @gdImage.red pixel
						if @xorByte is 'R' then xor = r
					if @profileBytes['G'] is encoder.bytes.OVERWRITE
						r = parseInt hex.slice(i, i+2), 16
						i+=2
					else
						r = @gdImage.green pixel
						if @xorByte is 'G' then xor = g
					if @profileBytes['B'] is encoder.bytes.OVERWRITE
						r = parseInt hex.slice(i, i+2), 16
						i+=2
					else
						r = @gdImage.blue pixel
						if @xorByte is 'B' then xor = b

					if @profileBytes['R'] is encoder.bytes.WRITEXOR then r = r ^ xor
					if @profileBytes['G'] is encoder.bytes.WRITEXOR then g = g ^ xor
					if @profileBytes['B'] is encoder.bytes.WRITEXOR then b = b ^ xor

					hex = hexNum(r) + hexNum(g) + hexNum(b)

					# cache color allocation
					if !colors[hex]?
						colors[hex] = @gdImage.colorAllocate r, g, b
					@gdImage.setPixel x, y, colors[hex]
					x++
				y++

			regionFn region for region in @regions

			@gdImage.savePng @dest, 0, gd.noop
			fs.unlinkSync @tmpFile

		return dest
	@modes: {
		# overwriting all image data
		OVERWRITE: 1
		# embedding message on top of existing image data (need regions defined for this!)
		EMBED: 2
	}
	@profiles: {
		# error state
		ERROR: 0
		# bury data in one RGB value... (hard to detect)
		NIBBLE: 1
		# bury data in two RGB values...
		BITE: 2
		# fuck it, just overwrite the entire damn pixel (better performance)
		GORGE: 3
	}

class decoder extends EventEmitter
	constructor: (options) ->
		# todo
	__decode: (fn) ->
		#todo
	read: (fn) ->
	__read: (fn) ->

Object.freeze encoder.mode
Object.freeze encoder.profiles
Object.freeze encoder.bytes

module.exports = blip =
	encoder: encoder
	decoder: decoder
