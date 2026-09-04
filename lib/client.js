window.__ModuleLoader__.load({
	id: "dsh-creative-plugin",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		'use strict'

		function apply(ctx) {
		  console.log('[dsh-creative-plugin] client loaded')
		}

		exports.apply = apply
		return module.exports
	}
})
