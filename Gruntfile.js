/* Grunt task runner configuration for development purposes (see http://gruntjs.com/getting-started)
 * To have the grunt command available anywhere in the terminal, run:
 * sudo npm install -g grunt-cli
 */
'use strict';

module.exports = function(grunt) {
	grunt.initConfig({
		// server unit testing configuration (http://stackoverflow.com/questions/21974372/how-to-test-nodejs-application-using-mocha-grunt)
		mochaTest: {
			test: {
				options: {
					reporter: 'spec'
				},
				src: ['test/**/*tests.js']
			}
		},

		// server unit tests coverage (https://www.npmjs.com/package/grunt-istanbul)
		env: {
			// path to instrumented server files
			coverage: {
				APP_DIR_FOR_CODE_COVERAGE: '../coverage/instrument/'
			}
		},
		instrument: {
			files: ['index.js'],
			options: {
				lazy: false,
				basePath: 'test/coverage/instrument/'
			}
		},
		storeCoverage: {
			options: {
				dir: 'test/coverage/reports/'
			}
		},
		makeReport: {
			src: 'test/coverage/reports/**/*.json',
			options: {
				type: 'lcov',
				dir: 'test/coverage/reports/lcov',
				print: 'detail'
			}
		},

		// front unit testing configuration (see https://github.com/karma-runner/grunt-karma)
		karma: {
			// common configuration
			options: {
				configFile: 'test/karma-conf.js'
			},
			// special configuration for unit testing
			unit: {
				// shuts Karma down once the tests are done
				singleRun: true
			}
		}
	});
	// tools for server unit tests
	grunt.loadNpmTasks('grunt-env');
	grunt.loadNpmTasks('grunt-istanbul');
	grunt.loadNpmTasks('grunt-mocha-test');

	// server unit tests
	grunt.registerTask('server-unit-tests', 'mochaTest');
	grunt.registerTask('server-unit-tests-coverage',
			['env:coverage', 'instrument', 'server-unit-tests', 'storeCoverage', 'makeReport']);
};