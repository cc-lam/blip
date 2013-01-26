#!/usr/bin/env node

var blip = require('./../lib/blip'),
	pkg = require('./../package.json'),
	app = require('commander')

function list(val) {
	return val.split(',')
}

app
	.version('blip ' + pkg.version)

app
	.command('read [file]')
	.description('retrieves data from an image (both as embedded data or as a whole image)')
	.option('-o, --out <file>', 'where to store data retrieved from [file]')
	.option('-p, --points <list>', 'list of four points to use for reading embedded data, formatted as follows: x1,x2,y1,y2', list)
	.action(function(file, options) {
		// asdf
	})

app
	.command('embed [file]')
	.description('embeds given data within an already existing image')
	.option('-f, --file <file>', 'embed the specified file\'s contents into [file] (cannot be used with --string)')
	.option('-s, --string', 'prompt for the data to embed into [file] (cannot be used with --file)')
	.option('-o, --out <outfile>', 'do not overwrite original image, write modified image to <outfile> instead')
	.option('-p, --points <list>', 'list of four points to use for reading embedded data, formatted as follows: x1,x2,y1,y2', list)
	.action(function(file, options) {
		if(options.file && options.string)
			throw new Error('cannot use --file and --string flags simultaneously')
	})
	.on('--help', function() {
		console.log('  (note: --points x1,x2,x3,x4 is required for embed, along with either --file or --string for input)')
	})

app
	.command('write [file]')
	.description('writes given data into a new image, ignoring prior contents')
	.option('-f, --file <file>', 'embed the specified file\'s contents into [file] (cannot be used with --string)')
	.option('-s, --string', 'prompt for the data to embed into [file] (cannot be used with --file)')
	.option('-w, --width <size>', 'blah')
	.option('-p, --points <list>', 'list of four points to use for reading embedded data, formatted as follows: x1,x2,y1,y2', list)
	.action(function(file, options) {
		if(options.file && options.string)
			throw new Error('cannot use --file and --string flags simultaneously')

		if(!options.file && !options.string)
			throw new Error('either --file <file> or --string flag must be provided for input')

		function blipWrite(input) {
			// asdf
		}

		if(options.string) {
			app.prompt('data to write: \n> ', blipWrite)
		} else {
			blipWrite(fs.readFileSync(options.file))
		}
	})
	.on('--help', function() {
		console.log('  (note: either --points x1,x2,x3,x4 or --width must be specified for size, along with either --file or --string for input)')
	})

app
	.command('dim [file]')
	.description('retrieve the number of pixels present within [file]')

app
	.command('filepx [file]')
	.description('determine the number of pixels required to store data within [file]')

app
	.command('strpx')
	.description('prompt for a string and determine the number of pixels required to store its contents')

app.parse(process.argv)
