((document, window) => {

	'use strict';

	window.DCG = window.DCG || {};
	DCG.notification = DCG.notification || {
		q: []
	};

	const debug = DCG.debug;

	const noop = () => {};

	let state = {};

	var _actions = {
		create: (platform, user) => {

			if (state.created) {
				console.error('"create" action already executed');
				return false;
			}

			log('create', platform, user)
		}
	}

	let _uniqueIdCounter = 1;

	let apiService = {
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

			_actions[eventName].apply(_actions, data);

		},
		handle: function(bag) {

			var command;
			var args;

			if (bag && typeof bag === 'string') {

				command = bag;
				args = Array.prototype.slice.call(arguments, 1);

				apiService._bindAction(command, args);

				return true;

			} else if (bag && typeof bag === 'object' && bag.length) {

				return this.handle.apply(this, bag);

			} else {

				console.error(`Invalid parameter, the first parameter of DCG.notification('string', ... args) method must be a string.`);

				return;

			}

		},
		register: function() {

			this._resolvePreRegistered();
			DCG.notification = this.handle;

		}
	};

	let assetLoader = {
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
		register: async function() {
			// await this.loadWidget(_buildUrl('src/my-app.html'));
			await this.loadWidget(_buildUrl('src/dcg-notification-summary.html'));
			await this.loadScript(_buildUrl('bower_components/webcomponentsjs/webcomponents-loader.js'));
		}
	}

	// ** Classes
	function DispatcherMessage(data) {

		this.data = data;
		this.id = jsel.id;

	}
	// **

	function log() {

		if (!debug) return;

		console.log.apply(console, arguments)

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

	function _uniqueId() {

		var d = new Date(),
			m = d.getMilliseconds() + "",
			u = ++d + m + (++_uniqueIdCounter === 10000 ? (_uniqueIdCounter = 1) : _uniqueIdCounter);

		return u;

	}

	function _encode(object) {
		return window.btoa(JSON.stringify(object));
	}

	function _buildUrl(url) {

		//var base = 'https://collect.jsel.info/';
		var base = 'http://127.0.0.1:8000/';

		if (debug) {
			base = 'http://127.0.0.1:8000/';
		}

		return base + url;

	}

	function _dispatch(url, data, timestamp, mustNotRetry) {

		data = new DispatcherMessage(data);

		if (jsel.settings.sendType && jsel.settings.sendType === 'ajax') {

			var xhr = new XMLHttpRequest();

			xhr.open('POST', url);
			xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
			xhr.send('data=' + _encode(data));

		} else {

			var sufix = !timestamp ? '' : '?_' + _uniqueId();
			var image = new Image();

			if (!mustNotRetry) {
				image.onerror = function() {
					_dispatch(url, data, timestamp, true);
				};
			}

			image.src = url + '/' + _encode(data) + sufix;

		}

	}

	function __construct() {

		_polyfills();

		//_applySettings();

		// 1 - Custom Events
		apiService.register();
		// 2 - Inject widget assets
		assetLoader.register();
	}

	__construct()

})(document, window)