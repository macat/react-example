var Dispatcher, Promise;
Promise = RSVP.Promise;
(function() {
  var Dispatcher = (function() {
    function Dispatcher() {}

    Dispatcher.prototype.stores = {};

    Dispatcher.prototype.handlers = {};

    Dispatcher.prototype.context = {};

    Dispatcher.prototype.storeInstances = {};

    Dispatcher.prototype.currentAction = null;

    Dispatcher.prototype.actionQueue = [];

    Dispatcher.prototype.registerStore = function(store) {
      var storeName;
      storeName = this.getStoreName(store);
      if (!storeName) {
        throw new Error("Store is required to have a `storeName` property.");
      }
      if (this.stores[storeName]) {
        throw new Error("Store `" + storeName + "` is already registered.");
      }
      this.stores[storeName] = store;
      if (store.handlers) {
        Object.keys(store.handlers).forEach((function(_this) {
          return function(action) {
            var handler;
            handler = store.handlers[action];
            return _this.registerHandler(action, storeName, handler);
          };
        })(this));
      }
      return store;
    };

    Dispatcher.prototype.isRegistered = function(store) {
      var storeInstance, storeName;
      storeName = this.getStoreName(store);
      storeInstance = this.stores[storeName];
      if (!storeInstance) {
        return false;
      }
      if ("function" === typeof store) {
        if (store !== storeInstance) {
          return false;
        }
      }
      return true;
    };

    Dispatcher.prototype.getStoreName = function(store) {
      if ("string" === typeof store) {
        return store;
      }
      return store.storeName;
    };

    Dispatcher.prototype.registerHandler = function(action, name, handler) {
      this.handlers[action] = this.handlers[action] || [];
      this.handlers[action].push({
        name: this.getStoreName(name),
        handler: handler
      });
      return this.handlers.length - 1;
    };

    Dispatcher.prototype.getStore = function(name) {
      return this.stores[name];
    };

    Dispatcher.prototype.dispatch = function(actionName, payload, callback) {
      if (!this.handlers[actionName]) {
        callback;
      }
      this.actionQueue.push({
        name: actionName,
        payload: payload,
        callback: callback,
        actionPromise: null,
        handlerPromises: {},
        waiting: {}
      });
      return this.next();
    };

    Dispatcher.prototype.next = function() {
      var actionPromise, nextAction;
      if (this.currentAction) {
        return this.currentAction;
      }
      nextAction = this.actionQueue.shift();
      if (nextAction) {
        this.currentAction = nextAction;
        actionPromise = this.handleAction(nextAction);
        actionPromise.then((function(_this) {
          return function(result) {
            _this.currentAction = null;
            if (nextAction.callback) {
              return nextAction.callback(null, result);
            }
          };
        })(this))["catch"]((function(_this) {
          return function(err) {
            _this.currentAction = null;
            if (nextAction.callback) {
              return nextAction.callback(err);
            }
          };
        })(this));
      }
      return this.currentAction;
    };

    Dispatcher.prototype.handleAction = function(action) {
      var handlerPromises, name, payload;
      name = action.name;
      payload = action.payload;
      handlerPromises = [];
      this.handlers[name].forEach((function(_this) {
        return function(store) {
          var handlerPromise;
          handlerPromise = new Promise(function(resolve, reject) {
            var storeHandlerDone, storeInstance;
            storeInstance = _this.getStore(store.name);
            return storeInstance[store.handler](payload, storeHandlerDone = function(err) {
              if (err) {
                reject(err);
              }
              return resolve();
            });
          });
          handlerPromises.push(handlerPromise);
          return action.handlerPromises[store.name] = handlerPromise;
        };
      })(this));
      return Promise.all(handlerPromises);
    };

    Dispatcher.prototype.waitFor = function(stores, callback) {
      var currentAction, waitHandlers;
      currentAction = this.currentAction;
      waitHandlers = [];
      if (!currentAction) {
        throw new Error("waitFor called even though there is no action being handled!");
      }
      if (!Array.isArray(stores)) {
        stores = [stores];
      }
      stores.forEach((function(_this) {
        return function(store) {
          var actionHandler, storeName;
          storeName = _this.getStoreName(store);
          actionHandler = currentAction.handlerPromises[storeName];
          if (actionHandler) {
            waitHandlers.push(actionHandler);
          }
        };
      })(this));
      return Promise.all(waitHandlers).then(function(result) {
        return callback(null, result);
      })["catch"](function(err) {
        return callback(err);
      });
    };

    return Dispatcher;

  })();
  if (window.Dispatcher == null) {
    window.Dispatcher = new Dispatcher();
  }
})();
