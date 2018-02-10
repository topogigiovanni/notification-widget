((document, window) => {

	'use strict';

	window.DCG = window.DCG || {}
	DCG.notification = DCG.notification || {
		q: []
	}

	const debug = !!DCG.debug

	let Deferred;
	let ajax = {}
	let state = {}
	let sessionData = {}

	const noop = () => {}
	const _actions = {
		create: (platform, user) => {
			if (state.created) {
				console.error('"create" action already executed')
				return false
			}

			state.created = true

			log('create', platform, user)

			sessionData = {
				platform,
				user
			}

			return true
		},
		getService: (name = 'api') => {
			if (typeof name !== 'string') {
				console.error('Must be a string');
				return;
			}

			if (!_services[name] || !_services[name].isPublic()) {
				return;
			}

			return _services[name];
		}
	}

	const _baseService = (context, isPublic) => {
		context.isPublic = () => {
			return isPublic
		}

		context._register = () => {}

		return context
	}
	const _services = {
		api: (function() {
			let props = {}
			let isPublic = true

			const api = {
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
					data.headers = data.headers || {};
					data.headers['X-DCG-Notify-Trusted'] = 'true';

					let _data = data.data || sessionData;

					if (_data) {
						data.data = `d=${_encode(_data)}`
					}

					var req = self._requestCache[name] = ajax(data);

					return req;
				}
			};

			// public
			props = _baseService(props, isPublic)

			props.getNotifications = function getNotifications() {
				return api._buildRequest('getNotifications', {
					url: 'api/widget/data'
				});
			}

			return props
		})(),
		resolver: (function() {
			let props = {}
			let isPublic = false

			const resolver = {
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

						command = bag
						args = Array.prototype.slice.call(arguments, 1)

						return resolver._bindAction(command, args)

					} else if (bag && typeof bag === 'object' && bag.length) {

						return resolver.handle.apply(this, bag)

					} else {

						console.error(`Invalid parameter, the first parameter of DCG.notification('string', ... args) method must be a string.`);

						return;

					}
				}

			}

			// public
			props = _baseService(props, isPublic)

			props._register = function _register() {
				resolver._resolvePreRegistered()
				DCG.notification = resolver.handle
			}

			return props
		})(),
		assetLoader: (function() {
			let props = {}
			let isPublic = false

			// public
			props = _baseService(props, isPublic)

			props.loadScript = function loadScript(src) {
				var s = 'script';
				var script = document.createElement(s);
				var parent = document.getElementsByTagName(s)[0];
				script.async = true;
				script.src = src;

				return parent.parentNode.insertBefore(script, parent);
			}

			props.loadWidget = function loadWidget(href) {
				var link = document.createElement('link');
				var parent = document.getElementsByTagName('body')[0];
				link.rel = 'import';
				link.href = href;

				return parent.parentNode.insertBefore(link, parent);
			}

			props._register = function _register() {
				// await this.loadWidget(_buildUrl('src/my-app.html'));
				props.loadWidget(_buildUrl('src/widgets.html'));
				props.loadScript(_buildUrl('bower_components/webcomponentsjs/webcomponents-loader.js'));
			}

			return props
		})()
	}

	function log() {
		if (!debug) return;

		console.log.apply(console, arguments)
	}

	function _encode(object) {
		return encodeURIComponent(window.btoa(JSON.stringify(object)))
	}

	function _buildUrl(url) {
		let host = debug ? 'http://localhost:3001/' : 'http://localhost:3001/';

		return host + url;
	}

	function _polyfills() {
		// console
		(function(root) {
			if (!root.console) {
				root.console = {};
			}
			var con = root.console;
			var prop, method;
			var dummy = function() {};
			var properties = ['memory'];
			var methods = ('assert,clear,count,debug,dir,dirxml,error,exception,group,' +
				'groupCollapsed,groupEnd,info,log,markTimeline,profile,profiles,profileEnd,' +
				'show,table,time,timeEnd,timeline,timelineEnd,timeStamp,trace,warn').split(',');
			while (prop = properties.pop())
				if (!con[prop]) con[prop] = {};
			while (method = methods.pop())
				if (!con[method]) con[method] = dummy;
		})(window);

		// btoa
		(function(root) {

			if (!root.btoa) {

				var b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=',
					b64re = /^(?:[A-Za-z\d+\/]{4})*?(?:[A-Za-z\d+\/]{2}(?:==)?|[A-Za-z\d+\/]{3}=?)?$/;

				root.btoa = function(string) {

					string = String(string);

					var bitmap,
						a,
						b,
						c,
						result = '',
						i = 0,
						rest = string.length % 3; // To determine the final padding

					for (; i < string.length;) {

						if (
							(a = string.charCodeAt(i++)) > 255 ||
							(b = string.charCodeAt(i++)) > 255 ||
							(c = string.charCodeAt(i++)) > 255
						) {

							throw new TypeError('Failed to execute "btoa" on "Window": The string to be encoded contains characters outside of the Latin1 range.');

						}

						bitmap = (a << 16) | (b << 8) | c;

						result += b64.charAt(bitmap >> 18 & 63) + b64.charAt(bitmap >> 12 & 63) + b64.charAt(bitmap >> 6 & 63) + b64.charAt(bitmap & 63);

					}

					return rest ? result.slice(0, rest - 3) + '==='.substring(rest) : result;

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
		_registerDeferred()
		_registerAjax()
		_registerServices()
	}

	__construct()

})(document, window)