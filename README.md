blip
====

A subtle, slender library for burying data within PNG images.

## license

MIT license

## usage

Current usage of the API is fairly straightforward.

``` js

var blip = require('blip'),
	fs = require('fs')

// writing data to an image...
blip.toImage(fs.readFileSync('input.txt'), 30, 'test.png', function(err) {
	// no choice for now, have to do this as png
	if(err) throw err
)}

// reading data from an image
blip.fromImage('test.png', function(err, res) {
	if(err) throw err

	console.log(res)
	// ^ do something with decoded data here!
})
```

## todo

* command-line binary
* ability to embed data overtop a defined area within an existing image
* reading data from a specific area within an image (when provided box coordinates of embedded data)
