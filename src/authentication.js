const crypto = require( 'crypto' );
const config = require( './../config.json' );

module.exports = {
    encrypt: ( password ) => {
        return crypto.createHmac( 'sha256', config.secret ).update( password ).digest( 'hex' );
    }
}