/**
 * Copyright 2014, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
/*globals describe,it,before,beforeEach */
var React;
var NavLink;
var ReactTestUtils;
var jsdom = require('jsdom');
var expect = require('chai').expect;
var contextMock;
var onClickMock;
var testResult;
var MockAppComponent;
var RouteStore = require('../../../lib/RouteStore');

onClickMock = function () {
    testResult.onClickMockInvoked = true;
};

contextMock = {
    executeAction: function (action, payload) {
        testResult.dispatch = {
            action: 'NAVIGATE',
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

describe('NavLink', function () {

    beforeEach(function () {
        global.window = jsdom.jsdom('<html><body></body></html>').defaultView;
        global.document = global.window.document;
        global.navigator = global.window.navigator;
        React = require('react/addons');
        ReactTestUtils = React.addons.TestUtils;
        MockAppComponent = React.createFactory(require('../mock/MockAppComponent'));
        NavLink = React.createFactory(require('../../../lib/NavLink'));
        testResult = {};
    });

    afterEach(function () {
        delete global.window;
        delete global.document;
        delete global.navigator;
    });

    describe('render()', function () {
        it('should set href correctly', function () {
            var link = ReactTestUtils.renderIntoDocument(
                MockAppComponent({ context: contextMock },
                    NavLink({ href: '/foo' }, React.DOM.span(null, 'bar'))
                ),
                React.DOM.span(null, 'bar')
            );
            expect(link.getDOMNode().getAttribute('href')).to.equal('/foo');
            expect(link.getDOMNode().textContent).to.equal('bar');
        });
        it('should prefer href over routeName', function () {
            var link = ReactTestUtils.renderIntoDocument(
                MockAppComponent({ context: contextMock },
                    NavLink({ routeName: 'fooo', href: '/foo' }, React.DOM.span(null, 'bar'))
                )
            );
            expect(link.getDOMNode().getAttribute('href')).to.equal('/foo');
        });
        it('should create href from routeName and parameters', function () {
            var navParams = {a: 1, b: 2};
            var link = ReactTestUtils.renderIntoDocument(
                MockAppComponent({ context: contextMock },
                    NavLink({ routeName: 'fooAB', navParams: navParams })
                ),
                React.DOM.span(null, 'bar')
            );
            expect(link.getDOMNode().getAttribute('href')).to.equal('/foo/1/2');
        });
        it('should have href if href or routeName undefined', function () {
            var navParams = {a: 1, b: 2};
            var link = ReactTestUtils.renderIntoDocument(
                MockAppComponent({ context: contextMock },
                    NavLink({ navParams: navParams }, React.DOM.span(null, 'bar'))
                )
            );
            expect(link.getDOMNode().getAttribute('href')).to.equal(null);
        });
    });

    describe('dispatchNavAction()', function () {
        it('context.executeAction called for relative urls', function (done) {
            var navParams = {a: 1, b: true};
            var link = ReactTestUtils.renderIntoDocument(
                MockAppComponent({ context: contextMock },
                    NavLink({ href: '/foo', navParams: navParams }, React.DOM.span(null, 'bar'))
                )
            );
            ReactTestUtils.Simulate.click(link.getDOMNode());
            window.setTimeout(function () {
                expect(testResult.dispatch.action).to.equal('NAVIGATE');
                expect(testResult.dispatch.payload.type).to.equal('click');
                expect(testResult.dispatch.payload.url).to.equal('/foo');
                expect(testResult.dispatch.payload.params).to.eql({a: 1, b: true});
                done();
            }, 10);
        });
        it('context.executeAction called for absolute urls from same origin', function (done) {
            var navParams = {a: 1, b: true};
            var origin = window.location.origin;
            var link = ReactTestUtils.renderIntoDocument(
                MockAppComponent({ context: contextMock },
                    NavLink({ href: origin + '/foo?x=y', navParams: navParams }, React.DOM.span(null, 'bar'))
                )
            );
            ReactTestUtils.Simulate.click(link.getDOMNode());
            window.setTimeout(function () {
                expect(testResult.dispatch.action).to.equal('NAVIGATE');
                expect(testResult.dispatch.payload.type).to.equal('click');
                expect(testResult.dispatch.payload.url).to.equal('/foo?x=y');
                expect(testResult.dispatch.payload.params).to.eql({a: 1, b: true});
                done();
            }, 10);
        });
        it('context.executeAction not called for external urls', function (done) {
            var link = ReactTestUtils.renderIntoDocument(
                MockAppComponent({ context: contextMock },
                    NavLink({ href: 'http://domain.does.not.exist/foo' }, React.DOM.span(null, 'bar'))
                )
            );
            ReactTestUtils.Simulate.click(link.getDOMNode());
            window.setTimeout(function () {
                expect(testResult.dispatch).to.equal(undefined);
                done();
            }, 10);
        });
        it('context.executeAction not called for # urls', function (done) {
            var link = ReactTestUtils.renderIntoDocument(
                MockAppComponent({ context: contextMock },
                    NavLink({ href: '#here' }, React.DOM.span(null, 'bar'))
                )
            );
            ReactTestUtils.Simulate.click(link.getDOMNode());
            window.setTimeout(function () {
                expect(testResult.dispatch).to.equal(undefined);
                done();
            }, 10);
        });
    });

    it('allow overriding onClick', function (done) {
        var link = ReactTestUtils.renderIntoDocument(
            MockAppComponent({ context: contextMock },
                NavLink({ href: '#here', onClick: onClickMock }, React.DOM.span(null, 'bar'))
            )
        );
        expect(testResult.onClickMockInvoked).to.equal(undefined);
        ReactTestUtils.Simulate.click(link.getDOMNode());
        window.setTimeout(function () {
            expect(testResult.dispatch).to.equal(undefined);
            expect(testResult.onClickMockInvoked).to.equal(true);
            done();
        }, 10);
    });
});
