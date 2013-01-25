var blip = require('./../lib/blip'),
	fs = require('fs')

blip.toImage(fs.readFileSync('input.txt'), 30, 'test.png', function(err) {
	// no choice for now, have to do this as png
	if(err) throw err
)}
blip.fromImage('test.png', function(err, res) {
	if(err) throw err

	console.log(res)
	// ^ do something with decoded data here!
})

