EventEmitter = require('events').EventEmitter
fs = require 'fs'
os = require 'os'
util = require 'util'
zlib = require 'zlib'
gd = require 'node-gd'
blip = {}

class encoder extends EventEmitter
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

		#todo finish



		super()
	modes: {
		# overwriting all image data
		OVERWRITE: 1
		# embedding message on top of existing image data (need regions defined for this!)
		EMBED: 2
	}