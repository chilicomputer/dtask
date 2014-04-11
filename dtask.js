(function( define ) {

define( function() {

'use strict';

    /**
     * Promise demo
     *
     * @author chillicomputer@gmail.com
     */

    var exports = {};


    /**
     * core
     */

    var Promise = function( resolver ) {

        var me = this;

        var resolveMe = function( feed ) {

            me._resolve( feed );
        };

        var notifyMe = function( feed ) {

            me._notify( feed );
        };

        this._init();
        // call configure, giving a handler to resolve feed
        resolver( resolveMe, notifyMe );
    };

    Promise.prototype = {

        _init: function() {

            this._p        = null;
            this._handlers = [];
        },

        _resolve: function( feed ) {

            // can only resolve once[!important]
            if ( !this._handlers ) return;

            this._p = _constrain( feed );

            var queue = this._handlers;
            var _p    = this._p;

            this._handlers = undefined;

            _nextTick( function() {

                while( queue.length ) {

                    queue.shift()( _p );
                }
            });
        },

        _notify: function( feed ) {

            if ( !this._handlers ) return;

            var _this = this;

            _nextTick( function() {

                var length = _this._handlers.length;

                while( length-- ) {

                    _this._handlers[length]( new ProgressingPromise( feed ) );
                }
            });
        },

        _when: function( resolve, notify, onFulfilled, onProgress ) {

            var _this = this;
            var relay = function( p ) {

                p._when( resolve, notify, onFulfilled, onProgress );
            };

            if ( this._handlers ) {

                this._handlers.push( relay );
            }

            else {

                _nextTick( function() {
                    relay( _this._p );
                });
            }
        },

        then: function( onFulfilled ) {

            var _this = this;

            return promise( function( resolve, notify ) {

                _this._when( resolve, notify, onFulfilled, dumb );
            });
        },

        during: function( onProgress ) {

            var _this = this;

            return promise( function( resolve, notify ) {

                _this._when( resolve, notify, dumb, onProgress );
            });
        },

        done: function( end ) {

            this._when( dumb, dumb, end, dumb );
        }
    };

    var FulledPromise = function( feed ) {

        this._p = feed;
    };

    FulledPromise.prototype = {

        _when : function( resolve, notify, onFulfilled, ignored ) {

            resolve( onFulfilled( this._p ) );
        }
    };

    var ProgressingPromise = function( feed ) {

        this._p = feed;
    };

    ProgressingPromise.prototype = {

        _when: function( resolve, notify, ignored, onProgress ) {

            notify( onProgress( this._p ) );
        }
    };

    /**
     * helpers
     */

    var dumb = function() {};

    var _constrain = function( promiseOrValue ) {

        if ( promiseOrValue instanceof Promise ) {

            return promiseOrValue;
        }

        if ( promiseOrValue instanceof Object && promiseOrValue.then && typeof promiseOrValue.then === 'function' ) {

            return _assimilate( promiseOrValue );
        }

        return new FulledPromise( promiseOrValue );
    };

    var _assimilate = function( x ) {

        return promise( function( resolve, notify ) {

            _nextTick( function() {
                x.then(  resolve, undefined, notify );
            });
        });
    };

    var _cast = function( promiseOrValue ) {

        if ( promiseOrValue instanceof Promise ) {

            return promiseOrValue;
        }

        return resolve( promiseOrValue );
    };

    var _scheduled = [];
    var _mutationObEl;

    var _nextTick = function( funcToScheduled ) {

        if ( _mutationObEl ) {

            _scheduled.push( funcToScheduled ) == 1 && _mutationObEl.setAttribute( 'dumb', 'dumb' );
            return;
        }

        if ( typeof MutationObserver === 'function' ) {

            _mutationObEl = document.createElement( 'div' );

            new MutationObserver( function() {

                try {

                    while ( _scheduled.length ) {

                        _scheduled.shift()();
                    }
                }

                catch ( e ) {

                    _scheduled = [];
                    throw e;
                }

            }).observe( _mutationObEl, { attributes: true } );

            _nextTick( funcToScheduled );

            return;
        }

        setTimeout( funcToScheduled, 0 );
    };


    /**
     * module apis
     */

    var resolve = function( feed ) {

        return promise( function( resolve ) {

            resolve( feed );
        });
    };

    var join = function() {

        return resolve( arguments ).then( function( promiseOrValueArray ) {

            return promise( function( resolveJoinedPromise ) {

                var toBeResolved = promiseOrValueArray.length;

                var i;
                var subPromise;
                var values = [];

                var mkFullfilledCall = function( index ) {

                    return function( value ) {

                        values[index] = value;

                        if ( !--toBeResolved ) {

                            resolveJoinedPromise( values );
                        }
                    }
                };

                if ( !toBeResolved ) {

                    resolveJoinedPromise( values );
                    return;
                }

                for ( i = 0; i < toBeResolved; i++ ) {

                    subPromise = _cast( promiseOrValueArray[i] );
                    subPromise.then( mkFullfilledCall( i ) );
                }
            });
        });
    };

    var reduce = function( promiseOrValueArray, reduceFunc ) {

        return resolve( promiseOrValueArray ).then( function( promiseOrValueArray ) {

            var total = promiseOrValueArray.length;

            return promiseOrValueArray.reduce( function( prev, current, i ) {

                return _cast( prev ).then( function( prevValue ) {

                    return _cast( current ).then( function( currentValue ) {

                        return reduceFunc( prevValue, currentValue, i, total );
                    });
                });
            });
        });
    };

    var any = function( promiseOrValueArray, howmany ) {

        if ( !( promiseOrValueArray instanceof Array ) || !/^\d+$/.test( howmany ) ) {

            throw 'args error';
        }

        return resolve( promiseOrValueArray ).then( function( promiseOrValueArray ) {

            return promise( function( resolveAnyPromise ) {

                var toBeResolved = howmany;
                var taskLength   = promiseOrValueArray.length;

                var i;
                var resolved;

                var subPromise;
                var values = [];

                var mkFullfilledCall = function( index ) {

                    return function( value ) {

                        if ( resolved ) return value;

                        values.push({
                            index: index,
                            value: value
                        });

                        if ( !--toBeResolved ) {

                            resolveAnyPromise( values );
                            resolved = true;
                        }
                    };
                };

                if ( !taskLength || !toBeResolved ) {

                    resolveAnyPromise( values );
                    return;
                }

                for ( i = 0; i < taskLength; i++ ) {

                    subPromise = _cast( promiseOrValueArray[i] );
                    subPromise.then( mkFullfilledCall( i ) );
                }
            });
        });
    };

    var promise = function( resolver ) {

        return new Promise( resolver );
    };

    var defer = function() {

        var defered = {

            promise: undefined,
            resolve: undefined
        };

        var flag_resolved = false;

        defered.promise = promise( function( promiseResolve, promiseNotify ) {

            defered.resolve = function( feed ) {

                if ( flag_resolved ) {

                    return resolve( feed );
                }

                flag_resolved = true;
                promiseResolve( feed );
                return defered.promise;
            };

            defered.notify = function( feed ) {

                promiseNotify( feed );
                return feed;
            }
        });

        return defered;
    };

    exports.defer   = defer;
    exports.promise = promise;
    exports.resolve = resolve;
    exports.join    = join;
    exports.any     = any;
    exports.reduce  = reduce;

    return exports;
});

})( typeof define === 'function' && define.amd ? define : function ( factory ) { if ( self.module && module.exports ) module.exports = factory( require ); else window.dtask = factory(); });;