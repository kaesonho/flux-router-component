/**
 * Copyright 2014, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
/*globals describe,it,before,beforeEach */
var expect = require('chai').expect;
var routerMixin;
var jsdom = require('jsdom');
var testResult;
var RouteStore = require('../../../lib/RouteStore');

var contextMock = {
    executeAction: function (action, payload) {
        testResult.dispatch = {
            action: action,
            payload: payload
        };
    },
    getStore: function (store) {
        if ('RouteStore' === store) {
            return new (RouteStore.withStaticRoutes({
                foo: { path: '/foo', method: 'GET' },
                fooA: { path: '/foo/:a', method: 'GET' },
                fooAB: { path: '/foo/:a/:b', method: 'GET' }
            }))();
        }
    }
};

var historyMock = function (url, state) {
    return {
        getUrl: function () {
            return url || '/the_path_from_history';
        },
        getState: function () {
            return state;
        },
        on: function (listener) {
            testResult.historyMockOn = listener;
        },
        pushState: function (state, title, url) {
            testResult.pushState = {
                state: state,
                title: title,
                url: url
            };
        },
        replaceState: function (state, title, url) {
            testResult.replaceState = {
                state: state,
                title: title,
                url: url
            };
        }
    };
};

var scrollToMock = function (x, y) {
    testResult.scrollTo = {x: x, y: y};
};

describe ('RouterMixin', function () {

    beforeEach(function () {
        routerMixin = require('../../../lib/RouterMixin');
        routerMixin.props = {context: contextMock};
        routerMixin.state = {
            currentRoute: {}
        };
        global.window = jsdom.jsdom('<html><body></body></html>').defaultView;
        global.document = global.window.document;
        global.navigator = global.window.navigator;
        global.window.scrollTo = scrollToMock;
        testResult = {};
    });

    afterEach(function () {
        delete global.window;
        delete global.document;
        delete global.navigator;
    });

    describe('componentDidMount()', function () {
        it ('listen to popstate event', function () {
            routerMixin.componentDidMount();
            expect(routerMixin._historyListener).to.be.a('function');
            window.dispatchEvent({_type: 'popstate', state: {params: {a: 1}}});
            expect(testResult.dispatch.action).to.be.a('function');
            expect(testResult.dispatch.payload.type).to.equal('popstate');
            expect(testResult.dispatch.payload.url).to.equal(window.location.pathname);
            expect(testResult.dispatch.payload.params).to.eql({a: 1});
        });
        it ('listen to scroll event', function (done) {
            routerMixin.props = {context: contextMock, historyCreator: function() { return historyMock('/foo'); }};
            routerMixin.componentDidMount();
            expect(routerMixin._scrollListener).to.be.a('function');
            window.dispatchEvent({_type: 'scroll'});
            window.dispatchEvent({_type: 'scroll'});
            window.setTimeout(function() {
                expect(testResult.replaceState).to.eql({state: {scroll: {x: 0, y: 0}}, title: undefined, url: undefined});
                done();
            }, 150);
        });
        it ('dispatch navigate event for pages that url does not match', function (done) {
            routerMixin.props = {context: contextMock, checkRouteOnPageLoad: true, historyCreator: function() { return historyMock(); }};
            var origPushState = window.history.pushState;
            routerMixin.state = {
                currentRoute: {
                    url: '/the_path_from_state'
                }
            };
            routerMixin.componentDidMount();
            window.setTimeout(function() {
                expect(testResult.dispatch.action).to.be.a('function');
                expect(testResult.dispatch.payload.type).to.equal('pageload');
                expect(testResult.dispatch.payload.url).to.equal('/the_path_from_history');
                done();
            }, 10);
        });
        it ('does not dispatch navigate event for pages with matching url', function (done) {
            routerMixin.props = {context: contextMock, historyCreator: function() { return historyMock(); }};
            var origPushState = window.history.pushState;
            routerMixin.state = {
                currentRoute: {
                    url: '/the_path_from_history'
                }
            };
            routerMixin.componentDidMount();
            window.setTimeout(function() {
                expect(testResult.dispatch).to.equal(undefined, JSON.stringify(testResult.dispatch));
                done();
            }, 10);
        });
    });

    describe('componentWillUnmount()', function () {
        it ('stop listening to popstate event', function () {
            routerMixin.componentDidMount();
            expect(routerMixin._historyListener).to.be.a('function');
            routerMixin.componentWillUnmount();
            expect(routerMixin._historyListener).to.equal(null);
            window.dispatchEvent({_type: 'popstate', state: {params: {a: 1}}});
            expect(testResult.dispatch).to.equal(undefined);
        });
    });

    describe('componentDidUpdate()', function () {
        it ('no-op on same route', function () {
            var prevRoute = {url: '/foo'},
                newRoute = {url: '/foo'};
            routerMixin.props = {context: contextMock, historyCreator: function() { return historyMock('/foo'); }};
            routerMixin.state = {currentRoute: newRoute};
            routerMixin.componentDidMount();
            routerMixin.componentDidUpdate({}, {currentRoute: prevRoute});
            expect(testResult.pushState).to.equal(undefined);
        });
        it ('do not pushState, navigate.type=popstate', function () {
            var oldRoute = {url: '/foo'},
                newRoute = {url: '/bar', navigate: {type: 'popstate'}};
            routerMixin.props = {context: contextMock, historyCreator: function() { return historyMock('/foo'); }};
            routerMixin.state = {currentRoute: newRoute};
            routerMixin.componentDidMount();
            routerMixin.componentDidUpdate({},  {currentRoute: oldRoute});
            expect(testResult.pushState).to.equal(undefined);
        });
        it ('update with different route, navigate.type=click, reset scroll position', function () {
            var oldRoute = {url: '/foo'},
                newRoute = {url: '/bar', navigate: {type: 'click'}};
            routerMixin.props = {
                context: contextMock,
                historyCreator: function() {
                    return historyMock('/foo');
                }
            };
            routerMixin.state = {currentRoute: newRoute};
            routerMixin.componentDidMount();
            routerMixin.componentDidUpdate({},  {currentRoute: oldRoute});
            expect(testResult.pushState).to.eql({state: {params: {}, scroll: {x: 0, y: 0}}, title: null, url: '/bar'});
            expect(testResult.scrollTo).to.eql({x: 0, y: 0});
        });
        it ('update with different route, navigate.type=click, enableScroll=false, do not reset scroll position', function () {
            var oldRoute = {url: '/foo'},
                newRoute = {url: '/bar', navigate: {type: 'click'}};
            routerMixin.props = {
                context: contextMock,
                enableScroll: false,
                historyCreator: function() {
                    return historyMock('/foo');
                }
            };
            routerMixin.state = {currentRoute: newRoute};
            routerMixin.componentDidMount();
            routerMixin.componentDidUpdate({},  {currentRoute: oldRoute});
            expect(testResult.pushState).to.eql({state: {params: {}}, title: null, url: '/bar'});
            expect(testResult.scrollTo).to.equal(undefined);
        });
        it ('update with different route, navigate.type=default, reset scroll position', function () {
            var oldRoute = {url: '/foo'},
                newRoute = {url: '/bar'};
            routerMixin.props = {
                context: contextMock,
                historyCreator: function() {
                    return historyMock('/foo');
                }
            };
            routerMixin.state = {currentRoute: newRoute};
            routerMixin.componentDidMount();
            routerMixin.componentDidUpdate({},  {currentRoute: oldRoute});
            expect(testResult.pushState).to.eql({state: {params: {}, scroll: {x: 0, y: 0}}, title: null, url: '/bar'});
            expect(testResult.scrollTo).to.eql({x: 0, y: 0});
        });
        it ('update with different route, navigate.type=default, enableScroll=false, do not reset scroll position', function () {
            var oldRoute = {url: '/foo'},
                newRoute = {url: '/bar'};
            routerMixin.props = {
                context: contextMock,
                enableScroll: false,
                historyCreator: function() {
                    return historyMock('/foo');
                }
            };
            routerMixin.state = {currentRoute: newRoute};
            routerMixin.componentDidMount();
            routerMixin.componentDidUpdate({},  {currentRoute: oldRoute});
            expect(testResult.pushState).to.eql({state: {params: {}}, title: null, url: '/bar'});
            expect(testResult.scrollTo).to.equal(undefined);
        });
        it ('do not pushState, navigate.type=popstate, restore scroll position', function () {
            var oldRoute = {url: '/foo'},
                newRoute = {url: '/bar', navigate: {type: 'popstate'}};
            routerMixin.props = {
                context: contextMock,
                historyCreator: function() {
                    return historyMock('/foo', {scroll: {x: 12, y: 200}});
                }
            };
            routerMixin.state = {currentRoute: newRoute};
            routerMixin.componentDidMount();
            routerMixin.componentDidUpdate({}, {currentRoute: oldRoute});
            expect(testResult.pushState).to.equal(undefined);
            expect(testResult.scrollTo).to.eql({x: 12, y: 200});
        });
        it ('do not pushState, navigate.type=popstate, enableScroll=false, restore scroll position', function () {
            var oldRoute = {url: '/foo'},
                newRoute = {url: '/bar', navigate: {type: 'popstate'}};
            routerMixin.props = {
                context: contextMock,
                enableScroll: false,
                historyCreator: function() {
                    return historyMock('/foo', {scroll: {x: 12, y: 200}});
                }
            };
            routerMixin.state = {currentRoute: newRoute};
            routerMixin.componentDidMount();
            routerMixin.componentDidUpdate({}, {currentRoute: oldRoute});
            expect(testResult.pushState).to.equal(undefined);
            expect(testResult.scrollTo).to.eql(undefined);
        });
        it ('update with different route, navigate.type=click, with params', function () {
            var oldRoute = {url: '/foo'},
                newRoute = {url: '/bar', navigate: {type: 'click', params: {foo: 'bar'}}};
            routerMixin.props = {context: contextMock, historyCreator: function() { return historyMock('/foo'); }};
            routerMixin.state = {currentRoute: newRoute};
            routerMixin.componentDidMount();
            routerMixin.componentDidUpdate({},  {currentRoute: oldRoute});
            expect(testResult.pushState).to.eql({state: {params: {foo: 'bar'}, scroll: {x: 0, y:0}}, title: null, url: '/bar'});
        });
        it ('update with same path and different hash, navigate.type=click, with params', function () {
            var oldRoute = {url: '/foo#hash1'},
                newRoute = {url: '/foo#hash2', navigate: {type: 'click', params: {foo: 'bar'}}};
            routerMixin.props = {context: contextMock, historyCreator: function() { return historyMock('/foo#hash1'); }};
            routerMixin.state = {currentRoute: newRoute};
            routerMixin.componentDidMount();
            routerMixin.componentDidUpdate({},  {currentRoute: oldRoute});
            expect(testResult.pushState).to.eql({state: {params: {foo: 'bar'}, scroll: {x: 0, y:0}}, title: null, url: '/foo#hash2'});
        });
    });

});
