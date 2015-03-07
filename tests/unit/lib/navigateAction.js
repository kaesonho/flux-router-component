/**
 * Copyright 2014, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
/*globals describe,it,before,beforeEach */
var expect = require('chai').expect;
var navigateAction = require('../../../lib/navigateAction');
var MockActionContext = require('fluxible/utils/MockActionContext')();
var RouteStore = require('../../../lib/RouteStore');

describe('navigateAction', function () {
    var mockContext;
    var routes = {
        home: {
            method: 'get',
            path: '/'
        },
        action: {
            method: 'get',
            path: '/action',
            action: function () {}
        },
        fail: {
            method: 'get',
            path: '/fail',
            action: function () {}
        },
        string: {
            method: 'get',
            path: '/string',
            action: 'foo'
        },
        post: {
            method: 'post',
            path: '/post',
            action: function () {}
        }
    };

    beforeEach(function () {
        mockContext = new MockActionContext();
        mockContext.Dispatcher.registerStore(RouteStore);
        mockContext.dispatcher.dispatch('RECEIVE_ROUTES', routes);
        mockContext.getAction = function (actionName, foo) {
            if ('foo' === actionName) {
                return function () {};
            }
        };
    });

    it ('should dispatch on route match', function () {
        navigateAction(mockContext, {
            url: '/'
        }, function (err) {
            expect(err).to.equal(undefined);
            expect(mockContext.dispatchCalls.length).to.equal(2);
            expect(mockContext.dispatchCalls[0].name).to.equal('NAVIGATE_START');
            expect(mockContext.dispatchCalls[0].payload.url).to.equal('/');
            expect(mockContext.dispatchCalls[1].name).to.equal('NAVIGATE_SUCCESS');
            expect(mockContext.dispatchCalls[1].payload.url).to.equal('/');
        });
    });

    it ('should include query param on route match', function () {
        var url = '/?foo=bar&a=b&a=c&bool#abcd=fff';
        navigateAction(mockContext, {
            url: url
        }, function (err) {
            expect(err).to.equal(undefined);
            expect(mockContext.dispatchCalls.length).to.equal(2);
            expect(mockContext.dispatchCalls[0].name).to.equal('NAVIGATE_START');
            var route = mockContext.getStore('RouteStore').getCurrentRoute();
            expect(route.toJS().query).to.eql({foo: 'bar', a: ['b', 'c'], bool: null}, 'query added to route payload for NAVIGATE_START' + JSON.stringify(route));
            expect(mockContext.dispatchCalls[1].name).to.equal('NAVIGATE_SUCCESS');
            route = mockContext.dispatchCalls[1].payload;
            expect(route.url).to.equal(url);
        });
    });

    it ('should not call execute action if there is no action', function () {
        navigateAction(mockContext, {
            url: '/'
        }, function () {
            expect(mockContext.executeActionCalls.length).to.equal(0);
        });
    });

    it ('should call execute action if there is an action', function () {
        navigateAction(mockContext, {
            url: '/action'
        }, function (err) {
            expect(err).to.equal(undefined);
            expect(mockContext.dispatchCalls.length).to.equal(2);
            expect(mockContext.dispatchCalls[1].name).to.equal('NAVIGATE_SUCCESS');
            expect(mockContext.dispatchCalls[1].payload.url).to.equal('/action');
            expect(mockContext.executeActionCalls.length).to.equal(1);
            expect(mockContext.executeActionCalls[0][0]).to.equal(routes.action.action);
            expect(mockContext.executeActionCalls[0][1].url).to.equal('/action');
            expect(mockContext.executeActionCalls[0][2]).to.be.a('function');
        });
    });

    it ('should call execute action if there is an action as a string', function () {
        navigateAction(mockContext, {
            url: '/string'
        }, function (err) {
            expect(err).to.equal(undefined);
            expect(mockContext.dispatchCalls.length).to.equal(2);
            expect(mockContext.dispatchCalls[1].name).to.equal('NAVIGATE_SUCCESS');
            expect(mockContext.dispatchCalls[1].payload.url).to.equal('/string');
            expect(mockContext.executeActionCalls.length).to.equal(1);
            expect(mockContext.executeActionCalls[0].action).to.equal(fooAction);
            expect(mockContext.executeActionCalls[0].payload.url).to.equal('/string');
        });
    });

    it ('should dispatch failure if action failed', function () {
        navigateAction(mockContext, {
            url: '/fail'
        }, function (err) {
            expect(err).to.be.an('object');
            expect(mockContext.dispatchCalls.length).to.equal(2);
            expect(mockContext.dispatchCalls[1].name).to.equal('NAVIGATE_FAILURE');
            expect(mockContext.dispatchCalls[1].payload.url).to.equal('/fail');
        });
    });

    it ('should call back with a 404 error if route not found', function () {
        navigateAction(mockContext, {
            url: '/404'
        }, function (err) {
            expect(err).to.be.an('object');
            expect(err.status).to.equal(404);
        });
    });

    it ('should call back with a 404 error if url matches but not method', function () {
        navigateAction(mockContext, {
            url: '/post',
            method: 'get'
        }, function (err) {
            expect(err).to.be.an('object');
            expect(err.status).to.equal(404);
        });
    });

    it ('should dispatch if both url and method matches', function () {
        navigateAction(mockContext, {
            url: '/post',
            method: 'post'
        }, function (err) {
            expect(err).to.equal(undefined);
            expect(mockContext.dispatchCalls.length).to.equal(2);
            expect(mockContext.dispatchCalls[0].name).to.equal('NAVIGATE_START');
            expect(mockContext.dispatchCalls[0].payload.url).to.equal('/post');
            expect(mockContext.dispatchCalls[1].name).to.equal('NAVIGATE_SUCCESS');
            expect(mockContext.dispatchCalls[1].payload.url).to.equal('/post');
        });
    });
});
