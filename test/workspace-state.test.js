const bootstrap = require('./test-bootstrap.js');
const {assert} = require('chai');
const fs = require('fs-extra');

describe('Workspace state test', function() {
  describe('Stores requests state', function() {
    const workspaceFilePath = 'test/test-workspace.json';
    const opts = {
      args: [
        '--workspace-file',
        workspaceFilePath
      ]
    };

    this.timeout(15000);
    before(function() {
      return bootstrap.runAppDeffered(10000, opts)
      .then((app) => {
        this.app = app;
      });
    });

    after(function() {
      let p;
      if (this.app && this.app.isRunning()) {
        p = this.app.stop();
      } else {
        p = Promise.resolve();
      }
      return p.then(() => fs.remove(workspaceFilePath));
    });

    it('Stores single request data', function() {
      // There's already a tab opened in a window.
      // const context = this;
      return this.app.electron.remote.app.
      testsInterface('update-request-object', {
        url: 'https://test-url.com',
        method: 'TEST',
        headers: 'x-test: value'
      })
      .then(function() {
        return new Promise(function(resolve) {
          // State store has debouncer set to 100ms
          setTimeout(function() {
            // context.app.client.getRenderProcessLogs().then(function(logs) {
            //   console.log('LOG DUMP');
            //   logs.forEach(function(log) {
            //     console.log(log.message);
            //     console.log(log.source);
            //     console.log(log.level);
            //   });
            // });
            resolve(fs.readJson(workspaceFilePath));
          }, 500);
        });
      })
      .then(function(content) {
        assert.typeOf(content.requests, 'array', 'Requests is an array');
        assert.lengthOf(content.requests, 1,
         'Requests contains single item');
        assert.equal(content.requests[0].url, 'https://test-url.com', 'Contains passed data');
      });
    });

    it('Stores request data', function() {
      return this.app.electron.remote.app.
      testsInterface('update-request-object', {
        url: 'https://test-url.com',
        method: 'TEST',
        headers: 'x-test: value'
      })
      .then(() => this.app.electron.remote.app.testsInterface('create-new-tab'))
      .then(() => this.app.electron.remote.app.
      testsInterface('update-request-object', {
        url: 'https://second.com',
        method: 'TEST2',
        headers: 'x-test: two'
      }))
      .then(function() {
        return new Promise(function(resolve) {
          setTimeout(function() {
            resolve(fs.readJson(workspaceFilePath));
          }, 250);
        });
      })
      .then(function(content) {
        assert.lengthOf(content.requests, 2, 'Requests contains single item');
        assert.equal(content.requests[1].url, 'https://second.com', 'Contains passed data');
      });
    });

    it('Updates data on not focused tab', function() {
      return this.app.electron.remote.app.
      testsInterface('update-request-object', {
        url: 'https://third.com',
        method: 'TEST2',
        headers: 'x-test: two'
      }, 0)
      .then(function() {
        return new Promise(function(resolve) {
          setTimeout(function() {
            resolve(fs.readJson(workspaceFilePath));
          }, 250);
        });
      })
      .then(function(content) {
        assert.lengthOf(content.requests, 2, 'Requests contains two item');
        assert.equal(content.requests[0].url, 'https://third.com', 'Updates correct tab');
      });
    });
  });

  describe('Restores requests state', function() {
    this.timeout(10000);

    const workspaceFilePath = 'test/restore.workspace.json';
    const opts = {
      args: [
        '--workspace-file',
        workspaceFilePath
      ]
    };
    before(function() {
      return bootstrap.runAppDeffered(4000, opts)
      .then((app) => {
        this.app = app;
      });
    });

    after(function() {
      if (this.app && this.app.isRunning()) {
        return this.app.stop();
      }
    });

    it('Opens all requests from the workspace', function() {
      // There's no way to get and information from a function call that is
      // async (with promise) so the test just checks if the
      // `restore.rorkspace.json` content changed.
      return fs.readJson(workspaceFilePath)
      .then((data) => {
        let urls = [
          'https://one.com',
          'https://two.com',
          'https://three.com',
          'https://test.com',
          'https://mulesoft.com',
          'https://advancedrestclient.com'
        ];
        data.requests.forEach((r, i) => {
          assert.equal(r.url, urls[i]);
        });
      });
    });
  });
});
