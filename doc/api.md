# blip library api

Straight use of blip's api is fairly simple:

No true initialization is required - include and go. Seriously.


	var blip = require('blip')
	blip.toImage('my data goes here', 50, 'test.png', function(err, res) {
		if(err) throw err
		console.log('contents encoded into file "%s" successfully!', res)
	})


## object: blip

 * **blip.toImage(input, width, dest, fn)**
	* *blank-slate write, will take input, given width, then just blind-write an entirely new image to output destination*
	* @param $input string - the input data to encode into the image
	* @param $width integer - the intended width of the resulting image (in pixels)
	* @param $dest string - the file to write the resulting image to
	* @param $fn callback - callable function, of format:
		* **fn(err, dest)**
		* $err - null if no error, or Error object if something went wrong
		* $dest - undefined if error, or string containing the file's destination

 * **blip.toImageEmbed(original, input, x1, x2, y1, y2, dest, fn)**
	* *embed the given pixel data within specified boundaries into the provided image*
	* @param $original string - the name of the image file to use to embed data within
	* @param $input string - the input data to encode into the image
	* @param $x1 integer - the starting x-axis coordinate to write to
	* @param $x2 integer - the ending x-axis coordinate to write to
	* @param $y1 integer - the starting y-axis coordinate to write to
	* @param $y2 integer - the ending y-axis coordinate to write to
	* @param $dest string - the file to write the resulting gdImage to
	* @param $fn callback - callable function, of format:
		* **fn(err, dest)**
		* $err - null if no error, or Error object if something went wrong
		* $dest - undefined if error, or string containing the file's destination

 * **blip.fromImage(image, fn)**
	* *read data out from a complete image*
	* @param $image string - the filename of the image to read
	* @param $fn callback - callable function, of format:
		* **fn(err, res)**
		* $err - null if no error, or Error object if something went wrong
		* $res - undefined if error, or string if decode successful

 * **blip.fromImageEmbed(image, x1, x2, y1, y2, fn)**
	* *read out data from a specified area within an image*
	* @param $image string - the filename of the image to read
	* @param $x1 integer - the starting x-axis coordinate to read from
	* @param $x2 integer - the ending x-axis coordinate to read from
	* @param $y1 integer - the starting y-axis coordinate to read from
	* @param $y2 integer - the ending y-axis coordinate to read from
	* @param $fn callback - callable function, of format:
		* **fn(err, res)**
		* $err - null if no error, or Error object if something went wrong
		* $res - undefined if error, or string if decode successful

 * **blip.imageSize(image, fn)**
	* *get specified image's dimensions (for determining maximum pixel area we have to work with)*
	* @param $image string - the filename of the image to check
	* @param $fn callback - callable function, of format:
		* **fn(err, width, height)**
		* $err - null if no error, or Error object if something went wrong
		* $width - undefined if error, or integer representing image width in pixels
		* $height - undefined if error, or integer representing image height in pixels

* **blip.dataSize(data, fn)**
	* *get the size of the given data in pixels (post gzip compression) for measuring how much pixel area the data will require*
	* @param $data string - the data to obtain the size of
	* @param $fn callback - callable function, of format:
		* **fn(err, size)**
		* $err - null if no error, or Error object if something went wrong
		* $size - undefined if error, or integer representing the data's required size, in pixels