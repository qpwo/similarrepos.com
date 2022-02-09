"use strict";
exports.__esModule = true;
exports.sql = void 0;
/** Does nothing. Just to trigger syntax highlighting. */
function sql(strings) {
    var _keys = [];
    for (var _i = 1; _i < arguments.length; _i++) {
        _keys[_i - 1] = arguments[_i];
    }
    if (strings.length > 1)
        throw Error('do not interpolate sql strings');
    return strings[0];
}
exports.sql = sql;
