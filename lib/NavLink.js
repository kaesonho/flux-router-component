/**
 * Copyright 2014, Yahoo! Inc.
 * Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
/*global window */
'use strict';

var React = require('react');
var navigateAction = require('./navigateAction');
var debug = require('debug')('NavLink');
var objectAssign = require('object-assign');
var RouterMixin = require('./RouterMixin');

var NavLink = React.createClass({
    displayName: 'NavLink',
    contextTypes: {
        executeAction: React.PropTypes.func,
        getStore: React.PropTypes.func
    },
    getInitialState: function () {
        var href = this._getHrefFromProps(this.props);
        return {
            href: this._getHrefFromProps(this.props),
            isActive: this._getRouteStore().isActive(href)
        };
    },
    componentWillReceiveProps: function (nextProps) {
        var href = this._getHrefFromProps(nextProps);
        this.setState({
            href: this._getHrefFromProps(nextProps),
            isActive: this._getRouteStore().isActive(href)
        });
    },
    componentDidMount: function () {
        this._getRouteStore().addChangeListener(this._onStoreChange);
    },
    componentWillUnmount: function () {
        this._getRouteStore().removeChangeListener(this._onStoreChange);
    },
    _onStoreChange: function () {
        var isActive = this._getRouteStore().isActive(this.state.href);
        if (this.state.isActive !== isActive) {
            this.setState({
                isActive: isActive
            });
        }
    },
    _getRouteStore: function () {
        var context = this.props.context || this.context;
        if (!context) {
            throw new Error('context not available within NavLink component');
        }
        var routeStore = context.getStore('RouteStore');
        if (!routeStore) {
            throw new Error('RouteStore not registered with dispatcher');
        }
        return routeStore;
    },
    _getHrefFromProps: function (props) {
        var href = props.href;
        var routeName = props.routeName;
        if (!href && routeName) {
            href = this._getRouteStore().makePath(routeName, props.navParams);
        }
        return href;
    },
    dispatchNavAction: function (e) {
        debug('dispatchNavAction: action=NAVIGATE', this.state.href, this.props.navParams);

        var href = this.state.href;

        if (href[0] === '#') {
            // this is a hash link url for page's internal links.
            // Do not trigger navigate action. Let browser handle it natively.
            return;
        }

        if (href[0] !== '/') {
            // this is not a relative url. check for external urls.
            var location = window.location;
            var origin = location.origin || (location.protocol + '//' + location.host);

            if (href.indexOf(origin) !== 0) {
                // this is an external url, do not trigger navigate action.
                // let browser handle it natively.
                return;
            }

            href = href.substring(origin.length) || '/';
        }

        var context = this.props.context || this.context;
        if (context && context.executeAction) {
            e.preventDefault();
            e.stopPropagation();
            context.executeAction(navigateAction, {
                type: 'click',
                url: href,
                params: this.props.navParams
            });
        } else {
            console.warn('NavLink.dispatchNavAction: missing dispatcher, will load from server');
        }
    },
    render: function() {
        return React.createElement(
            'a',
            objectAssign({}, {
                onClick: this.dispatchNavAction
            }, this.props, {
                href: this.state.href,
                className: this.state.isActive ? this.props.activeClass || 'selected' : '',
                style: this.state.isActive ? this.props.activeStyle : undefined
            }),
            this.props.children
        );
    }
});

module.exports = NavLink;
