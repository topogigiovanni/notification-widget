((document, window) => {

	'use strict';

	window.DCG = window.DCG || {}
	DCG.notification = DCG.notification || {
		q: []
	}

	const debug = !!DCG.debug;

	let Deferred;
	let sha1 = {}
	let ajax = {}
	let state = {}
	let sessionData = {}

	const noop = () => {}
	const _actions = {
		create: (platform, user) => {
			if (state.created) {
				console.error('"create" action already executed');
				return false;
			}

			log('create', platform, user)

			sessionData = {
				platform,
				user
			};

			return true;
		},
		getService: (name = 'api') => {
			if (typeof name !== 'string') {
				console.error('Must be a string');
				return;
			}

			if (!_services[name] || !_services[name]._public) {
				return;
			}

			return _services[name];
		},
		getSha: () => sha1
	}

	// ** Services
	const _services = {
		api: {
			_public: true,
			_requestCache: [],
			_buildUrl: function(url) {
				let host = debug ? 'http://localhost:8000/' : 'http://localhost:8000/';
				return host + url;
			},
			_buildRequest: function(name, data) {
				var self = this;
				if (self._requestCache[name]) {
					log('from cache');
					return self._requestCache[name];
				}

				data.complete = () => {
					self._requestCache[name] = null;
				}
				data.url = self._buildUrl(data.url)
				data.dataType = 'json';

				let _data = data.data || {};

				// data.data = {
				// 	data: sha1(JSON.stringify(_data))
				// }

				data.data = `d=${sha1(JSON.stringify(_data))}`

				log('data', data)

				var req = self._requestCache[name] = ajax(data);

				return req;
				/*
					.then((r) => {
						self._requestCache[name] = null;
						return r;
					})
					.catch((er) => {
						self._requestCache[name] = null;
						return er;
					});*/
			},
			getNotifications: function() {
				let self = this;
				// return ajax({
				// 		url: self._buildUrl('api/posts/published'),
				// 		success: (r) => {
				// 			console.log('r success', r);
				// 		}
				// 	})
				// 	.then((r) => {
				// 		console.log('r then', r);
				// 	});
				return this._buildRequest('getNotifications', {
					url: 'api/widget/data'
				});
			},
			_register: function() {

			}
		},
		resolver: {
			_public: false,
			_resolvePreRegistered: function() {

				var self = this;
				var notification = DCG.notification;

				if (notification &&
					notification.q &&
					Array.isArray(notification.q) &&
					notification.q.length
				) {

					notification.q.forEach((event) => {
						self.handle(event);
					})

				}

			},
			_bindAction: function(eventName, data) {

				log('bindAction', arguments);

				if (!_actions[eventName]) return;

				return _actions[eventName].apply(_actions, data);

			},
			handle: function(bag) {

				var command;
				var args;

				if (bag && typeof bag === 'string') {

					command = bag;
					args = Array.prototype.slice.call(arguments, 1);

					return _services.resolver._bindAction(command, args);

				} else if (bag && typeof bag === 'object' && bag.length) {

					return this.handle.apply(this, bag);

				} else {

					console.error(`Invalid parameter, the first parameter of DCG.notification('string', ... args) method must be a string.`);

					return;

				}

			},
			_register: function() {

				this._resolvePreRegistered();
				DCG.notification = this.handle;

			}
		},
		assetLoader: {
			_public: false,
			loadScript: function(src) {
				var s = 'script';
				var script = document.createElement(s);
				var parent = document.getElementsByTagName(s)[0];
				script.async = true;
				script.src = src;

				return parent.parentNode.insertBefore(script, parent);
			},
			loadWidget: function(href) {
				var link = document.createElement('link');
				var parent = document.getElementsByTagName('body')[0];
				link.rel = 'import';
				link.href = href;

				return parent.parentNode.insertBefore(link, parent);
			},
			_register: async function() {
				// await this.loadWidget(_buildUrl('src/my-app.html'));
				await this.loadWidget(_buildUrl('src/widgets.html'));
				await this.loadScript(_buildUrl('bower_components/webcomponentsjs/webcomponents-loader.js'));
			}
		}
	};
	// **

	function log() {
		if (!debug) return;

		console.log.apply(console, arguments)
	}

	function _buildUrl(url) {
		let host = debug ? 'http://localhost:3001/' : 'http://localhost:3001/';

		return host + url;
	}

	function _polyfills() {

		// addEventListener
		(function(root) {

			if (!root.addEventListener && root.attachEvent) {

				root.addEventListener = function(event, callback) {
					return root.attachEvent(event, callback);
				};

			}

		}(window));

		// Array.forEach
		(function(root) {

			if (!Array.prototype.forEach) {

				Array.prototype.forEach = function(callback, thisArg) {

					var T,
						k;

					if (this === null) {
						throw new TypeError('this is null or not defined');
					}

					var O = Object(this),
						len = O.length >>> 0;

					if (typeof callback !== 'function') {
						throw new TypeError(callback + ' is not a function');
					}

					if (arguments.length > 1) {
						T = thisArg;
					}

					k = 0;

					while (k < len) {

						var kValue;

						if (k in O) {

							kValue = O[k];

							callback.call(T, kValue, k, O);
						}

						k++;

					}

				};

			}

		}(window));

		// Array.isArray()
		(function(root) {

			if (!Array.isArray) {

				Array.isArray = function(arg) {
					return Object.prototype.toString.call(arg) === '[object Array]';
				};

			}

		}(window));

	}

	function _registerSha1() {
		function hex(val) {
			if (val >>> 0 !== val) {
				return "  ";
			}
			if (val < 0x10) {
				return "0" + val.toString(16);
			}
			return val.toString(16);
		}

		function ensureArray(buffer) {
			if (buffer instanceof Uint8Array) {
				return buffer;
			}
			if (buffer instanceof ArrayBuffer || Array.isArray(buffer)) {
				return new Uint8Array(buffer);
			}
			if (buffer.buffer instanceof ArrayBuffer) {
				return new Uint8Array(buffer.buffer);
			}
			throw new TypeError("Invalid buffer type " + buffer);
		}
		//https://github.com/hookflash/obsolete.cifre/blob/master/sha1.js
		(
			(function(m) {
				let _sha1 = m()

				_sha1.tohex = function tohex(array) {
					var string = "";
					array = ensureArray(array);
					for (var i = 0, l = array.length; i < l; i++) {
						string += hex(array[i]);
					}
					return string;
				}

				_sha1.stringToArray = function stringToArray(string) {
					// UTF-8 encode the string using one character per byte
					string = unescape(encodeURIComponent(string));
					var length = string.length;
					var arr = new Array(length);
					for (var i = 0; i < length; i++) {
						arr[i] = string.charCodeAt(i);
					}
					return arr;
				}

				sha1 = (input) => {
					return _sha1.tohex(_sha1(_sha1.stringToArray(input)));
				}
			})
		)(function() {
			"use strict";

			var state = new Uint32Array(5);
			var bstate = new Uint8Array(state.buffer);

			// Create a buffer for each 80 word block.
			var block = new Uint32Array(80);

			function common(a, e, w, k, f) {
				return (f + e + w + k + ((a << 5) | (a >>> 27))) >>> 0;
			}

			function f1(a, b, c, d, e, w) {
				return common(a, e, w, 0x5A827999, d ^ (b & (c ^ d)));
			}

			function f2(a, b, c, d, e, w) {
				return common(a, e, w, 0x6ED9EBA1, b ^ c ^ d);
			}

			function f3(a, b, c, d, e, w) {
				return common(a, e, w, 0x8F1BBCDC, (b & c) | (d & (b | c)));
			}

			function f4(a, b, c, d, e, w) {
				return common(a, e, w, 0xCA62C1D6, b ^ c ^ d);
			}

			// function hex8(num) {
			//   var hex = num.toString(16).toUpperCase();
			//   return "00000000".substr(hex.length) + hex;
			// }

			function cycle(state, block) {
				var a = state[0],
					b = state[1],
					c = state[2],
					d = state[3],
					e = state[4];

				var fn = f1;
				for (var i = 0; i < 80; i += 5) {
					if (i === 20) {
						fn = f2;
					} else if (i === 40) {
						fn = f3;
					} else if (i === 60) {
						fn = f4;
					}
					e = fn(a, b, c, d, e, block[i]);
					b = ((b << 30) | (b >>> 2)) >>> 0;
					// console.log("t=%s: %s  %s  %s  %s  %s", i,
					//   hex8(e), hex8(a), hex8(b), hex8(c), hex8(d));
					d = fn(e, a, b, c, d, block[i + 1]);
					a = ((a << 30) | (a >>> 2)) >>> 0;
					// console.log("t=%s: %s  %s  %s  %s  %s", i + 1,
					//   hex8(d), hex8(e), hex8(a), hex8(b), hex8(c));
					c = fn(d, e, a, b, c, block[i + 2]);
					e = ((e << 30) | (e >>> 2)) >>> 0;
					// console.log("t=%s: %s  %s  %s  %s  %s", i + 2,
					//   hex8(c), hex8(d), hex8(e), hex8(a), hex8(b));
					b = fn(c, d, e, a, b, block[i + 3]);
					d = ((d << 30) | (d >>> 2)) >>> 0;
					// console.log("t=%s: %s  %s  %s  %s  %s", i + 3,
					//   hex8(b), hex8(c), hex8(d), hex8(e), hex8(a));
					a = fn(b, c, d, e, a, block[i + 4]);
					c = ((c << 30) | (c >>> 2)) >>> 0;
					// console.log("t=%s: %s  %s  %s  %s  %s", i + 4,
					//   hex8(a), hex8(b), hex8(c), hex8(d), hex8(e));
				}

				// console.log();
				// process.stdout.write("H[0] = " + hex8(state[0]) + " + " + hex8(a));
				state[0] += a;
				// console.log(" = " + hex8(state[0]));
				// process.stdout.write("H[1] = " + hex8(state[1]) + " + " + hex8(b));
				state[1] += b;
				// console.log(" = " + hex8(state[1]));
				// process.stdout.write("H[2] = " + hex8(state[2]) + " + " + hex8(c));
				state[2] += c;
				// console.log(" = " + hex8(state[2]));
				// process.stdout.write("H[3] = " + hex8(state[3]) + " + " + hex8(d));
				state[3] += d;
				// console.log(" = " + hex8(state[3]));
				// process.stdout.write("H[4] = " + hex8(state[4]) + " + " + hex8(e));
				state[4] += e;
				// console.log(" = " + hex8(state[4]));

			}

			// input is a Uint8Array bitstream of the data
			function sha1(input) {

				var inputLength = input.length;

				// Pad the input string length.
				var length = inputLength + 9;
				if (length % 64) {
					length += 64 - (length % 64);
				}

				state[0] = 0x67452301;
				state[1] = 0xefcdab89;
				state[2] = 0x98badcfe;
				state[3] = 0x10325476;
				state[4] = 0xc3d2e1f0;

				for (var offset = 0; offset < length; offset += 64) {

					// Copy input to block and write padding as needed
					for (var i = 0; i < 64; i++) {
						var b = 0,
							o = offset + i;
						if (o < inputLength) {
							b = input[o];
						} else if (o === inputLength) {
							b = 0x80;
						} else {
							// Write original bit length as a 64bit big-endian integer to the end.
							var x = length - o - 1;
							if (x >= 0 && x < 4) {
								b = (inputLength << 3 >>> (x * 8)) & 0xff;
							}
						}

						// Interpret the input bytes as big-endian per the spec
						if (i % 4 === 0) {
							block[i >> 2] = b << 24;
						} else {
							block[i >> 2] |= b << ((3 - (i % 4)) * 8);
						}
					}

					// Extend the block
					for (var i = 16; i < 80; i++) {
						var w = block[i - 3] ^ block[i - 8] ^ block[i - 14] ^ block[i - 16];
						block[i] = (w << 1) | (w >>> 31);
					}

					cycle(state, block);

				}

				// Swap the bytes around since they are big endian internally
				return [
					bstate[3], bstate[2], bstate[1], bstate[0],
					bstate[7], bstate[6], bstate[5], bstate[4],
					bstate[11], bstate[10], bstate[9], bstate[8],
					bstate[15], bstate[14], bstate[13], bstate[12],
					bstate[19], bstate[18], bstate[17], bstate[16],
				]
			}

			return sha1;
		});
	}

	function _registerDeferred() {
		function _Deferred() {
			// update 062115 for typeof
			if (typeof(Promise) != 'undefined' && Promise.defer) {
				//need import of Promise.jsm for example: Cu.import('resource:/gree/modules/Promise.jsm');
				return Promise.defer();
			} else if (typeof(PromiseUtils) != 'undefined' && PromiseUtils.defer) {
				//need import of PromiseUtils.jsm for example: Cu.import('resource:/gree/modules/PromiseUtils.jsm');
				return PromiseUtils.defer();
			} else {
				/* A method to resolve the associated Promise with the value passed.
				 * If the promise is already settled it does nothing.
				 *
				 * @param {anything} value : This value is used to resolve the promise
				 * If the value is a Promise then the associated promise assumes the state
				 * of Promise passed as value.
				 */
				this.resolve = null;

				/* A method to reject the assocaited Promise with the value passed.
				 * If the promise is already settled it does nothing.
				 *
				 * @param {anything} reason: The reason for the rejection of the Promise.
				 * Generally its an Error object. If however a Promise is passed, then the Promise
				 * itself will be the reason for rejection no matter the state of the Promise.
				 */
				this.reject = null;

				/* A newly created Promise object.
				 * Initially in pending state.
				 */
				this.promise = new Promise(function(resolve, reject) {
					this.resolve = resolve;
					this.reject = reject;
				}.bind(this));
				Object.freeze(this);
			}
		}

		Deferred = _Deferred;
	}

	function _registerAjax() {
		const type = (ob) => typeof obj;

		var jsonpID = 0,
			key,
			name,
			rscript = /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
			scriptTypeRE = /^(?:text|application)\/javascript/i,
			xmlTypeRE = /^(?:text|application)\/xml/i,
			jsonType = 'application/json',
			htmlType = 'text/html',
			blankRE = /^\s*$/

		ajax = function(options) {
			var settings = extend({}, options || {})
			for (key in ajax.settings) {
				if (settings[key] === undefined) settings[key] = ajax.settings[key]
			}

			ajaxStart(settings)

			if (!settings.crossDomain) settings.crossDomain = /^([\w-]+:)?\/\/([^\/]+)/.test(settings.url) &&
				RegExp.$2 != window.location.host

			var dataType = settings.dataType,
				hasPlaceholder = /=\?/.test(settings.url)
			if (dataType == 'jsonp' || hasPlaceholder) {
				if (!hasPlaceholder) settings.url = appendQuery(settings.url, 'callback=?')
				return ajax.JSONP(settings)
			}

			if (!settings.url) settings.url = window.location.toString()
			serializeData(settings)

			settings.deferred = new Deferred();

			var mime = settings.accepts[dataType],
				baseHeaders = {},
				protocol = /^([\w-]+:)\/\//.test(settings.url) ? RegExp.$1 : window.location.protocol,
				xhr = ajax.settings.xhr(),
				abortTimeout

			if (!settings.crossDomain) baseHeaders['X-Requested-With'] = 'XMLHttpRequest'
			if (mime) {
				baseHeaders['Accept'] = mime
				if (mime.indexOf(',') > -1) mime = mime.split(',', 2)[0]
				xhr.overrideMimeType && xhr.overrideMimeType(mime)
			}
			if (settings.contentType || (settings.data && settings.type.toUpperCase() != 'GET'))
				baseHeaders['Content-Type'] = (settings.contentType || 'application/x-www-form-urlencoded')
			settings.headers = extend(baseHeaders, settings.headers || {})

			xhr.onreadystatechange = function() {
				if (xhr.readyState == 4) {
					clearTimeout(abortTimeout)
					var result, error = false
					if ((xhr.status >= 200 && xhr.status < 300) || xhr.status == 304 || (xhr.status == 0 && protocol == 'file:')) {
						dataType = dataType || mimeToDataType(xhr.getResponseHeader('content-type'))
						result = xhr.responseText

						try {
							if (dataType == 'script')(1, eval)(result)
							else if (dataType == 'xml') result = xhr.responseXML
							else if (dataType == 'json') result = blankRE.test(result) ? null : JSON.parse(result)
						} catch (e) {
							error = e
						}

						if (error) ajaxError(error, 'parsererror', xhr, settings)
						else ajaxSuccess(result, xhr, settings)
					} else {
						ajaxError(null, 'error', xhr, settings)
					}
				}
			}

			var async = 'async' in settings ? settings.async : true
			xhr.open(settings.type, settings.url, async)

			for (name in settings.headers) xhr.setRequestHeader(name, settings.headers[name])

			if (ajaxBeforeSend(xhr, settings) === false) {
				xhr.abort()
				return false
			}

			if (settings.timeout > 0) abortTimeout = setTimeout(function() {
				xhr.onreadystatechange = empty
				xhr.abort()
				ajaxError(null, 'timeout', xhr, settings)
			}, settings.timeout)

			// avoid sending empty string (#319)
			xhr.send(settings.data ? settings.data : null)
			// return xhr
			return settings.deferred.promise;
		}

		// trigger a custom event and return false if it was cancelled
		function triggerAndReturn(context, eventName, data) {
			//todo: Fire off some events
			//var event = $.Event(eventName)
			//$(context).trigger(event, data)
			return true; //!event.defaultPrevented
		}

		// trigger an Ajax "global" event
		function triggerGlobal(settings, context, eventName, data) {
			if (settings.global) return triggerAndReturn(context || document, eventName, data)
		}

		// Number of active Ajax requests
		ajax.active = 0

		function ajaxStart(settings) {
			if (settings.global && ajax.active++ === 0) triggerGlobal(settings, null, 'ajaxStart')
		}

		function ajaxStop(settings) {
			if (settings.global && !(--ajax.active)) triggerGlobal(settings, null, 'ajaxStop')
		}

		// triggers an extra global event "ajaxBeforeSend" that's like "ajaxSend" but cancelable
		function ajaxBeforeSend(xhr, settings) {
			var context = settings.context
			if (settings.beforeSend.call(context, xhr, settings) === false ||
				triggerGlobal(settings, context, 'ajaxBeforeSend', [xhr, settings]) === false)
				return false

			triggerGlobal(settings, context, 'ajaxSend', [xhr, settings])
		}

		function ajaxSuccess(data, xhr, settings) {
			var context = settings.context,
				status = 'success'
			settings.success.call(context, data, status, xhr)
			settings.deferred.resolve(data)
			triggerGlobal(settings, context, 'ajaxSuccess', [xhr, settings, data])
			ajaxComplete(status, xhr, settings)
		}
		// type: "timeout", "error", "abort", "parsererror"
		function ajaxError(error, type, xhr, settings) {
			var context = settings.context
			settings.error.call(context, xhr, type, error || {})
			settings.deferred.reject(error || {})
			triggerGlobal(settings, context, 'ajaxError', [xhr, settings, error])
			ajaxComplete(type, xhr, settings)
		}
		// status: "success", "notmodified", "error", "timeout", "abort", "parsererror"
		function ajaxComplete(status, xhr, settings) {
			var context = settings.context
			settings.complete.call(context, xhr, status)
			triggerGlobal(settings, context, 'ajaxComplete', [xhr, settings])
			ajaxStop(settings)
		}

		// Empty function, used as default callback
		function empty() {}

		ajax.JSONP = function(options) {
			if (!('type' in options)) return ajax(options)

			settings.deferred = new Deferred();

			var callbackName = 'jsonp' + (++jsonpID),
				script = document.createElement('script'),
				abort = function() {
					//todo: remove script
					//$(script).remove()
					if (callbackName in window) window[callbackName] = empty
					ajaxComplete('abort', xhr, options)
				},
				xhr = {
					abort: abort
				},
				abortTimeout,
				head = document.getElementsByTagName("head")[0] ||
				document.documentElement

			if (options.error) script.onerror = function() {
				xhr.abort()
				options.error()
			}

			window[callbackName] = function(data) {
				clearTimeout(abortTimeout)
				//todo: remove script
				//$(script).remove()
				delete window[callbackName]
				ajaxSuccess(data, xhr, options)
			}

			serializeData(options)
			script.src = options.url.replace(/=\?/, '=' + callbackName)

			// Use insertBefore instead of appendChild to circumvent an IE6 bug.
			// This arises when a base node is used (see jQuery bugs #2709 and #4378).
			head.insertBefore(script, head.firstChild);

			if (options.timeout > 0) abortTimeout = setTimeout(function() {
				xhr.abort()
				settings.deferred.reject({})
				ajaxComplete('timeout', xhr, options)
			}, options.timeout)

			// return xhr
			return settings.deferred.promise;
		}

		ajax.settings = {
			// Default type of request
			type: 'GET',
			// Callback that is executed before request
			beforeSend: empty,
			// Callback that is executed if the request succeeds
			success: empty,
			// Callback that is executed the the server drops error
			error: empty,
			// Callback that is executed on request complete (both: error and success)
			complete: empty,
			// The context for the callbacks
			context: null,
			// Whether to trigger "global" Ajax events
			global: true,
			// Transport
			xhr: function() {
				return new window.XMLHttpRequest()
			},
			// MIME types mapping
			accepts: {
				script: 'text/javascript, application/javascript',
				json: jsonType,
				xml: 'application/xml, text/xml',
				html: htmlType,
				text: 'text/plain'
			},
			// Whether the request is to another domain
			crossDomain: false,
			// Default timeout
			timeout: 0
		}

		function mimeToDataType(mime) {
			return mime && (mime == htmlType ? 'html' :
				mime == jsonType ? 'json' :
				scriptTypeRE.test(mime) ? 'script' :
				xmlTypeRE.test(mime) && 'xml') || 'text'
		}

		function appendQuery(url, query) {
			return (url + '&' + query).replace(/[&?]{1,2}/, '?')
		}

		// serialize payload and append it to the URL for GET requests
		function serializeData(options) {
			if (type(options.data) === 'object') options.data = param(options.data)
			if (options.data && (!options.type || options.type.toUpperCase() == 'GET'))
				options.url = appendQuery(options.url, options.data)
		}

		ajax.get = function(url, success) {
			return ajax({
				url: url,
				success: success
			})
		}

		ajax.post = function(url, data, success, dataType) {
			if (type(data) === 'function') dataType = dataType || success, success = data, data = null
			return ajax({
				type: 'POST',
				url: url,
				data: data,
				success: success,
				dataType: dataType
			})
		}

		ajax.getJSON = function(url, success) {
			return ajax({
				url: url,
				success: success,
				dataType: 'json'
			})
		}

		var escape = encodeURIComponent

		function serialize(params, obj, traditional, scope) {
			var array = type(obj) === 'array';
			for (var key in obj) {
				var value = obj[key];

				if (scope) key = traditional ? scope : scope + '[' + (array ? '' : key) + ']'
				// handle data in serializeArray() format
				if (!scope && array) params.add(value.name, value.value)
				// recurse into nested objects
				else if (traditional ? (type(value) === 'array') : (type(value) === 'object'))
					serialize(params, value, traditional, key)
				else params.add(key, value)
			}
		}

		function param(obj, traditional) {
			var params = []
			params.add = function(k, v) {
				this.push(escape(k) + '=' + escape(v))
			}
			serialize(params, obj, traditional)
			return params.join('&').replace('%20', '+')
		}

		function extend(target) {
			var slice = Array.prototype.slice;
			slice.call(arguments, 1).forEach(function(source) {
				for (key in source)
					if (source[key] !== undefined)
						target[key] = source[key]
			})
			return target
		}
	}

	function _registerServices() {
		let servicesName = Object.keys(_services);

		servicesName.forEach((name) => {
			_services[name] && _services[name]._register();
		})
	}

	function _registerPolymer() {
		window.Polymer = window.Polymer || {
			rootPath: '/'
		}
	}

	function __construct() {
		_registerPolymer()
		_polyfills()
		_registerSha1()
		_registerDeferred()
		_registerAjax()
		_registerServices()
	}

	__construct()

})(document, window)
