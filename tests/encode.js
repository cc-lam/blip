var assert = require('assert'),
	blip = require('../lib/blip')

describe('blip encode', function() {
	// asdf
	it('constructor error checking', function() {
		assert.throws(new blip.encoder({}), Error, 'should throw on no options')
	})
})