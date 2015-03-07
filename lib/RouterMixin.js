/**
 * Copyright 2014, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
/*global window */
'use strict';

var debug = require('debug')('NavLink');
var navigateAction = require('../lib/navigateAction');
var History = require('./History');
var TYPE_CLICK = 'click';
var TYPE_PAGELOAD = 'pageload';
var TYPE_POPSTATE = 'popstate';
var TYPE_DEFAULT = 'default'; // default value if navigation type is missing, for programmatic navigation
var React = require('react');

require('setimmediate');

function routesEqual(route1, route2) {
    route1 = route1 || {};
    route2 = route2 || {};
    return (route1.url === route2.url);
}

function saveScrollPosition(e, history) {
    var historyState = (history.getState && history.getState()) || {};
    historyState.scroll = {x: window.scrollX, y: window.scrollY};
    debug('remember scroll position', historyState.scroll);
    history.replaceState(historyState);
}

var RouterMixin = {
    contextTypes: {
        executeAction: React.PropTypes.func,
        getStore: React.PropTypes.func
    },
    getInitialState: function () {
        return this.getStoreState();
    },

    getStoreState: function () {
        var context = this.props.context || this.context;
        return {
            currentRoute: context.getStore('RouteStore').getCurrentRoute()
        };
    },

    getCurrentRoute: function () {
        return this.state.currentRoute;
    },

    componentDidMount: function() {
        var self = this;
        var context = self.props.context || self.context;

        self._history = ('function' === typeof self.props.historyCreator) ? self.props.historyCreator() : new History();
        self._enableScroll = (self.props.enableScroll !== false);

        if (self.props.checkRouteOnPageLoad) {
            // You probably want to enable checkRouteOnPageLoad, if you use a history implementation
            // that supports hash route:
            //   At page load, for browsers without pushState AND hash is present in the url,
            //   since hash fragment is not sent to the server side, we need to
            //   dispatch navigate action on browser side to load the actual page content
            //   for the route represented by the hash fragment.

            var urlFromHistory = self._history.getUrl();
            var urlFromState = self.state && self.state.currentRoute && self.state.currentRoute.url;

            if (context && (urlFromHistory !== urlFromState)) {
                // put it in setImmediate, because we need the base component to have
                // store listeners attached, before navigateAction is executed.
                debug('pageload navigate to actual route', urlFromHistory, urlFromState);
                setImmediate(function navigateToActualRoute() {
                    context.executeAction(navigateAction, {type: TYPE_PAGELOAD, url: urlFromHistory});
                });
            }
        }

        self._historyListener = function (e) {
            if (context) {
                var url = self._history.getUrl();
                debug('history listener invoked', e, url, self.state.currentRoute.url);
                if (url !== self.state.currentRoute.url) {
                    context.executeAction(navigateAction, {type: TYPE_POPSTATE, url: url, params: (e.state && e.state.params)});
                }
            }
        };
        self._history.on(self._historyListener);

        context.getStore('RouteStore').addChangeListener(this._onStoreChange);

        if (self._enableScroll) {
            var scrollTimer;
            self._scrollListener = function (e) {
                if (scrollTimer) {
                    window.clearTimeout(scrollTimer);
                }
                scrollTimer = window.setTimeout(saveScrollPosition.bind(self, e, self._history), 150);
            };
            window.addEventListener('scroll', self._scrollListener);
        }
    },
    componentWillUnmount: function() {
        var context = this.props.context || this.context;
        this._history.off(this._historyListener);
        this._historyListener = null;
        context.getStore('RouteStore').removeChangeListener(this._onStoreChange);

        if (this._enableScroll) {
            window.removeEventListener('scroll', this._scrollListener);
            this._scrollListener = null;
        }

        this._history = null;
    },
    _onStoreChange: function () {
        this.setState(this.getStoreState());
    },
    componentDidUpdate: function (prevProps, prevState) {
        debug('component did update', prevState, this.state);

        var newState = this.state;
        if (routesEqual(prevState && prevState.currentRoute, newState && newState.currentRoute)) {
            return;
        }

        var nav = newState.currentRoute.navigate;
        var navType = (nav && nav.type) || TYPE_DEFAULT;
        var historyState;

        switch (navType) {
            case TYPE_CLICK:
            case TYPE_DEFAULT:
                historyState = {params: (nav && nav.params) || {}};
                if (this._enableScroll) {
                    window.scrollTo(0, 0);
                    historyState.scroll = {x: 0, y: 0};
                    debug('on click navigation, reset scroll position to (0, 0)');
                }
                this._history.pushState(historyState, null, newState.currentRoute.url);
                break;
            case TYPE_POPSTATE:
                if (this._enableScroll) {
                    historyState = (this._history.getState && this._history.getState()) || {};
                    var scroll = (historyState && historyState.scroll) || {};
                    debug('on popstate navigation, restore scroll position to ', scroll);
                    window.scrollTo(scroll.x || 0, scroll.y || 0);
                }
                break;
        }
    }
};

module.exports = RouterMixin;
