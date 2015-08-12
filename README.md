# i18n-express
An ExpressJs middleware to manage templates and URL routing for internalized web applications.

# Installation
Install `i18n-express` from its GitHub repository:

```
npm install github:lucsorel/i18n-express --save
```

# Example
A demo website can be found in the `example/i18n-website` folder.
* install its dependencies (ExpressJS) with the `npm i` command
* run it with `npm start`
* open [localhost:3000](http://localhost:3000) in your browser

This sample website is designed to support the `en` and the `fr` locales (`en` by default). Depending on the preferred locale set in your browser, you will be redirected to either [localhost:3000/en/](http://localhost:3000/en/) or  [localhost:3000/fr/](http://localhost:3000/fr/). You can change the URL manually to test the translation.

The `example/i18n-website/templates` folder contains the html templates and their related internationalization JSON resources files (one per locale).

# Tests
Unit tests can be run with the following Grunt tasks:
* `grunt server-unit-tests`: for fast unit testing without code coverage monitoring
* `grunt server-unit-tests-coverage`: for unit testing with code coverage monitoring

The code coverage reports will be generated in the test/coverage/reports in different formats:
* `coverage.json`
* `lcov/lcov.info`
* `lcov/lcov-report/index.html`
