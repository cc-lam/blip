var blip = require('./../lib/blip'),
	fs = require('fs'),
	crypto = require('crypto')

var testText = fs.readFileSync('input.txt')
var testString = 'This is a test string, to be embedded within a small lossless avatar image'

blip.toImage(testText, 30, 'test.png', function(err) {
	// no choice for now, have to do this as png
	if(err) throw err

	console.log('original full image data md5sum: %s', crypto.createHash('md5').update(testText).digest('hex'))
})
blip.fromImage('test.png', function(err, res) {
	if(err) throw err
	console.log('extracted full image data md5sum: %s', crypto.createHash('md5').update(res).digest('hex'))
})


// embedded image data tests
blip.dataSize(testString, function(err, res) {
	if(err) throw err
	console.log('embedded data payload will occupy %s pixels of space', res)
})

blip.toImageEmbed('embed_test_clean.png', testString, 0, 27, 349, 349, 'embed_test.png', function(err, res) {
	if(err) throw err
	console.log('embedded data payload written, md5sum: %s', crypto.createHash('md5').update(testString).digest('hex'))
})

blip.fromImageEmbed('embed_test.png', 0, 27, 349, 349, function(err, res) {
	if(err) throw err
	console.log('embedded data payload read, md5sum: %s', crypto.createHash('md5').update(res).digest('hex'))
	console.log('embedded data payload reads: "%s"', res)
})
