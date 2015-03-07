var React = require('react/addons');
var FluxibleMixin = require('fluxible').FluxibleMixin;
var RouterMixin = require('../../../').RouterMixin;

var MockAppComponent = React.createClass({

    mixins: [FluxibleMixin, RouterMixin],

    render: function () {
        return React.addons.cloneWithProps(this.props.children, {
            context: this.props.context
        });
    }
});

module.exports = MockAppComponent;
